import time
import json
import pandas as pd
import numpy as np
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

# Lớp xử lý lỗi serialize cho các kiểu dữ liệu của Pandas/Numpy
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray): return obj.tolist()
        if isinstance(obj, np.integer): return int(obj)
        if isinstance(obj, np.floating): return float(obj)
        if pd.isna(obj): return None
        if isinstance(obj, pd.Timestamp) or hasattr(obj, 'isoformat'): return obj.isoformat()
        return super(NumpyEncoder, self).default(obj)

def get_producer():
    while True:
        try:
            p = KafkaProducer(
                bootstrap_servers=['kafka:9092'],
                value_serializer=lambda v: json.dumps(v, cls=NumpyEncoder).encode('utf-8')
            )
            print("--- ✅ Kết nối Kafka (Simulator) thành công! ---")
            return p
        except NoBrokersAvailable:
            print("--- ⏳ Kafka chưa sẵn sàng, đang thử lại sau 5 giây... ---")
            time.sleep(5)

def run_simulator():
    producer = get_producer()
    print("--- 🚀 Bắt đầu phát dữ liệu giao dịch (Simulator) ---")
    
    file_path = '/app/data/results/final_dataset_streaming.parquet' 
    
    try:
        df = pd.read_parquet(file_path)
        print(f"--- 📊 Đã tải dữ liệu thành công. Tổng cộng {len(df)} giao dịch. ---")
    except Exception as e:
        print(f"--- ❌ Lỗi đọc file Parquet: {e} ---")
        return

    # Lặp qua từng dòng, chuyển đổi thành JSON và stream
    for index, row in df.iterrows():
        record = row.to_dict()
        
        # Đẩy dữ liệu vào Kafka topic 'live_transactions'
        try:
            producer.send('live_transactions', value=record)
            print(f"[Sent] Giao dịch gửi đi: {record.get('TransactionNo', index)}")
        except Exception as e:
            print(f"--- ⚠️ Lỗi khi gửi dữ liệu lên Kafka: {e} ---")
        
        # Stream 1 dòng mỗi giây để dashboard có thể nhận real-time
        time.sleep(0.1)

if __name__ == "__main__":
    run_simulator()