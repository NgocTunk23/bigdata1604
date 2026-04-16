import streamlit as st
import json
import uuid
from kafka import KafkaProducer, KafkaConsumer

# ---------------------------------------------------------
# CẤU HÌNH KAFKA
# ---------------------------------------------------------
KAFKA_BROKER = 'kafka:9092'
INPUT_TOPIC = 'sales_stream'
OUTPUT_TOPIC = 'recommendation_stream'

@st.cache_resource
def get_kafka_producer():
    return KafkaProducer(
        bootstrap_servers=[KAFKA_BROKER],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

producer = get_kafka_producer()

# ---------------------------------------------------------
# GIAO DIỆN STREAMLIT
# ---------------------------------------------------------
st.set_page_config(page_title="Retail Recommendation System", layout="centered")
st.title("🛒 Hệ thống Gợi ý Bán lẻ Real-time")

# Danh sách top sản phẩm lấy trực tiếp từ EDA của bạn
available_products = [
    "Cream Hanging Heart T-Light Holder",
    "Regency Cakestand 3 Tier",
    "Jumbo Bag Red Retrospot",
    "Party Bunting",
    "Lunch Bag Red Retrospot",
    "Assorted Colour Bird Ornament",
    "Popcorn Holder",
    "Set Of 3 Cake Tins Pantry Design",
    "Pack Of 72 Retrospot Cake Cases",
    "Lunch Bag Black Skull"
]

st.write("### 1. Giỏ hàng của bạn")
selected_items = st.multiselect("Nhặt sản phẩm vào giỏ:", available_products)

if st.button("Thanh toán & Nhận gợi ý", type="primary"):
    if not selected_items:
        st.warning("Vui lòng chọn ít nhất 1 sản phẩm để hệ thống phân tích!")
    else:
        # 1. Tạo Mã giao dịch (TransactionNo) duy nhất
        trans_no = f"T_{str(uuid.uuid4())[:8]}"
        
        # 2. Bắn dữ liệu vào Kafka (Gửi cho Spark)
        payload = {
            "TransactionNo": trans_no,
            "items": selected_items  # Khớp với tên cột bên Spark
        }
        producer.send(INPUT_TOPIC, payload)
        producer.flush()
        
        st.info(f"Đang gửi dữ liệu xuống Spark Engine... (Mã GD: {trans_no})")
        
        # 3. Lắng nghe kết quả trả về từ Spark
        consumer = KafkaConsumer(
            OUTPUT_TOPIC,
            bootstrap_servers=[KAFKA_BROKER],
            auto_offset_reset='latest',
            enable_auto_commit=True,
            group_id=f"streamlit_group_{trans_no}",
            value_deserializer=lambda x: json.loads(x.decode('utf-8')),
            consumer_timeout_ms=15000  # Chờ tối đa 15s
        )
        
        # 4. Hiển thị kết quả
        recommendation_found = False
        with st.spinner("Spark đang tính toán luật FP-Growth..."):
            for message in consumer:
                result_data = message.value
                
                # Check xem mã giao dịch trả về có đúng với phiên hiện tại không
                if result_data.get("TransactionNo") == trans_no:
                    recommendation_found = True
                    predictions = result_data.get("prediction", [])
                    
                    st.success("✨ Phân tích giỏ hàng hoàn tất!")
                    
                    if predictions:
                        st.write("### 💡 Gợi ý mua kèm dành cho bạn:")
                        for item in predictions:
                            st.markdown(f"- ⭐ **{item}**")
                    else:
                        st.write("### 💡 Gợi ý:")
                        st.write("Chưa tìm thấy quy luật mua kèm nào đủ mạnh cho các món đồ này (do Support/Confidence hiện tại).")
                    break
                    
        consumer.close()
        
        if not recommendation_found:
            st.error("⏳ Quá thời gian chờ (Time out). Vui lòng đảm bảo Spark Engine đang chạy.")