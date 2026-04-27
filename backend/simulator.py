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
    
    # Sử dụng đường dẫn tuyệt đối trong Container như bạn đã chỉ định
    file_path = '/app/data/results/final_dataset_streaming.parquet' 
    
    try:
        # Đọc dữ liệu từ file Parquet
        df = pd.read_parquet(file_path)
        print(f"--- 📊 Đã tải dữ liệu thành công. Tổng cộng {len(df)} giao dịch. ---")
    except Exception as e:
        print(f"--- ❌ Lỗi đọc file: {e} ---")
        return

    # for index, row in df.iterrows():
    #     # Lấy CustomerNo từ cột tương ứng
    #     cust_id = row.get("CustomerNo") 
        
    #     # SỬA TẠI ĐÂY: Lấy dữ liệu từ cột 'Basket' (thay vì 'items')
    #     # Chúng ta vẫn giữ key trong record là "items" để Bridge và Frontend không bị lỗi
    #     basket_data = row.get("Basket", [])

    #     record = {
    #         "TransactionNo": str(row.get("TransactionNo", f"TXN_{index}")),
    #         "CustomerNo": str(cust_id) if cust_id is not None else "Guest",
    #         "items": basket_data.tolist() if isinstance(basket_data, np.ndarray) else list(basket_data)
    #     }
        
    #     # Gửi dữ liệu vào Kafka topic 'live_transactions'
    #     try:
    #         producer.send('live_transactions', value=record)
    #         print(f"[Sent] TXN: {record['TransactionNo']} | CN: {record['CustomerNo']} | Items: {len(record['items'])}")
    #     except Exception as e:
    #         print(f"--- ⚠️ Lỗi khi gửi dữ liệu lên Kafka: {e} ---")
        
    #     # Nghỉ 2 giây để giả lập luồng giao dịch thời gian thực
    #     time.sleep(2)

if __name__ == "__main__":
    run_simulator()