import os
from fastapi import FastAPI, WebSocket
from kafka import KafkaConsumer
import json
import asyncio
import uvicorn

app = FastAPI()

KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'kafka:9092')
TOPIC_CLUSTERS = os.getenv('TOPIC_NAME', 'customer_clusters')

@app.websocket("/ws/clusters")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    consumer = KafkaConsumer(
        TOPIC_CLUSTERS,
        bootstrap_servers=[KAFKA_BROKER],
        auto_offset_reset='latest',
        value_deserializer=lambda x: json.loads(x.decode('utf-8'))
    )
    try:
        while True:
            msg_pack = consumer.poll(timeout_ms=100)
            for _, messages in msg_pack.items():
                for message in messages:
                    await websocket.send_json(message.value)
            await asyncio.sleep(0.01) 
    except Exception as e:
        print(f"Connection closed: {e}")

# Endpoint mới cho Dashboard nhận luồng dữ liệu Parquet -> JSON
@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await websocket.accept()
    consumer = KafkaConsumer(
        'live_transactions',
        bootstrap_servers=[KAFKA_BROKER],
        auto_offset_reset='latest',
        value_deserializer=lambda x: json.loads(x.decode('utf-8'))
    )
    try:
        while True:
            msg_pack = consumer.poll(timeout_ms=100)
            for _, messages in msg_pack.items():
                for message in messages:
                    await websocket.send_json(message.value)
            await asyncio.sleep(0.01) 
    except Exception as e:
        print(f"Connection closed: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)