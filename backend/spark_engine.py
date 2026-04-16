import os
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, ArrayType
from pyspark.sql.functions import col, from_json, to_json, struct
from pyspark.ml.fpm import FPGrowth

# Đảm bảo JAVA_HOME trỏ đúng đường dẫn của bạn
os.environ["JAVA_HOME"] = "/usr/lib/jvm/java-17-openjdk-amd64"

def run_spark_streaming():
    # 1. KHỞI TẠO SPARK
    spark = SparkSession.builder \
        .appName("Retail_MarketBasket_Streaming") \
        .master("local[*]") \
        .config("spark.driver.memory", "24g") \
        .config("spark.sql.shuffle.partitions", "32") \
        .getOrCreate()
    
    spark.sparkContext.setLogLevel("WARN")

    # 2. HUẤN LUYỆN MÔ HÌNH BẰNG DỮ LIỆU ĐÃ TIỀN XỬ LÝ
    # Dùng file asso_products.parquet được xuất ra từ preprocessing.ipynb
    input_path = "asso_products.parquet"
    print(f"--- Đang đọc dữ liệu giỏ hàng từ {input_path}... ---")
    basket_df = spark.read.parquet(input_path)

    print("--- Đang huấn luyện FP-Growth... ---")
    # Khớp tham số với code của bạn
    fpGrowth = FPGrowth(itemsCol="items", minSupport=0.02, minConfidence=0.5)
    model = fpGrowth.fit(basket_df)
    print(" [+] Huấn luyện xong mô hình.")

    # 3. ĐỌC STREAMING TỪ KAFKA (TOPIC: sales_stream)
    print("--- Đang chờ dữ liệu giỏ hàng từ Web (Kafka: sales_stream)... ---")
    
    # Định nghĩa Schema khớp với tên cột thực tế (TransactionNo và items)
    json_schema = StructType([
        StructField("TransactionNo", StringType(), True),
        StructField("items", ArrayType(StringType()), True)
    ])

    kafka_df = spark.readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", "localhost:9092") \
        .option("subscribe", "sales_stream") \
        .option("startingOffsets", "latest") \
        .load()

    parsed_stream_df = kafka_df \
        .selectExpr("CAST(value AS STRING) as json_string") \
        .select(from_json(col("json_string"), json_schema).alias("data")) \
        .select("data.TransactionNo", "data.items")

    # 4. ÁP DỤNG LUẬT KẾT HỢP ĐỂ GỢI Ý
    # Transform sẽ sinh ra cột 'prediction' chứa danh sách gợi ý
    predictions_stream = model.transform(parsed_stream_df)

    # 5. XUẤT KẾT QUẢ NGƯỢC LẠI KAFKA (TOPIC: recommendation_stream)
    output_df = predictions_stream \
        .select(to_json(struct(col("TransactionNo"), col("items"), col("prediction"))).alias("value"))

    print("--- Đang mở luồng trả kết quả về Web (Kafka: recommendation_stream) ---")
    query = output_df.writeStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", "localhost:9092") \
        .option("topic", "recommendation_stream") \
        .option("checkpointLocation", "checkpoint_kafka_retail") \
        .start()

    query.awaitTermination()

if __name__ == "__main__":
    run_spark_streaming()