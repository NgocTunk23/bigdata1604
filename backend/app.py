# app.py (MỚI - Chuyển sang dùng FastAPI làm API Server)
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from kafka import KafkaConsumer, KafkaProducer
import json
import pandas as pd
import asyncio

app = FastAPI()

# Mở CORS để React (cổng 5173) có thể gọi được API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. API GỬI GIỎ HÀNG THỦ CÔNG (Dành cho Tab 3 - AssociationRulesTab)
@app.post("/api/manual-analysis")
async def analyze_manual(cart: dict):
    # Logic cũ: Gửi selected_items vào Kafka (live_transactions)
    # Trả về kết quả ngay lập tức từ model Super hoặc chờ Kafka phản hồi
    return {"status": "success", "message": "Đã gửi vào Kafka"}

# 2. WEBSOCKET CHO STREAMING REAL-TIME (Dành cho Tab 1, Tab 4)
@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Logic cũ: Khởi tạo KafkaConsumer
    consumer = KafkaConsumer(
        'top_products_stream', 'recommendation_stream',
        bootstrap_servers=['localhost:9092'],
        value_deserializer=lambda x: json.loads(x.decode('utf-8'))
    )
    
    try:
        for msg in consumer:
            # Gửi thẳng dữ liệu Kafka qua WebSocket xuống cho React
            await websocket.send_json({
                "topic": msg.topic,
                "data": msg.value
            })
            await asyncio.sleep(0.1)
    except Exception as e:
        print("Mất kết nối WebSocket")

# 3. API LẤY DATA TĨNH (Dành cho Tab 2 - DataEDATab)
@app.get("/api/eda-data")
def get_eda_data():
    # Load file parquet EDA và trả về JSON
    return {"data": "..."}







# import streamlit as st
# import json
# import pandas as pd
# from kafka import KafkaConsumer, KafkaProducer
# import time
# import uuid
# import random
# import plotly.express as px # Thêm thư viện vẽ biểu đồ tròn cho Tab 3

# # Mapping nhãn phân cụm (Ông có thể tùy chỉnh lại theo logic K-Means của ông)
# # 1. Định nghĩa nhãn dựa trên phân tích dữ liệu thực tế của ông
# CLUSTER_LABELS = {
#     2: "🌟 Khách VIP",        # Chi tiêu cao, Recency thấp
#     1: "🤝 Khách Trung Thành", # Chi tiêu khá
#     0: "🚶 Khách Vãng Lai",   # Chi tiêu thấp, mới mua
#     3: "⚠️ Khách Nguy Cơ"     # Chi tiêu thấp, bỏ đi lâu
# }

# # 2. Định nghĩa bảng màu tương ứng (Fix lỗi nhảy màu)
# COLOR_MAP = {
#     "🌟 Khách VIP": "#FFD700",       # Vàng (Sang trọng)
#     "🤝 Khách Trung Thành": "#2ECC71", # Xanh lá (Tin cậy)
#     "🚶 Khách Vãng Lai": "#3498DB",    # Xanh dương (Bình thường)
#     "⚠️ Khách Nguy Cơ": "#E74C3C"      # Đỏ (Cảnh báo)
# }

# # =========================================================
# # 1. CẤU HÌNH TRANG & KHỞI TẠO SESSION STATE
# # =========================================================
# st.set_page_config(page_title="Big Data Retail Dashboard", layout="wide")

# # Khởi tạo bộ nhớ tạm để Tab 2 không bị mất dữ liệu khi load lại trang
# if 'manual_history' not in st.session_state:
#     st.session_state.manual_history = []
# # THÊM VÀO ĐÂY:
# if 'cumulative_clusters' not in st.session_state:
#     # Khởi tạo sẵn các nhãn với giá trị 0 để biểu đồ không bị trống
#     st.session_state.cumulative_clusters = {label: 0 for label in COLOR_MAP.keys()}

# def safe_json_deserialize(x):
#     try:
#         return json.loads(x.decode('utf-8'))
#     except:
#         return None

