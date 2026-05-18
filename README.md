# 🚀 Big Data Analytics & Recommendation System

Dự án ứng dụng phân tích dữ liệu lớn thời gian thực (Real-time Big Data), tích hợp hệ thống đề xuất sản phẩm dựa trên luật kết hợp (Association Rules) và phân cụm người dùng (Clustering). 

Hệ thống được thiết kế với giao diện Web hiện đại (Left Sidebar Navigation), cho phép theo dõi dòng chảy dữ liệu liên tục và so sánh trực quan hiệu suất giữa các thuật toán.

## 📂 Cấu trúc dự án chính

Dự án được chia thành các module chính để dễ quản lý:
- `frontend/`: Chứa mã nguồn giao diện người dùng (giao diện Tab bên trái).
- `backend/`: Chứa mã nguồn server xử lý API và streaming data.
- `algorithms/`: Chứa các file thuật toán lõi (bao gồm luật kết hợp và phân cụm).
    - `association.js`: Hàm luật sinh kết hợp cơ bản.
    - `associationsuper.js`: Hàm luật sinh kết hợp tối ưu.
- `data.parquet/` & `data/results/`: Chứa dữ liệu đầu vào và kết quả. Dữ liệu phân cụm được lưu tại `clustered_users.parquet`.
- `Docker` files: Chứa cấu hình triển khai môi trường (`Dockerfile`, `Dockerfile.backend`, `docker-compose.yml`).

## 🌟 Chức năng chính (Web App)

Giao diện hệ thống được chia thành 3 Tabs chính nằm ở Sidebar bên trái:

### Tab 1: Khám phá Dữ liệu (EDA) & Data Streaming
- **Data Streaming:** Thể hiện dòng chảy dữ liệu liên tục (streaming data) với đa dạng các cột thuộc tính, mô phỏng luồng dữ liệu lớn thực tế thay vì chỉ một vài trường cơ bản.
- **EDA (Exploratory Data Analysis):** Trực quan hóa và phân tích dữ liệu đầu vào.
    - *Lưu ý cho Developer:* Các script EDA được viết thành các file Jupyter Notebook riêng biệt. KHÔNG chỉnh sửa hoặc can thiệp vào các file code preprocessing cũ. Đảm bảo bước tiền xử lý được kiểm tra chéo tính hợp lý trước khi đưa vào luồng dữ liệu.

### Tab 2: Hệ thống Đề xuất (Association Rules Comparison)
- **Tương tác người dùng:** Hỗ trợ linh hoạt các thao tác kéo thả (drag & drop) sản phẩm vào ô, click chọn trực tiếp trên giao diện, hoặc nhập text để tìm kiếm sản phẩm.
- **So sánh Thuật toán (Normal vs. Super):**
    - Chia làm 2 phần: Thuật toán thường (`association.js`) ở trên và Thuật toán tối ưu (`associationsuper.js`) ở dưới.
    - Thuật toán Super sẽ lọc ra và chỉ hiển thị các kết quả **khác biệt** so với thuật toán thường.
- **Bảng so sánh chi tiết:** Sau khi bấm "Đề xuất", hệ thống sẽ xuất ra một bảng so sánh trực quan chỉ ra chính xác **8 hàng khác biệt** giữa kết quả chạy của 2 thuật toán.

### Tab 3: Phân cụm Người dùng (Real-time Clustering)
- **Biểu đồ tỷ lệ cộng dồn (Cumulative Pie Chart):** Trực quan hóa dữ liệu người dùng từ `clustered_users.parquet`.
- **Cơ chế Real-time cập nhật trạng thái:** Biểu đồ hiển thị phần trăm phân bổ của các cụm (VD: Cụm A, Cụm B) mang tính chất **cộng dồn liên tục** theo dòng chảy dữ liệu. 
    - *Ví dụ:* Nếu hệ thống đang có 100 User A và 100 User B (Tỷ lệ 50-50). Khi luồng dữ liệu mới đổ thêm 100 User A vào, biểu đồ sẽ cập nhật thành 66.66% User A và 33.33% User B (Dựa trên tổng 300 users), đảm bảo tính chính xác của dữ liệu lịch sử cộng dồn thay vì chỉ tính trên batch dữ liệu mới nhất.

## 🛠 Hướng dẫn Cài đặt & Chạy dự án (Local Development)

Dự án được đóng gói hoàn toàn bằng Docker, giúp việc triển khai trở nên dễ dàng.

**Yêu cầu hệ thống:**
- Đã cài đặt Docker và Docker Compose.

**Các bước khởi chạy:**
1. Clone repository về máy:
   ```bash
   git clone <link-repo-cua-ban>
   cd bigdata252
   ```
2. Build và khởi chạy các containers:
    ```bash
   docker-compose up --build
   ```
3. Truy cập ứng dụng Web:

Frontend chạy ở http://localhost:3001 (cổng cấu hình trong compose).
