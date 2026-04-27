import os
import pandas as pd
import time
import json
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'kafka:9092')
TOPIC_NAME = os.getenv('TOPIC_NAME', 'customer_clusters')
DATA_SOURCE = os.getenv('DATA_SOURCE', '/app/data/results/clustered_users.parquet')

def get_producer():
    while True:
        try:
            producer = KafkaProducer(
                bootstrap_servers=[KAFKA_BROKER],
                value_serializer=lambda x: json.dumps(x).encode('utf-8')
            )
            print("Connected to Kafka successfully!")
            return producer
        except NoBrokersAvailable:
            print("Kafka not ready, retrying in 5 seconds...")
            time.sleep(5)

def run_producer():
    producer = get_producer()
    # Kiểm tra xem đường dẫn là file hay thư mục
    if os.path.isdir(DATA_SOURCE):
        # Nếu là thư mục parquet của Spark, pandas có thể đọc cả thư mục
        df = pd.read_parquet(DATA_SOURCE)
    else:
        df = pd.read_parquet(DATA_SOURCE)

    while True:
        for _, row in df.iterrows():
            data = row.to_dict()
            producer.send(TOPIC_NAME, value=data)
            print(f"Sent: {data.get('CustomerNo')}")
            time.sleep(1)

if __name__ == "__main__":
    run_producer()