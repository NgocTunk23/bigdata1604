import os
import pandas as pd
import time
import json
import numpy as np
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

# Cấu hình từ môi trường
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'kafka:9092')
TOPIC_NAME = os.getenv('TOPIC_NAME', 'customer_clusters')
# Đã cập nhật theo tên file .jsonl mới của bạn
DATA_SOURCE = os.getenv('DATA_SOURCE', '/app/data/results/clustered_users.jsonl')

# Lớp xử lý lỗi khi gặp kiểu dữ liệu NumPy (ndarray, int64, float64)
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        return super(NumpyEncoder, self).default(obj)

def get_producer():
    while True:
        try:
            producer = KafkaProducer(
                bootstrap_servers=[KAFKA_BROKER],
                # Sử dụng cls=NumpyEncoder để serialize mảng vector từ Spark
                value_serializer=lambda x: json.dumps(x, cls=NumpyEncoder).encode('utf-8')
            )
            print("Connected to Kafka successfully!")
            return producer
        except NoBrokersAvailable:
            print("Kafka not ready, retrying in 5 seconds...")
            time.sleep(5)
def run_producer():
    producer = get_producer()
    
    # 1. SỬA LẠI: Chỉ cần chờ file jsonl được tạo ra (Không tìm _SUCCESS bên trong file nữa)
    print(f"Waiting for data file at {DATA_SOURCE}...")
    while not os.path.exists(DATA_SOURCE):
        time.sleep(5)
        
    print("Data file found! Loading JSONL data...")

    # 2. Đọc dữ liệu từ file/thư mục JSON
    try:
        # lines=True là bắt buộc đối với định dạng JSONL
        df = pd.read_json(DATA_SOURCE, lines=True)
        print(f"Loaded {len(df)} rows from source.")
    except Exception as e:
        print(f"Error reading JSON source: {e}")
        return

    # 3. Gửi dữ liệu vào Kafka theo vòng lặp
    print(f"Starting to stream data to topic: {TOPIC_NAME}")
    while True:
        for _, row in df.iterrows():
            data = row.to_dict()
            producer.send(TOPIC_NAME, value=data)
            print(f"Sent CustomerNo: {data.get('CustomerNo', 'Unknown')} to Kafka")
            
            # SỬA LẠI: Bắt buộc phải có time.sleep() để giả lập luồng thời gian thực
            # và tránh làm sập (crash) trình duyệt Frontend
            time.sleep(1)

if __name__ == "__main__":
    run_producer()