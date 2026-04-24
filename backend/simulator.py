import os
import time
import json
import pandas as pd
import numpy as np
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable


def _basket_to_items(basket) -> list[str]:
    """Chuẩn hóa cột Basket (list/ndarray trong parquet) thành list[str] cho FP-Growth."""
    if basket is None:
        return []
    if isinstance(basket, np.ndarray):
        raw = basket.tolist()
    elif isinstance(basket, (list, tuple)):
        raw = list(basket)
    else:
        raw = [basket]
    out: list[str] = []
    for x in raw:
        s = str(x).strip()
        if s and s.lower() != "nan":
            out.append(s)
    return out


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

    # Docker: /app = project root (docker-compose mount). Local: thư mục gốc repo.
    default_path = "/app/data/results/final_dataset_streaming.parquet"
    file_path = os.environ.get("SIMULATOR_DATASET_PATH", default_path)
    if not os.path.exists(file_path):
        alt = os.path.join(os.path.dirname(__file__), "..", "data", "results", "final_dataset_streaming.parquet")
        file_path = os.path.normpath(alt)

    try:
        df = pd.read_parquet(file_path)
    except Exception as e:
        print(f"--- ❌ Lỗi đọc file: {e} ---")
        return

    for index, row in df.iterrows():
        cust_id = row.get("CustomerNo")
        items = _basket_to_items(row.get("Basket"))
        if not items:
            continue

        total_val = row.get("TotalOrderValue")
        try:
            monetary_val = float(total_val) if total_val is not None and not pd.isna(total_val) else 0.0
        except (TypeError, ValueError):
            monetary_val = 0.0

        record = {
            "TransactionNo": str(row.get("TransactionNo", f"TXN_{index}")),
            "CustomerNo": str(cust_id) if pd.notna(cust_id) and str(cust_id).strip() else "Guest",
            "items": items,
            "monetary_val": round(monetary_val, 2),
        }

        try:
            producer.send("live_transactions", value=record)
            print(
                f"[Sent] TXN: {record['TransactionNo']} | CN: {record['CustomerNo']} | "
                f"Items: {len(record['items'])} | Doanh thu đơn: {record['monetary_val']}"
            )
        except Exception as e:
            print(f"--- ⚠️ Lỗi khi gửi dữ liệu: {e} ---")

        time.sleep(2)

if __name__ == "__main__":
    run_simulator()