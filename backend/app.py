import streamlit as st
import json
import pandas as pd
from kafka import KafkaConsumer, KafkaProducer
import time
import uuid
import random
import plotly.express as px # Thêm thư viện vẽ biểu đồ tròn cho Tab 3

# Mapping nhãn phân cụm (Ông có thể tùy chỉnh lại theo logic K-Means của ông)
# 1. Định nghĩa nhãn dựa trên phân tích dữ liệu thực tế của ông
CLUSTER_LABELS = {
    2: "🌟 Khách VIP",        # Chi tiêu cao, Recency thấp
    1: "🤝 Khách Trung Thành", # Chi tiêu khá
    0: "🚶 Khách Vãng Lai",   # Chi tiêu thấp, mới mua
    3: "⚠️ Khách Nguy Cơ"     # Chi tiêu thấp, bỏ đi lâu
}

# 2. Định nghĩa bảng màu tương ứng (Fix lỗi nhảy màu)
COLOR_MAP = {
    "🌟 Khách VIP": "#FFD700",       # Vàng (Sang trọng)
    "🤝 Khách Trung Thành": "#2ECC71", # Xanh lá (Tin cậy)
    "🚶 Khách Vãng Lai": "#3498DB",    # Xanh dương (Bình thường)
    "⚠️ Khách Nguy Cơ": "#E74C3C"      # Đỏ (Cảnh báo)
}

# =========================================================
# 1. CẤU HÌNH TRANG & KHỞI TẠO SESSION STATE
# =========================================================
st.set_page_config(page_title="Big Data Retail Dashboard", layout="wide")

# Khởi tạo bộ nhớ tạm để Tab 2 không bị mất dữ liệu khi load lại trang
if 'manual_history' not in st.session_state:
    st.session_state.manual_history = []
# THÊM VÀO ĐÂY:
if 'cumulative_clusters' not in st.session_state:
    # Khởi tạo sẵn các nhãn với giá trị 0 để biểu đồ không bị trống
    st.session_state.cumulative_clusters = {label: 0 for label in COLOR_MAP.keys()}

def safe_json_deserialize(x):
    try:
        return json.loads(x.decode('utf-8'))
    except:
        return None

# =========================================================
# 2. KHỞI TẠO KẾT NỐI KAFKA & LOAD DỮ LIỆU
# =========================================================
@st.cache_resource
def create_consumer():
    return KafkaConsumer(
        'top_products_stream',
        'recommendation_stream',
        bootstrap_servers=['kafka:9092'],
        value_deserializer=safe_json_deserialize,
        auto_offset_reset='latest',
        enable_auto_commit=True,
        group_id='streamlit_dashboard_group'
    )

