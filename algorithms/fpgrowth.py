import pandas as pd
import os
from pyspark.sql import functions as F
from pyspark.ml.fpm import FPGrowth as SparkFPGrowth

class FPGrowthAssociation:
    def __init__(self, spark, input_path, items_col="items", customer_col="CustomerNo"):
        self.spark = spark
        # Tạo thư mục checkpoint
        if not os.path.exists("../checkpoint_dir"):
            os.makedirs("../checkpoint_dir")
        self.spark.sparkContext.setCheckpointDir("../checkpoint_dir")
        
        print(f"--- Đang đọc dữ liệu từ {input_path}... ---")
        self.df = self.spark.read.parquet(input_path)
        self.items_col = items_col
        self.customer_col = customer_col # THÊM DÒNG NÀY
        self.model = None
        self.frequent_itemsets = None
        self.rules = None

    def train_and_save(self, output_rules_path, min_support=0.02, min_confidence=0.5, min_lift=2.0):
        """
        Huấn luyện và lưu luật dưới 3 định dạng: Parquet (Spark), CSV (Excel), JSON (Web).
        """
        print(f"--- Đang huấn luyện FP-Growth... ---")
        fp = SparkFPGrowth(itemsCol=self.items_col, minSupport=min_support, minConfidence=min_confidence)
        self.model = fp.fit(self.df)
        
        # BƯỚC QUAN TRỌNG: Dùng eager=True để ép Spark lưu dữ liệu xuống đĩa NGAY LẬP TỨC
        # Điều này giúp ngắt hoàn toàn phả hệ (lineage) và tránh lỗi Connection Refused khi lưu nhiều file
        self.frequent_itemsets = self.model.freqItemsets.checkpoint(eager=True)
        all_rules = self.model.associationRules.checkpoint(eager=True)
        
        # Lọc luật theo Lift
        self.rules = all_rules.filter(F.col("lift") >= min_lift) \
                              .orderBy(F.col("lift").desc(), F.col("confidence").desc())
        
        # Chốt chặn cuối cùng: Lưu luật đã lọc vào bộ nhớ tạm
        self.rules = self.rules.localCheckpoint(eager=True)

        print(f"--- Đang tiến hành lưu luật ({self.rules.count()} luật) ---")

        # 1. Lưu dạng Parquet (Dành cho Spark - Tốt nhất)
        self.rules.write.mode("overwrite").parquet(output_rules_path)
        print(f" [+] Đã lưu Parquet tại: {output_rules_path}")

        # 2. Lưu dạng CSV (Để mở bằng Excel)
        # CSV không nhận kiểu Array nên phải dùng array_join
        csv_path = output_rules_path.replace(".parquet", ".csv")
        self.rules.withColumn("antecedent", F.array_join("antecedent", ", ")) \
                  .withColumn("consequent", F.array_join("consequent", ", ")) \
                  .write.mode("overwrite").option("header", "true").csv(csv_path)
        print(f" [+] Đã lưu CSV tại: {csv_path}")

        # 3. Lưu dạng JSON (Dành cho lập trình Web/App)
        json_path = output_rules_path.replace(".parquet", ".json")
        self.rules.write.mode("overwrite").json(json_path)
        print(f" [+] Đã lưu JSON tại: {json_path}")

        return self.rules

    def display_top_itemsets(self, top_n=10):
        if self.frequent_itemsets is None: 
            print("Chưa có tập mục phổ biến. Hãy chạy build_fp_tree_and_mine().")
            return
        
        # 1. Tính tổng số giao dịch từ DataFrame gốc để tính Support
        total_count = self.df.count()
            
        # 2. Xử lý dữ liệu: lấy Top N, tính support, và tạo chuỗi itemsets
        top_spark = self.frequent_itemsets.orderBy(F.col("freq").desc()).limit(top_n)
        
        display_spark = top_spark \
            .withColumn("support", F.col("freq") / total_count) \
            .withColumn("itemsets", F.array_join(F.col("items"), ", ")) \
            .select("itemsets", "freq", "support") # <--- CHỈ CHỌN 3 CỘT NÀY ĐỂ IN
            
        # 3. Chuyển sang Pandas để in bảng đẹp
        top_pdf = display_spark.toPandas()
        
        # Cấu hình định dạng số thực cho cột support
        pd.options.display.float_format = '{:.4f}'.format
        
        print(f"\n TOP {top_n} TẬP MỤC PHỔ BIẾN ".center(85, "="))
        # index=False để bỏ cột số thứ tự của Pandas
        print(top_pdf.to_string(index=False, justify='center'))

    def display_top_rules(self, top_n=10):
        if self.rules is None: return
        top_pdf = self.rules.limit(top_n).withColumn("antecedents", F.array_join(F.col("antecedent"), ", ")) \
                            .withColumn("consequents", F.array_join(F.col("consequent"), ", ")) \
                            .select("antecedents", "consequents", "support", "confidence", "lift").toPandas()
        pd.options.display.float_format = '{:.4f}'.format
        print(f"\n TOP {top_n} LUẬT TỐT NHẤT ".center(130, "="))
        print(top_pdf.to_string(index=False, justify='center'))