# # =========================================================
# # 2. KHỞI TẠO KẾT NỐI KAFKA & LOAD DỮ LIỆU
# # =========================================================
# @st.cache_resource
# def create_consumer():
#     return KafkaConsumer(
#         'top_products_stream',
#         'recommendation_stream',
#         bootstrap_servers=['kafka:9092'],
#         value_deserializer=safe_json_deserialize,
#         auto_offset_reset='latest',
#         enable_auto_commit=True,
#         group_id='streamlit_dashboard_group'
#     )

# @st.cache_resource
# def create_manual_producer():
#     while True:
#         try:
#             # Cố gắng kết nối với Kafka
#             producer = KafkaProducer(
#                 bootstrap_servers=['kafka:9092'],
#                 value_serializer=lambda v: json.dumps(v).encode('utf-8')
#             )
#             return producer
#         except Exception:
#             # Nếu Kafka chưa lên, App sẽ không sập mà chỉ ngủ 5 giây rồi thử lại
#             time.sleep(5)

# @st.cache_data
# def load_all_products():
#     """Chỉ đọc các sản phẩm đóng vai trò là 'antecedent' để đảm bảo luôn có gợi ý"""
#     rules_parquet_path = '/app/data/results/association_rules.parquet'
#     rules_csv_path =     '/app/association.csv' 

#     # Ưu tiên đọc từ file Parquet vì Spark lưu antecedent dưới dạng Array
#     try:
#         df_rules = pd.read_parquet(rules_parquet_path)
#         # Explode cột antecedent (mảng) thành từng dòng và lấy giá trị duy nhất
#         antecedents = df_rules['antecedent'].explode().dropna().unique()
#         return sorted(list(antecedents))
    
#     except Exception as e1:
#         # Fallback: Đọc từ file CSV nếu Parquet lỗi
#         try:
#             df_rules = pd.read_csv(rules_csv_path)
#             products = set()
#             # Chỉ lấy từ cột 'antecedent', bỏ qua 'consequent'
#             for items in df_rules['antecedent'].dropna():
#                 # Xử lý chuỗi "item1, item2" nếu CSV lưu dạng string
#                 for item in items.split(','):
#                     products.add(item.strip().replace('"', ''))
#             return sorted(list(products))
        
#         except Exception as e2:
#             # Nếu cả 2 đều lỗi, có thể do chưa chạy Notebook huấn luyện
#             return ["Chưa có luật - Hãy chạy huấn luyện trước"]
        
# @st.cache_data
# def load_super_unique_products():
#     """Chỉ lấy các sản phẩm antecedent có trong bản Super mà không có trong bản thường"""
#     # 1. Lấy danh sách sản phẩm từ model bình thường (đã có hàm của ông)
#     standard_products = set(load_all_products())
    
#     # 2. Đọc sản phẩm từ file associationsuper.csv
#     try:
#         # Đường dẫn ông cần kiểm tra lại cho đúng với container (giả sử nằm trong results)
#         super_path = '/app/associationsuper.csv'
#         df_super = pd.read_csv(super_path)
        
#         super_ants = set()
#         for items in df_super['antecedent'].dropna():
#             # Xử lý chuỗi "item1, item2" từ CSV của Spark
#             for item in items.split(','):
#                 super_ants.add(item.strip().replace('"', ''))
        
#         # 3. Phép trừ tập hợp: Chỉ giữ lại những mã hàng mới mà model thường không tìm thấy
#         unique_to_super = super_ants - standard_products
#         return sorted(list(unique_to_super))
#     except Exception as e:
#         st.error(f"Lỗi đọc file Super: {e}")
#         return []
        

# @st.cache_data
# def load_clustering_data():
#     try:
#         return pd.read_parquet('/app/data/results/clustered_users.parquet')
#     except:
#         return None

# manual_producer = create_manual_producer()
# available_products = load_all_products()

