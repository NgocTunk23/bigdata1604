import { useState, useEffect } from "react";

export function useKafkaStream() {
  const [streamData, setStreamData] = useState<any[]>([]); // Cho biểu đồ line
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]); // Cho Tab Clustering

  useEffect(() => {
    // Kết nối tới FastAPI WebSocket thông qua Vite proxy
    const ws = new WebSocket(`ws://${window.location.host}/ws/stream`);

    ws.onopen = () => console.log("🟢 Đã kết nối WebSocket tới FastAPI");

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // Phân loại dữ liệu dựa theo topic từ Kafka
        if (payload.topic === "top_products_stream") {
          // Cập nhật Top Products (gắn thẳng data từ payload)
          setTopProducts(payload.data || []);
        } else if (payload.topic === "recommendation_stream") {
          const data = payload.data;

          if (data) {
            // 1. Cập nhật luồng giao dịch (cho Dashboard 1)
            setStreamData((prev) => {
              const updated = [
                ...prev,
                { time: Date.now(), value: data.total_amount || 1 },
              ];
              return updated.slice(-20); // Giữ lại 20 điểm dữ liệu mới nhất cho biểu đồ mượt
            });

            // 2. Cập nhật giao dịch cho Clustering (Tab 4)
            setTransactions((prev) => [data, ...prev].slice(0, 15));
          }
        }
      } catch (error) {
        console.error("Lỗi parse JSON từ WebSocket:", error);
      }
    };

    ws.onclose = () => console.log("🔴 Đã ngắt kết nối WebSocket");

    return () => ws.close();
  }, []);

  return { streamData, topProducts, transactions };
}
