import os
import time
import json
import pandas as pd
import numpy as np
import threading
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'kafka:9092')
TOPIC_CLUSTERS = os.getenv('TOPIC_NAME', 'customer_clusters')
DATA_CLUSTERS = os.getenv('DATA_SOURCE', '/app/data/results/clustered_users.jsonl')
DATA_TRANSACTIONS = '/app/data/results/final_dataset_streaming.parquet'

app = FastAPI()
# Cấp quyền CORS để React app gọi API thoải mái
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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
                bootstrap_servers=[KAFKA_BROKER],
                value_serializer=lambda v: json.dumps(v, cls=NumpyEncoder).encode('utf-8')
            )
            print("--- ✅ Kết nối Kafka thành công! ---")
            return p
        except NoBrokersAvailable:
            print("--- ⏳ Kafka chưa sẵn sàng, thử lại sau 5s... ---")
            time.sleep(5)

producer = get_producer()

# State quản lý tốc độ streaming chung (mặc định 1.0 giây/chu kỳ)
stream_state = { "delay": 1.0 }

@app.get("/api/speed/{value}")
def update_speed(value: float):
    stream_state["delay"] = max(0.01, value) # Không cho phép thấp hơn 10ms
    return {"status": "success", "delay": stream_state["delay"]}

def run_cluster_stream():
    print(f"Waiting for {DATA_CLUSTERS}...")
    while not os.path.exists(DATA_CLUSTERS): time.sleep(5)
    try:
        df = pd.read_json(DATA_CLUSTERS, lines=True)
    except Exception as e:
        print("Lỗi đọc JSONL:", e)
        return
        
    while True:
        for _, row in df.iterrows():
            try:
                producer.send(TOPIC_CLUSTERS, value=row.to_dict())
            except Exception: pass
            time.sleep(stream_state["delay"])

def run_transaction_stream():
    print(f"Waiting for {DATA_TRANSACTIONS}...")
    while not os.path.exists(DATA_TRANSACTIONS): time.sleep(5)
    try:
         df = pd.read_parquet(DATA_TRANSACTIONS)
    except Exception as e:
         print("Lỗi đọc Parquet:", e)
         return
         
    while True:
        for index, row in df.iterrows():
            try:
                producer.send('live_transactions', value=row.to_dict())
            except Exception: pass
            # Giả định: giao dịch nhiều hơn phân cụm nên cho luồng này bắn nhanh hơn tỷ lệ 10 lần
            time.sleep(stream_state["delay"] / 10.0)

# Chạy ngầm 2 luồng phát khi server API khởi động
@app.on_event("startup")
def startup_event():
    threading.Thread(target=run_cluster_stream, daemon=True).start()
    threading.Thread(target=run_transaction_stream, daemon=True).start()

if __name__ == "__main__":
    # Mở port 8003 cho API điều khiển tốc độ
    uvicorn.run(app, host="0.0.0.0", port=8003)