# # =========================================================
# # 3. THIẾT KẾ GIAO DIỆN (3 TABS)
# # =========================================================
# st.title("🛒 Dashboard Big Data Bán Lẻ Toàn Diện")
# st.markdown("**Mục tiêu:** Xử lý Streaming (FP-Growth), Phát hiện Data Skew, Nhập liệu thủ công và Phân loại Khách hàng Real-time.")

# tab1, tab2, tab3 = st.tabs(["📊 Streaming & Skew (Tab 1)", "🛍️ Chọn Sản Phẩm Thủ Công (Tab 2)", "👥 Phân Loại Khách Hàng (Tab 3)"])

# # --- TAB 1: REAL-TIME STREAMING (CHỈ HIỆN DỮ LIỆU TỰ ĐỘNG) ---
# with tab1:
#     metrics_col1, metrics_col2 = st.columns(2)
#     with metrics_col1: txn_count_placeholder = st.empty()
#     with metrics_col2: skew_warning_placeholder = st.empty()

#     st.divider()
#     col1, col2 = st.columns([1, 1])
#     with col1:
#         st.subheader("🔥 Top Sản phẩm bán chạy")
#         chart_placeholder = st.empty()
#     with col2:
#         st.subheader("💡 Luồng Giao Dịch Tự Động")
#         table_placeholder = st.empty()

# # --- TAB 2: NHẬP GIỎ HÀNG THỦ CÔNG (ĐỘC LẬP & LƯU LỊCH SỬ) ---
# with tab2:
#     st.subheader("🛍️ Trải nghiệm Gợi ý Thủ Công & So sánh Mô hình")
    
#     # =========================================================
#     # PHẦN 1: MÔ HÌNH TIÊU CHUẨN (STREAMING QUA KAFKA)
#     # =========================================================
#     st.markdown("### 📦 1. Mô hình Tiêu chuẩn (1 Ngưỡng)")
#     st.info("Sử dụng toàn bộ dữ liệu. Khi bấm phân tích, giỏ hàng sẽ được gửi vào Kafka để Spark Streaming xử lý.")
    
#     col_input_std, col_btn_std = st.columns([4, 1])
#     with col_input_std:
#         selected_items = st.multiselect(
#             "Nhặt sản phẩm vào giỏ hàng (Tiêu chuẩn):", 
#             options=available_products,  # Biến này ông đã khai báo ở trên
#             key="manual_input" # Giữ key cũ để không hỏng logic
#         )
#     with col_btn_std:
#         st.write("") 
#         st.write("")
#         if st.button("🛒 Phân tích (Tiêu chuẩn)", use_container_width=True):
#             if selected_items and "Lỗi đọc file" not in selected_items[0]:
#                 fake_txn = f"MANUAL_{uuid.uuid4().hex[:4].upper()}"
#                 record = {"TransactionNo": fake_txn, "items": selected_items}
#                 # Gửi qua Kafka y như cũ
#                 manual_producer.send('live_transactions', value=record)
#                 st.toast(f"Đã gửi giỏ hàng Tiêu chuẩn: {fake_txn}")
#             else:
#                 st.warning("Vui lòng chọn sản phẩm!")
    
#     st.write("#### 📜 Kết quả phân tích (Tiêu chuẩn):")
#     # Placeholder này giữ nguyên để vòng lặp while True phía dưới cập nhật
#     manual_results_placeholder = st.empty()

#     st.divider() # Đường kẻ ngang chia cách

#     # =========================================================
#     # PHẦN 2: MÔ HÌNH SUPER (CHỈ HÀNG KHÁC BIỆT - XỬ LÝ TRỰC TIẾP)
#     # =========================================================
#     st.markdown("### 🚀 2. Mô hình Super (Đa Ngưỡng - Low Support)")
#     st.success("Chỉ hiển thị các sản phẩm đặc trưng (hàng hiếm/ít mua) mà mô hình Tiêu chuẩn đã bỏ sót.")
    
#     # Gọi hàm lấy danh sách sản phẩm khác biệt (hàm tui viết ở câu trước)
#     unique_products = load_super_unique_products()
    
