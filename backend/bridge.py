import json
import asyncio
import random
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from kafka import KafkaConsumer

app = FastAPI()

# 1. Cấp quyền cho React (chạy ở localhost:3001) được phép gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Map nhãn K-Means cho giống với React Component
CLUSTER_LABELS = {
    0: "Vãng lai",
    1: "Thân thiết",
    2: "Trung thành",
    3: "VIP"
}

COLORS = {
    "Vãng lai": "#F87171",
    "Thân thiết": "#4ADE80",
    "Trung thành": "#FCD34D",
    "VIP": "#C084FC"
}

def get_consumer():
    # Kết nối tới 2 topic như cách Streamlit đang làm
    return KafkaConsumer(
        'top_products_stream',
        'recommendation_stream',
        bootstrap_servers=['kafka:9092'],
        value_deserializer=lambda x: json.loads(x.decode('utf-8')) if x else None,
        auto_offset_reset='latest'
    )

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    consumer = get_consumer()
    print("🚀 [Bridge] Đã mở kết nối WebSocket thành công. Đang lắng nghe Kafka...")
    
    try:
        while True:
            # Lấy data liên tục từ Kafka (timeout nhỏ để không block)
            msg_pack = consumer.poll(timeout_ms=100)
            
            for tp, messages in msg_pack.items():
                for msg in messages:
                    if not msg.value: continue
                    
                    data = msg.value
                    
                    # RẼ NHÁNH 1: Giao dịch có Gợi ý mua kèm + Phân cụm RFM
                    if msg.topic == 'recommendation_stream':
                        # Giống logic file app.py: Nếu không có rfm_label từ Spark thì giả lập
                        if 'rfm_label' not in data:
                            cluster_id = random.choice([0, 1, 2, 3])
                            data['cluster'] = CLUSTER_LABELS[cluster_id]
                            data['clusterColor'] = COLORS[data['cluster']]
                            data['totalSpending'] = round(random.uniform(50, 1000), 2)
                            data['frequency'] = random.randint(1, 20)
                            data['recency'] = random.randint(1, 30)
                        
                        # Đóng gói và Gửi về React
                        await websocket.send_json({
                            "type": "RECOMMENDATION", 
                            "data": data
                        })
                        
                    # RẼ NHÁNH 2: Top sản phẩm bán chạy    
                    elif msg.topic == 'top_products_stream':
                        await websocket.send_json({
                            "type": "TOP_PRODUCTS", 
                            "data": data
                        })
                        
            await asyncio.sleep(0.1)
    except Exception as e:
        print(f"❌ [Bridge] Lỗi WebSocket: {e}")
    finally:
        await websocket.close()