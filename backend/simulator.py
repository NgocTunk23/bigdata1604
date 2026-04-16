import time
import json
import pandas as pd
import numpy as np
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

# 1. Hàm khởi tạo kết nối có khả năng chờ Kafka
def get_producer():
    while True:
        try:
            # Chỉ khởi tạo bên trong khối try này
            p = KafkaProducer(
                bootstrap_servers=['kafka:9092'],
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            print("--- ✅ Kết nối Kafka thành công! ---")
            return p
        except NoBrokersAvailable:
            print("--- ⏳ Kafka chưa sẵn sàng, đang thử lại sau 5 giây... ---")
            time.sleep(5)

# 2. Gọi hàm để lấy producer (Lệnh này sẽ đợi đến khi Kafka lên mới chạy tiếp)
producer = get_producer()

def run_simulator():
    print("--- 🚀 Bắt đầu phát dữ liệu giao dịch (Simulator) ---")
    
    # Sử dụng đường dẫn tuyệt đối trong Container
    file_path = '/app/asso_products.parquet'
    
    try:
        df = pd.read_parquet(file_path)
    except Exception as e:
        print(f"--- ❌ Lỗi đọc file: {e} ---")
        return

    for index, row in df.iterrows():
        # Chuẩn bị dữ liệu giao dịch (Thêm CustomerNo)
        # Sử dụng get("CustomerID") hoặc get("CustomerNo") tùy theo tên cột trong file parquet gốc
        cust_id = row.get("CustomerNo") 

        record = {
            "TransactionNo": str(row.get("TransactionNo", f"TXN_{index}")),
            "CustomerNo": str(cust_id) if cust_id else "Guest", # Lấy đúng ID từ file
            "items": row["items"].tolist() if isinstance(row["items"], np.ndarray) else list(row["items"])
        }
        
        # Gửi dữ liệu vào Kafka
        try:
            producer.send('live_transactions', value=record)
            print(f"[Sent] TXN: {record['TransactionNo']} | Items: {len(record['items'])}")
        except Exception as e:
            print(f"--- ⚠️ Lỗi khi gửi dữ liệu: {e} ---")
        
        # Nghỉ để giả lập thời gian thực
        time.sleep(2)

if __name__ == "__main__":
    run_simulator()