#     if not unique_products:
#         st.warning("Không tìm thấy sản phẩm khác biệt nào. Hãy chắc chắn đã chạy mô hình Super.")
#     else:
#         col_input_super, col_btn_super = st.columns([4, 1])
#         with col_input_super:
#             selected_super = st.multiselect(
#                 "Nhặt sản phẩm vào giỏ hàng (Chỉ có ở Super):", 
#                 options=unique_products, 
#                 key="super_input"
#             )
#         with col_btn_super:
#             st.write("") 
#             st.write("")
#             if st.button("🌟 Phân tích (Super)", use_container_width=True):
#                 if selected_super:
#                     # Đọc trực tiếp file luật của Super để xử lý tức thì
#                     try:
#                         df_super = pd.read_csv('/app/associationsuper.csv')
                        
#                         # Hàm kiểm tra xem antecedent có nằm trong giỏ hàng không
#                         def is_subset(ant_str):
#                             if pd.isna(ant_str): return False
#                             ant_list = [item.strip().replace('"', '') for item in str(ant_str).split(',')]
#                             return set(ant_list).issubset(set(selected_super))
                        
#                         # Lọc các luật phù hợp
#                         matched = df_super[df_super['antecedent'].apply(is_subset)]
                        
#                         if not matched.empty:
#                             # Sắp xếp và lưu vào session_state để hiện ra màn hình
#                             matched = matched.sort_values(by=['lift', 'confidence'], ascending=[False, False])
#                             st.session_state.super_results = matched.head(5) # Lấy top 5
#                             st.toast("Đã tìm thấy gợi ý từ mô hình Super!")
#                         else:
#                             st.session_state.super_results = "Empty"
#                             st.toast("Không có luật nào khớp với giỏ hàng này.")
#                     except Exception as e:
#                         st.error(f"Lỗi đọc dữ liệu Super: {e}")
#                 else:
#                     st.warning("Vui lòng chọn sản phẩm!")

#         st.write("#### 📜 Kết quả phân tích (Super):")
#         super_results_placeholder = st.empty()
        
#         # Hiển thị kết quả Super từ session_state (hiện ra ngay lập tức không cần đợi Kafka)
#         if 'super_results' in st.session_state:
#             if isinstance(st.session_state.super_results, pd.DataFrame):
#                 display_df = st.session_state.super_results[['antecedent', 'consequent', 'confidence', 'lift']].copy()
#                 display_df.columns = ['Giỏ hàng (Đã chọn)', 'Gợi ý Mua kèm', 'Độ tự tin (Conf)', 'Độ tương quan (Lift)']
                
#                 # Làm đẹp số liệu
#                 display_df['Độ tự tin (Conf)'] = display_df['Độ tự tin (Conf)'].apply(lambda x: f"{x:.4f}")
#                 display_df['Độ tương quan (Lift)'] = display_df['Độ tương quan (Lift)'].apply(lambda x: f"{x:.4f}")
                
#                 super_results_placeholder.dataframe(display_df, hide_index=True, use_container_width=True)
#             elif st.session_state.super_results == "Empty":
#                 super_results_placeholder.info("Mô hình Super không tìm thấy gợi ý mua kèm nào cho giỏ hàng này.")




# # --- TAB 3: CLUSTERING (KẾT HỢP DATA TĨNH VÀ STREAMING NHÃN GÁN) ---
# with tab3:
#     st.subheader("🧠 Giám sát Phân loại Khách hàng Thời Gian Thực")
#     st.caption("Ứng dụng K-Means/RFM để nhận diện hành vi khách hàng đang mua sắm ngay lúc này.")
    
#     # Chia Tab 3 thành 2 cột: 1 cho Biểu đồ tròn, 1 cho Bảng dữ liệu
#     col_chart_t3, col_table_t3 = st.columns([1, 2])
#     with col_chart_t3:
#         pie_chart_placeholder = st.empty()
#     with col_table_t3:
#         vip_monitor_placeholder = st.empty()
    
