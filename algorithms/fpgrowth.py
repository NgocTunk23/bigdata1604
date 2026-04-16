import pandas as pd
import os
from pyspark.sql import functions as F
from pyspark.ml.fpm import FPGrowth as SparkFPGrowth

class FPGrowthAssociation:
    def __init__(self, spark, input_path, items_col="items"):
        self.spark = spark
        # Tạo thư mục checkpoint
        if not os.path.exists("../checkpoint_dir"):
            os.makedirs("../checkpoint_dir")
        self.spark.sparkContext.setCheckpointDir("../checkpoint_dir")
        
        print(f"--- Đang đọc dữ liệu từ {input_path}... ---")
        self.df = self.spark.read.parquet(input_path)
        self.items_col = items_col
        self.model = None
        self.frequent_itemsets = None
        self.rules = None

    def train_and_save(self, output_rules_path, min_support=0.02, min_confidence=0.5, min_lift=1.01):
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
        if self.frequent_itemsets is None: return
        top_spark = self.frequent_itemsets.orderBy(F.col("freq").desc()).limit(top_n)
        top_pdf = top_spark.withColumn("itemsets", F.array_join(F.col("items"), ", ")).toPandas()
        print(f"\n TOP {top_n} TẬP MỤC PHỔ BIẾN ".center(85, "="))
        print(top_pdf.to_string(index=False, justify='center'))

    def display_top_rules(self, top_n=10):
        if self.rules is None: return
        top_pdf = self.rules.limit(top_n).withColumn("antecedents", F.array_join(F.col("antecedent"), ", ")) \
                            .withColumn("consequents", F.array_join(F.col("consequent"), ", ")) \
                            .select("antecedents", "consequents", "support", "confidence", "lift").toPandas()
        pd.options.display.float_format = '{:.4f}'.format
        print(f"\n TOP {top_n} LUẬT TỐT NHẤT ".center(130, "="))
        print(top_pdf.to_string(index=False, justify='center'))