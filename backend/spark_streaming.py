import os
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType

# --- CẤU HÌNH KAFKA & ĐƯỜNG DẪN ---
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:9092') # Thay bằng 'kafka:9092' nếu chạy trong Docker
TOPIC_INPUT = 'live_transactions'
TOPIC_TOP_PRODUCTS = 'top_products'
TOPIC_CLUSTERS = 'customer_clusters'
# Mở file spark_streaming.py và sửa dòng này:
PATH_CLUSTERED_USERS = "/app/data/results/clustered_users.parquet"

# Khởi tạo Spark Session với Kafka package
spark = SparkSession.builder \
    .appName("RealTimeECommerceProcessor") \
    .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.3.0") \
    .config("spark.sql.shuffle.partitions", "4") \
    .getOrCreate()

# Giảm bớt log rác của Spark trên console
spark.sparkContext.setLogLevel("WARN")

# --- 1. ĐỊNH NGHĨA SCHEMA & LOAD DỮ LIỆU TĨNH ---
transaction_schema = StructType([
    StructField("TransactionNo", StringType(), True),
    StructField("Date", StringType(), True),
    StructField("ProductNo", StringType(), True),
    StructField("ProductName", StringType(), True),
    StructField("Price", DoubleType(), True),
    StructField("Quantity", IntegerType(), True),
    StructField("CustomerNo", StringType(), True),
    StructField("TotalOrderValue", DoubleType(), True)
])

# Load file Parquet chứa kết quả phân cụm offline làm dữ liệu tĩnh (Static DataFrame)
print(f"--- Đang tải dữ liệu User Clusters từ: {PATH_CLUSTERED_USERS} ---")
try:
    static_clusters_df = spark.read.parquet(PATH_CLUSTERED_USERS)
    static_clusters_df.cache() # Cache lại để join nhanh hơn cho mỗi micro-batch
except Exception as e:
    print(f"LỖI: Không thể đọc file {PATH_CLUSTERED_USERS}. Hãy đảm bảo file tồn tại!")
    raise e

def process_micro_batch(batch_df, batch_id):
    """
    Hàm xử lý từng Micro-batch cho cả Top Product và gán nhãn Cluster cho user đang giao dịch
    """
    if batch_df.isEmpty():
        return

    batch_df.cache()

    # =====================================================================
    # [LUỒNG 1] TÍNH TOÁN TOP 10 PRODUCTS BÁN CHẠY TRONG BATCH
    # =====================================================================
    top_products_df = batch_df.groupBy("ProductNo", "ProductName") \
        .agg(F.sum("Quantity").alias("TotalSold")) \
        .orderBy(F.desc("TotalSold")) \
        .limit(10)

    # Đẩy kết quả Top Products ra Kafka
    top_products_df.selectExpr("to_json(struct(*)) AS value") \
        .write \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BROKER) \
        .option("topic", TOPIC_TOP_PRODUCTS) \
        .save()

    # =====================================================================
    # [LUỒNG 2] STREAM-STATIC JOIN: TÌM CỤM CỦA KHÁCH HÀNG ĐANG GIAO DỊCH
    # =====================================================================
    # 1. Lấy danh sách các khách hàng (CustomerNo) có phát sinh giao dịch trong luồng hiện tại
    active_users_df = batch_df.filter(F.col("CustomerNo").isNotNull()) \
        .select("CustomerNo") \
        .dropDuplicates()

    # 2. Join với file Parquet tĩnh để lấy toàn bộ thông tin (RFM + Cụm) của họ
    # Giả định file parquet của bạn có cột "prediction" hoặc "cluster"
    enriched_users_df = active_users_df.join(static_clusters_df, on="CustomerNo", how="inner")

    # 3. Đẩy thông tin khách hàng kèm Cụm ra Kafka để Dashboard cập nhật hiệu ứng (ví dụ: nháy sáng user vừa mua hàng)
    enriched_users_df.selectExpr("to_json(struct(*)) AS value") \
        .write \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BROKER) \
        .option("topic", TOPIC_CLUSTERS) \
        .save()

    batch_df.unpersist()

# --- 2. ĐỌC LUỒNG TỪ KAFKA ---
print(f"--- Đang lắng nghe topic '{TOPIC_INPUT}' từ Kafka Broker: {KAFKA_BROKER} ---")
streaming_df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", KAFKA_BROKER) \
    .option("subscribe", TOPIC_INPUT) \
    .option("startingOffsets", "latest") \
    .load()

# Parse JSON string
parsed_stream_df = streaming_df.select(
    F.from_json(F.col("value").cast("string"), transaction_schema).alias("data")
).select("data.*")

# --- 3. KÍCH HOẠT XỬ LÝ THEO MICRO-BATCH ---
query = parsed_stream_df.writeStream \
    .outputMode("append") \
    .foreachBatch(process_micro_batch) \
    .start()

query.awaitTermination()