#     st.divider()
#     st.write("#### 🗃️ Cấu trúc tệp khách hàng tổng thể (Batch Data)")
#     cluster_df = load_clustering_data()
#     if cluster_df is not None:
#         st.dataframe(cluster_df.head(100), use_container_width=True)
#     else:
#         st.info("Chưa tìm thấy file `clustered_users.parquet`.")

# # =========================================================
# # 4. VÒNG LẶP XỬ LÝ DỮ LIỆU STREAMING (ROUTE DỮ LIỆU ĐÚNG CHỖ)
# # =========================================================
# top_products_data = {}
# recent_auto_transactions = []
# total_txns = 0



# consumer = create_consumer()

# while True:
#     raw_msgs = consumer.poll(timeout_ms=500)
#     updated_tab1 = False
#     updated_tab2 = False
#     updated_tab3 = False
    
#     for topic_partition, messages in raw_msgs.items():
#         for msg in messages:
#             topic = msg.topic
#             data = msg.value
            
#             if not data: continue
                
#             if topic == 'top_products_stream':
#                 product = data.get("product")
#                 if product:
#                     top_products_data[product] = data.get("total_sold", 0)
#                     updated_tab1 = True
                    
#             elif topic == 'recommendation_stream':
#                 txn_no = data.get("TransactionNo", "")
                
#                 # NẾU LÀ DỮ LIỆU TỪ TAB 2 (Nhập thủ công) -> Rẽ nhánh vào Session State
#                 if txn_no.startswith("MANUAL_"):
#                     # Thêm vào đầu danh sách lịch sử Tab 2
#                     st.session_state.manual_history.insert(0, data)
#                     updated_tab2 = True
                
#                 # NẾU LÀ DỮ LIỆU TỪ SIMULATOR -> Rẽ nhánh vào Tab 1 và Tab 3
#                 else:
#                     recent_auto_transactions.insert(0, data)
#                     recent_auto_transactions = recent_auto_transactions[:15] # Lưu lại 15 dòng mới nhất
#                     total_txns += 1
#                     updated_tab1 = True
#                     updated_tab3 = True
                
#                 # THÊM LOGIC CỘNG DỒN VÀO ĐÂY:
#                 # Ưu tiên lấy 'rfm_label' từ data, nếu không có thì lấy từ 'cluster_id' và map qua CLUSTER_LABELS
#                 label = data.get('rfm_label')
#                 if not label and 'cluster_id' in data:
#                     label = CLUSTER_LABELS.get(data['cluster_id'])
                
#                 if label:
#                     st.session_state.cumulative_clusters[label] = st.session_state.cumulative_clusters.get(label, 0) + 1

#     # TIẾN HÀNH RENDER LẠI UI ĐÚNG CHỖ (KHÔNG LÀM RỐI NHAU)
    
#     # Render Tab 1 (Streaming thuần)
#     if updated_tab1:
#         txn_count_placeholder.metric(label="Tổng GD Tự Động Đã Xử Lý", value=total_txns)
#         if top_products_data:
#             df_top = pd.DataFrame(list(top_products_data.items()), columns=['Sản phẩm', 'Số lượng']).sort_values(by='Số lượng', ascending=False).head(10)
#             chart_placeholder.bar_chart(df_top.set_index('Sản phẩm'))
            
#         if recent_auto_transactions:
#             df_trans = pd.DataFrame(recent_auto_transactions)
#             df_trans['items'] = df_trans['items'].apply(lambda x: ", ".join(x) if isinstance(x, list) else x)
#             df_trans['prediction'] = df_trans['prediction'].apply(lambda x: ", ".join(x) if isinstance(x, list) and x else "Không có")
#             df_trans = df_trans[['TransactionNo', 'CustomerNo','items', 'prediction']].rename(columns={"TransactionNo": "Mã Giao Dịch", "CustomerNo": "Mã Khách Hàng", "items": "Giỏ Hàng", "prediction": "Gợi Ý"})
#             table_placeholder.dataframe(df_trans, hide_index=True, use_container_width=True)