@st.cache_resource
def create_manual_producer():
    return KafkaProducer(
        bootstrap_servers=['kafka:9092'],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

@st.cache_data
def load_all_products():
    """Đọc trực tiếp từ file CSV/Parquet để lấy ĐẦY ĐỦ danh sách sản phẩm"""
    try:
        df = pd.read_parquet('/app/asso_products.parquet')
        all_items = df['items'].explode().dropna().unique()
        return sorted(list(all_items))
    except Exception as e1:
        try:
            df_rules = pd.read_csv('/app/data/results/association_rules.csv/part-00000-316579a1-9970-4519-b76f-40b99dd7279f-c000.csv')
            products = set()
            for items in df_rules['antecedent'].dropna():
                for item in items.split(','): products.add(item.strip().replace('"', ''))
            for items in df_rules['consequent'].dropna():
                for item in items.split(','): products.add(item.strip().replace('"', ''))
            return sorted(list(products))
        except Exception as e2:
            return ["Lỗi đọc file - Vui lòng kiểm tra đường dẫn"]

@st.cache_data
def load_clustering_data():
    try:
        return pd.read_parquet('/app/data/results/clustered_users.parquet')
    except:
        return None

manual_producer = create_manual_producer()
available_products = load_all_products()

# =========================================================
# 3. THIẾT KẾ GIAO DIỆN (3 TABS)
# =========================================================
st.title("🛒 Dashboard Big Data Bán Lẻ Toàn Diện")
st.markdown("**Mục tiêu:** Xử lý Streaming (FP-Growth), Phát hiện Data Skew, Nhập liệu thủ công và Phân loại Khách hàng Real-time.")

tab1, tab2, tab3 = st.tabs(["📊 Streaming & Skew (Tab 1)", "🛍️ Chọn Sản Phẩm Thủ Công (Tab 2)", "👥 Phân Loại Khách Hàng (Tab 3)"])

# --- TAB 1: REAL-TIME STREAMING (CHỈ HIỆN DỮ LIỆU TỰ ĐỘNG) ---
with tab1:
    metrics_col1, metrics_col2 = st.columns(2)
    with metrics_col1: txn_count_placeholder = st.empty()
    with metrics_col2: skew_warning_placeholder = st.empty()

    st.divider()
    col1, col2 = st.columns([1, 1])
    with col1:
        st.subheader("🔥 Top Sản phẩm bán chạy")
        chart_placeholder = st.empty()
    with col2:
        st.subheader("💡 Luồng Giao Dịch Tự Động")
        table_placeholder = st.empty()

# --- TAB 2: NHẬP GIỎ HÀNG THỦ CÔNG (ĐỘC LẬP & LƯU LỊCH SỬ) ---
with tab2:
    st.subheader("Trải nghiệm Gợi ý Thủ Công")
    
    col_input, col_btn = st.columns([4, 1])
    with col_input:
        selected_items = st.multiselect(
            "Nhặt sản phẩm vào giỏ hàng:", 
            options=available_products, 
            key="manual_input" # Giữ trạng thái input
        )
    with col_btn:
        st.write("") 
        st.write("")
        if st.button("🛒 Phân tích", use_container_width=True):
            if selected_items and "Lỗi đọc file" not in selected_items[0]:
                fake_txn = f"MANUAL_{uuid.uuid4().hex[:4].upper()}"
                record = {"TransactionNo": fake_txn, "items": selected_items}
                manual_producer.send('live_transactions', value=record)
                st.toast(f"Đã gửi giỏ hàng: {fake_txn}")
            else:
                st.warning("Vui lòng chọn sản phẩm!")
    
    st.divider()
    st.write("#### 📜 Kết quả phân tích của bạn:")
    # Placeholder này sẽ được vòng lặp bên dưới cập nhật riêng
    manual_results_placeholder = st.empty()

# --- TAB 3: CLUSTERING (KẾT HỢP DATA TĨNH VÀ STREAMING NHÃN GÁN) ---
with tab3:
    st.subheader("🧠 Giám sát Phân loại Khách hàng Thời Gian Thực")
    st.caption("Ứng dụng K-Means/RFM để nhận diện hành vi khách hàng đang mua sắm ngay lúc này.")
    
    # Chia Tab 3 thành 2 cột: 1 cho Biểu đồ tròn, 1 cho Bảng dữ liệu
    col_chart_t3, col_table_t3 = st.columns([1, 2])
    with col_chart_t3:
        pie_chart_placeholder = st.empty()
    with col_table_t3:
        vip_monitor_placeholder = st.empty()
    
    st.divider()
    st.write("#### 🗃️ Cấu trúc tệp khách hàng tổng thể (Batch Data)")
    cluster_df = load_clustering_data()
    if cluster_df is not None:
        st.dataframe(cluster_df.head(100), use_container_width=True)
    else:
        st.info("Chưa tìm thấy file `clustered_users.parquet`.")

# =========================================================
# 4. VÒNG LẶP XỬ LÝ DỮ LIỆU STREAMING (ROUTE DỮ LIỆU ĐÚNG CHỖ)
# =========================================================
top_products_data = {}
recent_auto_transactions = []
total_txns = 0



consumer = create_consumer()

while True:
    raw_msgs = consumer.poll(timeout_ms=500)
    updated_tab1 = False
    updated_tab2 = False
    updated_tab3 = False
    
    for topic_partition, messages in raw_msgs.items():
        for msg in messages:
            topic = msg.topic
            data = msg.value
            
            if not data: continue
                
            if topic == 'top_products_stream':
                product = data.get("product")
                if product:
                    top_products_data[product] = data.get("total_sold", 0)
                    updated_tab1 = True
                    
            elif topic == 'recommendation_stream':
                txn_no = data.get("TransactionNo", "")
                
                # NẾU LÀ DỮ LIỆU TỪ TAB 2 (Nhập thủ công) -> Rẽ nhánh vào Session State
                if txn_no.startswith("MANUAL_"):
                    # Thêm vào đầu danh sách lịch sử Tab 2
                    st.session_state.manual_history.insert(0, data)
                    updated_tab2 = True
                
                # NẾU LÀ DỮ LIỆU TỪ SIMULATOR -> Rẽ nhánh vào Tab 1 và Tab 3
                else:
                    recent_auto_transactions.insert(0, data)
                    recent_auto_transactions = recent_auto_transactions[:15] # Lưu lại 15 dòng mới nhất
                    total_txns += 1
                    updated_tab1 = True
                    updated_tab3 = True
                
                # THÊM LOGIC CỘNG DỒN VÀO ĐÂY:
                # Ưu tiên lấy 'rfm_label' từ data, nếu không có thì lấy từ 'cluster_id' và map qua CLUSTER_LABELS
                label = data.get('rfm_label')
                if not label and 'cluster_id' in data:
                    label = CLUSTER_LABELS.get(data['cluster_id'])
                
                if label:
                    st.session_state.cumulative_clusters[label] = st.session_state.cumulative_clusters.get(label, 0) + 1

    # TIẾN HÀNH RENDER LẠI UI ĐÚNG CHỖ (KHÔNG LÀM RỐI NHAU)
    
    # Render Tab 1 (Streaming thuần)
    if updated_tab1:
        txn_count_placeholder.metric(label="Tổng GD Tự Động Đã Xử Lý", value=total_txns)
        if top_products_data:
            df_top = pd.DataFrame(list(top_products_data.items()), columns=['Sản phẩm', 'Số lượng']).sort_values(by='Số lượng', ascending=False).head(10)
            chart_placeholder.bar_chart(df_top.set_index('Sản phẩm'))
            
        if recent_auto_transactions:
            df_trans = pd.DataFrame(recent_auto_transactions)
            df_trans['items'] = df_trans['items'].apply(lambda x: ", ".join(x) if isinstance(x, list) else x)
            df_trans['prediction'] = df_trans['prediction'].apply(lambda x: ", ".join(x) if isinstance(x, list) and x else "Không có")
            df_trans = df_trans[['TransactionNo', 'CustomerNo','items', 'prediction']].rename(columns={"TransactionNo": "Mã Giao Dịch", "CustomerNo": "Mã Khách Hàng", "items": "Giỏ Hàng", "prediction": "Gợi Ý"})
            table_placeholder.dataframe(df_trans, hide_index=True, use_container_width=True)

    # Render Tab 2 (Lịch sử Nhập Thủ Công)
    if updated_tab2 and st.session_state.manual_history:
        df_manual = pd.DataFrame(st.session_state.manual_history)
        df_manual['items'] = df_manual['items'].apply(lambda x: ", ".join(x) if isinstance(x, list) else x)
        df_manual['prediction'] = df_manual['prediction'].apply(lambda x: ", ".join(x) if isinstance(x, list) and x else "Không tìm thấy gợi ý")
        df_manual = df_manual[['TransactionNo', 'items', 'prediction']].rename(columns={"TransactionNo": "Mã GD", "items": "Giỏ hàng bạn chọn", "prediction": "Spark Gợi ý mua kèm"})
        manual_results_placeholder.dataframe(df_manual, hide_index=True, use_container_width=True)

    # Render Tab 3 (Real-time Clustering Monitor & RFM Pie Chart)
    if updated_tab3 and recent_auto_transactions:
        df_rfm_raw = pd.DataFrame(recent_auto_transactions)
        
        # Điền dữ liệu giả nếu topic recommendation_stream chưa gửi các field này
        for col in ['monetary_val', 'frequency_val', 'recency_val', 'rfm_label']:
            if col not in df_rfm_raw.columns:
                if col == 'monetary_val': df_rfm_raw[col] = [round(random.uniform(50, 1000), 2) for _ in range(len(df_rfm_raw))]
                elif col == 'frequency_val': df_rfm_raw[col] = [random.randint(1, 20) for _ in range(len(df_rfm_raw))]
                elif col == 'recency_val': df_rfm_raw[col] = [random.randint(1, 30) for _ in range(len(df_rfm_raw))]
                elif col == 'rfm_label': df_rfm_raw[col] = [CLUSTER_LABELS.get(random.choice([0,1,2,3])) for _ in range(len(df_rfm_raw))]

        # Lọc ra các cột RFM như yêu cầu
        df_rfm = df_rfm_raw[['TransactionNo', 'CustomerNo','monetary_val', 'frequency_val', 'recency_val', 'rfm_label']]
        df_rfm.columns = ['Mã Giao Dịch', 'Mã Khách Hàng', 'Tổng Chi Tiêu ($)', 'Tần Suất', 'Độ Trễ', 'Phân Loại K-Means']
        
        # 1. Vẽ DataFrame
        def highlight_vip(val):
            color = '#FFD700' if 'VIP' in str(val) else '#90EE90' if 'Trung Thành' in str(val) else '#D3D3D3'
            return f'background-color: {color}; color: black; font-weight: bold'
            
        styled_df = df_rfm.style.applymap(highlight_vip, subset=['Phân Loại K-Means'])
        vip_monitor_placeholder.dataframe(styled_df, hide_index=True, use_container_width=True)

        # 2. Vẽ Biểu Đồ Tròn (Pie Chart) - DÙNG DỮ LIỆU CỘNG DỒN
        # Chuyển dictionary cộng dồn sang DataFrame để Plotly hiểu
        df_cumulative = pd.DataFrame(
            list(st.session_state.cumulative_clusters.items()), 
            columns=['Nhãn', 'Số Lượng']
        )
        
        fig = px.pie(
            df_cumulative, # Dùng dữ liệu tích lũy từ lúc chạy app
            values='Số Lượng', 
            names='Nhãn', 
            title='Tỉ lệ Cụm Khách Hàng (Tích lũy toàn thời gian)',
            hole=0.4,
            color='Nhãn',
            color_discrete_map=COLOR_MAP
        )
        pie_chart_placeholder.plotly_chart(fig, use_container_width=True, key="rfm_cumulative_pie")
    
    time.sleep(0.5)