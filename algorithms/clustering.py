from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType, FloatType
from pyspark.ml.feature import VectorAssembler, StandardScaler
from pyspark.ml.clustering import KMeans
from pyspark.ml.evaluation import ClusteringEvaluator
from pyspark.ml import Pipeline

class KMeansSegmentation:
    def __init__(self, spark, input_path):
        """
        Khởi tạo mô hình, đọc dữ liệu và tự động làm sạch.
        """
        self.spark = spark
        
        print(f"--- Đọc dữ liệu từ {input_path}... ---")
        raw_df = self.spark.read.parquet(input_path)
        
        # 1. TỰ ĐỘNG LÀM SẠCH DỮ LIỆU NGAY KHI KHỞI TẠO
        self.df = self._auto_clean(raw_df)
        
        self.model = None
        self.df_scaled = None

    def _auto_clean(self, df):
        """
        Hàm nội bộ: Tự động xóa Null và xử lý các lỗi có thể làm sập KMeans.
        """
        print("--- [Auto-Clean] Đang dọn dẹp dữ liệu để tránh lỗi K-Means... ---")
        
        # A. Xóa toàn bộ dòng chứa Null để an toàn cho VectorAssembler
        clean_df = df.dropna()
        
        # B. Đảm bảo các cột RFM không chứa số <= 0 (để tránh lỗi log(0))
        # Nếu <= 0, ép về 1
        cols_to_check = ['recency_days', 'total_orders', 'total_spend', 'avg_order_value']
        
        for col in cols_to_check:
            if col in clean_df.columns:
                clean_df = clean_df.withColumn(
                    col, 
                    F.when(F.col(col) <= 0, F.lit(1)).otherwise(F.col(col))
                )
        
        # C. Ngắt phả hệ (Checkpoint) để chống lỗi StackOverflow/Connection Refused
        clean_df = clean_df.localCheckpoint()
        print("--- [Auto-Clean] Hoàn tất dọn dẹp! ---")
        return clean_df

    def preprocess(self):
        """
        Tiền xử lý: Log transformation -> Vector Assembler -> StandardScaler
        """
        print("--- Đang tiền xử lý dữ liệu (Log + Scaling)... ---")
        
        # 1. Log Transformation để xử lý độ lệch phải
        df_log = self.df.withColumn("total_spend_log", F.log1p("total_spend")) \
                        .withColumn("avg_order_value_log", F.log1p("avg_order_value")) \
                        .withColumn("total_orders_log", F.log1p("total_orders"))
        
        # SỬA LỖI TÊN CỘT Ở ĐÂY: Đổi 'recency' thành 'recency_days'
        feature_cols = ['recency_days', 'total_spend_log', 'avg_order_value_log', 'total_orders_log']
        
        # 2. Vector Assembler: Gộp các cột thành 1 vector 'features'
        assembler = VectorAssembler(inputCols=feature_cols, outputCol="features")
        
        # 3. StandardScaler: Chuẩn hóa Z-score
        scaler = StandardScaler(inputCol="features", outputCol="scaled_features", withStd=True, withMean=True)
        
        # Gộp thành Pipeline cho gọn
        pipeline = Pipeline(stages=[assembler, scaler])
        
        self.df_scaled = pipeline.fit(df_log).transform(df_log)
        
        return self.df_scaled

    def train_and_save(self, output_path, n_clusters=4):
        """
        Huấn luyện KMeans và ghi thẳng kết quả ra file Parquet.
        """
        if self.df_scaled is None:
            self.preprocess()
            
        print(f"--- Đang huấn luyện KMeans với K={n_clusters}... ---")
        kmeans = KMeans(featuresCol="scaled_features", predictionCol="cluster", k=n_clusters, seed=42)
        self.model = kmeans.fit(self.df_scaled)
        
        # Dự báo (Gán nhãn cụm)
        df_result = self.model.transform(self.df_scaled)
        
        # Loại bỏ các cột vector tạm thời trước khi lưu
        cols_to_drop = ["features", "scaled_features", "total_spend_log", "avg_order_value_log", "total_orders_log"]
        df_final = df_result.drop(*cols_to_drop)
        
        print(f"--- Đang lưu kết quả phân cụm ra: {output_path} ---")
        df_final.write.mode("overwrite").parquet(output_path)
        
        return df_final

    def evaluate_k(self, k_range=range(2, 11)):
        """
        Đánh giá bằng 2 cách: Elbow (WCSS) và Silhouette Score.
        """
        if self.df_scaled is None:
            self.preprocess()
            
        results = []
        evaluator = ClusteringEvaluator(featuresCol="scaled_features", predictionCol="cluster", metricName="silhouette")
        
        print("--- Bắt đầu đánh giá các giá trị K... ---")
        for k in k_range:
            kmeans = KMeans(featuresCol="scaled_features", predictionCol="cluster", k=k, seed=42)
            model = kmeans.fit(self.df_scaled)
            
            # 1. Cách 1: WCSS (Within Set Sum of Squared Errors)
            wcss = model.summary.trainingCost
            
            # 2. Cách 2: Silhouette Score
            predictions = model.transform(self.df_scaled)
            silhouette = evaluator.evaluate(predictions)
            
            results.append({"k": k, "wcss": wcss, "silhouette": silhouette})
            print(f" > K={k:2d} | WCSS: {wcss:15.2f} | Silhouette Score: {silhouette:.4f}")
            
        return results