#     # Render Tab 2 (Lịch sử Nhập Thủ Công)
#     if updated_tab2 and st.session_state.manual_history:
#         df_manual = pd.DataFrame(st.session_state.manual_history)
#         df_manual['items'] = df_manual['items'].apply(lambda x: ", ".join(x) if isinstance(x, list) else x)
#         df_manual['prediction'] = df_manual['prediction'].apply(lambda x: ", ".join(x) if isinstance(x, list) and x else "Không tìm thấy gợi ý")
#         df_manual = df_manual[['TransactionNo', 'items', 'prediction']].rename(columns={"TransactionNo": "Mã GD", "items": "Giỏ hàng bạn chọn", "prediction": "Spark Gợi ý mua kèm"})
#         manual_results_placeholder.dataframe(df_manual, hide_index=True, use_container_width=True)

#     # Render Tab 3 (Real-time Clustering Monitor & RFM Pie Chart)
#     if updated_tab3 and recent_auto_transactions:
#         df_rfm_raw = pd.DataFrame(recent_auto_transactions)
        
#         # Điền dữ liệu giả nếu topic recommendation_stream chưa gửi các field này
#         for col in ['monetary_val', 'frequency_val', 'recency_val', 'rfm_label']:
#             if col not in df_rfm_raw.columns:
#                 if col == 'monetary_val': df_rfm_raw[col] = [round(random.uniform(50, 1000), 2) for _ in range(len(df_rfm_raw))]
#                 elif col == 'frequency_val': df_rfm_raw[col] = [random.randint(1, 20) for _ in range(len(df_rfm_raw))]
#                 elif col == 'recency_val': df_rfm_raw[col] = [random.randint(1, 30) for _ in range(len(df_rfm_raw))]
#                 elif col == 'rfm_label': df_rfm_raw[col] = [CLUSTER_LABELS.get(random.choice([0,1,2,3])) for _ in range(len(df_rfm_raw))]

#         # Lọc ra các cột RFM như yêu cầu
#         df_rfm = df_rfm_raw[['TransactionNo', 'CustomerNo','monetary_val', 'frequency_val', 'recency_val', 'rfm_label']]
#         df_rfm.columns = ['Mã Giao Dịch', 'Mã Khách Hàng', 'Tổng Chi Tiêu ($)', 'Tần Suất', 'Độ Trễ', 'Phân Loại K-Means']
        
#         # 1. Vẽ DataFrame
#         def highlight_vip(val):
#             # Lấy màu khớp chính xác với nhãn từ COLOR_MAP ở đầu file
#             # Nếu vì lý do gì đó bị lỗi không có nhãn, để mặc định là màu xám (#D3D3D3)
#             color = COLOR_MAP.get(val, '#D3D3D3')
#             return f'background-color: {color}; color: black; font-weight: bold'
            
#         styled_df = df_rfm.style.applymap(highlight_vip, subset=['Phân Loại K-Means'])
#         vip_monitor_placeholder.dataframe(styled_df, hide_index=True, use_container_width=True)

#         # 2. Vẽ Biểu Đồ Tròn (Pie Chart) - DÙNG DỮ LIỆU CỘNG DỒN
#         # Chuyển dictionary cộng dồn sang DataFrame để Plotly hiểu
#         df_cumulative = pd.DataFrame(
#             list(st.session_state.cumulative_clusters.items()), 
#             columns=['Nhãn', 'Số Lượng']
#         )
        
#         fig = px.pie(
#             df_cumulative, # Dùng dữ liệu tích lũy từ lúc chạy app
#             values='Số Lượng', 
#             names='Nhãn', 
#             title='Tỉ lệ Cụm Khách Hàng (Tích lũy toàn thời gian)',
#             hole=0.4,
#             color='Nhãn',
#             color_discrete_map=COLOR_MAP
#         )
#         pie_chart_placeholder.plotly_chart(fig, width="stretch", key=str(uuid.uuid4()))
    
#     time.sleep(0.2)