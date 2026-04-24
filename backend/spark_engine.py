import os
os.environ["SPARK_LOCAL_IP"] = "127.0.0.1"
import pyspark
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, ArrayType
from pyspark.sql.functions import col, from_json, to_json, struct, explode, window, count
from pyspark.ml.fpm import FPGrowth

# Đảm bảo JAVA_HOME trỏ đúng đường dẫn (Áp dụng cho cả Docker và Local)
# os.environ["JAVA_HOME"] = "/usr/lib/jvm/java-17-openjdk-amd64"

def run_spark_streaming():
    # 1. KHỞI TẠO SPARK
    spark = SparkSession.builder \
        .appName("Retail_MarketBasket_Streaming") \
        .master("local[*]") \
        .config("spark.driver.memory", "8g") \
        .config("spark.sql.shuffle.partitions", "32") \
        .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.1") \
        .getOrCreate()
    
    spark.sparkContext.setLogLevel("WARN")

    # 2. HUẤN LUYỆN MÔ HÌNH BẰNG DỮ LIỆU ĐÃ TIỀN XỬ LÝ
    # Đọc file asso_products.parquet (nằm trong thư mục gốc /app khi chạy Docker)
    input_path = "../asso_products.parquet"
    print(f"--- Đang đọc dữ liệu giỏ hàng từ {input_path}... ---")
    basket_df = spark.read.parquet(input_path)

    print("--- Đang huấn luyện mô hình FP-Growth... ---")
    # Cấu hình FP-Growth
    fpGrowth = FPGrowth(itemsCol="items", minSupport=0.02, minConfidence=0.5)
    model = fpGrowth.fit(basket_df)
    print(" [+] Huấn luyện xong mô hình FP-Growth.")

    # 3. ĐỌC STREAMING TỪ KAFKA (TOPIC: live_transactions)
    print("--- Đang chờ luồng dữ liệu thời gian thực (Kafka: live_transactions)... ---")
    
    json_schema = StructType([
        StructField("TransactionNo", StringType(), True),
        StructField("CustomerNo", StringType(), True), # THÊM DÒNG NÀY
        StructField("items", ArrayType(StringType()), True)
    ])

    # Đọc dữ liệu từ Kafka (Dùng 'kafka:9092' vì đang chạy trong mạng Docker) ----- mới sửa thành localhost:9092
    kafka_df = spark.readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", "localhost:9092") \
        .option("subscribe", "live_transactions") \
        .option("startingOffsets", "latest") \
        .option("failOnDataLoss", "false") \
        .load()

    # Parse dữ liệu JSON và trích xuất thêm cột 'timestamp' mặc định của Kafka để đếm thời gian
    parsed_stream_df = kafka_df \
        .selectExpr("CAST(value AS STRING) as json_string", "timestamp") \
        .select(from_json(col("json_string"), json_schema).alias("data"), "timestamp") \
        .select("data.TransactionNo", "data.CustomerNo", "data.items", "timestamp") # THÊM "data.CustomerNo"

    # ==============================================================
    # NHÁNH 1: THỐNG KÊ REAL-TIME (TÌM TOP PRODUCTS & XỬ LÝ SKEW)
    # ==============================================================
    print("--- Thiết lập luồng 1: Thống kê Top Products ---")
    
    # Tách từng sản phẩm ra khỏi giỏ hàng thành các dòng riêng biệt
    exploded_df = parsed_stream_df.select(
        explode(col("items")).alias("product"), 
        col("timestamp")
    )
    
    # Gom nhóm theo thời gian (cửa sổ 1 phút) và đếm số lượng
    # Sử dụng Watermark để Spark biết khi nào nên xóa dữ liệu cũ trong bộ nhớ (Tránh tràn RAM)
    top_products_df = exploded_df \
        .withWatermark("timestamp", "1 minute") \
        .groupBy(
            window(col("timestamp"), "1 minute"),
            col("product")
        ).agg(count("*").alias("total_sold"))

    # Xuất kết quả đếm liên tục vào Kafka (Topic: top_products_stream)
    query_top_products = top_products_df \
        .selectExpr("CAST(product AS STRING) AS key", "to_json(struct(*)) AS value") \
        .writeStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", "localhost:9092") \
        .option("topic", "top_products_stream") \
        .option("checkpointLocation", "/tmp/checkpoint_top_products") \
        .outputMode("update") \
        .start()

    # ==============================================================
    # NHÁNH 2: ÁP DỤNG LUẬT KẾT HỢP ĐỂ GỢI Ý MUA SẮM
    # ==============================================================
    print("--- Thiết lập luồng 2: Hệ thống gợi ý FP-Growth ---")
    
    # Áp dụng model để sinh ra cột 'prediction' chứa danh sách gợi ý
    predictions_stream = model.transform(parsed_stream_df)

    # Xuất kết quả gợi ý vào Kafka (Topic: recommendation_stream)
    query_recommendations = predictions_stream \
        .select(to_json(struct(col("TransactionNo"), col("CustomerNo"), col("items"), col("prediction"))).alias("value")) \
        .writeStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", "localhost:9092") \
        .option("topic", "recommendation_stream") \
        .option("checkpointLocation", "/tmp/checkpoint_recommendations") \
        .start()

    # ==============================================================
    # KÍCH HOẠT HỆ THỐNG
    # ==============================================================
    print("--- CẢ 2 LUỒNG ĐÃ MỞ: Sẵn sàng nhận dữ liệu ---")
    spark.streams.awaitAnyTermination()

if __name__ == "__main__":
    run_spark_streaming()