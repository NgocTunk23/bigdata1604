import os
import pandas as pd
import pyspark.sql.functions as F
from pyspark.sql.types import BooleanType
from pyspark.ml.fpm import FPGrowth

class FPGrowthSparkMultiSupport:
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

    def build_fp_tree_and_mine(self, item_supports: dict = None, default_support=0.02, min_confidence=0.5, metric="lift", min_threshold=2.0):
        """
        Huấn luyện mô hình áp dụng cơ chế Đa Ngưỡng (Multi-Support)
        """
        # 1. TÌM NGƯỠNG THẤP NHẤT ĐỂ KHAI PHÁ THÔ
        # Bắt buộc khai phá ở ngưỡng nhỏ nhất để lấy superset các luật
        if item_supports:
            lowest_support = min(list(item_supports.values()) + [default_support])
        else:
            lowest_support = default_support

        print(f"--- Đang khai phá thô với minSupport thấp nhất: {lowest_support} ---")
        fp = FPGrowth(itemsCol=self.items_col, minSupport=lowest_support, minConfidence=min_confidence)
        self.model = fp.fit(self.df)
        
        # Bắt lại tập mục phổ biến để dùng cho hàm display_top_itemsets
        self.frequent_itemsets = self.model.freqItemsets
        
        # PySpark tự động sinh associationRules
        raw_rules = self.model.associationRules

        if item_supports is None:
            # Nếu không dùng đa ngưỡng, chỉ lọc theo metric
            self.rules = raw_rules.filter(F.col(metric) >= min_threshold)
            return self.rules

        # 2. LỌC CHẶT BẰNG ĐA NGƯỠNG (MULTI-SUPPORT LOGIC)
        print("--- Đang áp dụng bộ lọc Đa ngưỡng (Multi-Support) ---")
        
        # Khai báo UDF để check từng luật theo từ điển item_supports giống logic của pandas
        def check_multi_support(antecedent, consequent, support):
            items = antecedent + consequent
            # Ngưỡng bắt buộc của luật này là ngưỡng CAO NHẤT trong các item cấu thành
            required_support = max([item_supports.get(item, default_support) for item in items])
            return float(support) >= required_support

        # Đăng ký hàm UDF để PySpark có thể chạy song song trên Dataframe
        multi_support_udf = F.udf(check_multi_support, BooleanType())

        # Áp dụng bộ lọc đa ngưỡng và bộ lọc metric
        self.rules = raw_rules.filter(
            multi_support_udf(F.col("antecedent"), F.col("consequent"), F.col("support"))
        ).filter(
            F.col(metric) >= min_threshold
        )
        # THÊM DÒNG NÀY: Sắp xếp ngay tại đây
        self.rules = self.rules.orderBy(F.col("lift").desc(), F.col("confidence").desc())

        return self.rules

    def save_rules(self, output_path):
        """
        Lưu luật đã sinh ra file Parquet (kèm theo CSV và JSON)
        """
        if self.rules is None:
            print(" [!] Không có luật nào để lưu. Hãy chạy build_fp_tree_and_mine trước.")
            return

        print(f"--- Đang lưu luật kết hợp... ---")

        self.rules.write.mode("overwrite").parquet(output_path)
        
        # 2. Lưu CSV (Cho người dùng xem/Mở bằng Excel)
        csv_path = output_path.replace(".parquet", ".csv")
        self.rules.withColumn("antecedent", F.array_join("antecedent", ", ")) \
                  .withColumn("consequent", F.array_join("consequent", ", ")) \
                  .write.mode("overwrite").option("header", "true").csv(csv_path)
        
        # 3. Lưu JSON (Dành cho lập trình Web/App React)
        json_path = output_path.replace(".parquet", ".json")
        self.rules.write.mode("overwrite").json(json_path)
        
        print(f" [+] Đã lưu luật tại: {output_path} (Parquet/CSV/JSON)")

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
        if self.rules is None: 
            print("Chưa có luật nào. Hãy chạy build_fp_tree_and_mine().")
            return
            
        # Thêm orderBy ở đây để chắc chắn lấy đúng Top N luật xịn nhất
        top_pdf = self.rules.orderBy(F.col("lift").desc(), F.col("confidence").desc()) \
                            .limit(top_n) \
                            .withColumn("antecedents", F.array_join(F.col("antecedent"), ", ")) \
                            .withColumn("consequents", F.array_join(F.col("consequent"), ", ")) \
                            .select("antecedents", "consequents", "support", "confidence", "lift").toPandas()
        
        pd.options.display.float_format = '{:.4f}'.format
        print(f"\n TOP {top_n} LUẬT TỐT NHẤT ".center(130, "="))
        print(top_pdf.to_string(index=False, justify='center'))
