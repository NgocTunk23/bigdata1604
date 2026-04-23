import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, LineChart, Line 
} from 'recharts';
import { ShoppingBag, DollarSign, Users, Package, Activity } from "lucide-react";

export default function Dashboard() {
  // --- STATE QUẢN LÝ DỮ LIỆU THẬT ---
  const [metrics, setMetrics] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lineData, setLineData] = useState<any[]>([]);
  const topProductsRef = useRef<any>({}); // Dùng Ref để lưu trữ tạm bộ đếm sản phẩm

  useEffect(() => {
    // 1. Poll metric cards để tự cập nhật liên tục
    const fetchMetrics = () => {
      axios.get("http://localhost:8000/api/v1/dashboard/metrics")
        .then(res => setMetrics(res.data))
        .catch(err => console.error("Lỗi lấy metrics:", err));
    };
    fetchMetrics();
    const metricsTimer = setInterval(fetchMetrics, 5000);

    // 2. Kết nối WebSocket để lấy dữ liệu Streaming
    const socket = new WebSocket("ws://localhost:8000/ws/dashboard");

    socket.onmessage = (event) => {
      const response = JSON.parse(event.data);
      const { topic, data } = response;

      // Xử lý TOP PRODUCTS (Cập nhật cột ngang)
      if (topic === 'top_products_stream') {
        // Lưu vào object để cập nhật số lượng mới nhất
        topProductsRef.current[data.product] = data.total_sold;
        
        // Chuyển sang mảng, sắp xếp và lấy Top 10
        const sorted = Object.entries(topProductsRef.current)
          .map(([name, value]) => ({ name, value: Number(value) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
        
        setTopProducts(sorted);
      }

      // Xử lý GIAO DỊCH REAL-TIME (Cập nhật đường Line)
      if (topic === 'recommendation_stream') {
        setLineData((prev) => {
          const newData = [...prev, { 
            time: new Date().toLocaleTimeString(), 
            count: Math.floor(Math.random() * 20) + 30 // Giả lập cường độ từ Kafka
          }];
          return newData.slice(-20); // Chỉ giữ lại 20 điểm dữ liệu gần nhất
        });
      }
    };

    return () => {
      clearInterval(metricsTimer);
      socket.close();
    };
  }, []);

  return (
    <div className="min-h-screen p-6 space-y-6 bg-[#1f2228] text-[#e8edf3]">
      
      {/* SECTION 1: 4 METRIC CARDS (Dữ liệu từ API) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Tổng Giao Dịch" 
          value={metrics?.total_transactions.toLocaleString() || "..."} 
          icon={<ShoppingBag className="text-blue-400" />} 
          trend={metrics?.trends.tx || "0%"} 
        />
        <MetricCard 
          title="Doanh Thu" 
          value={`$${metrics?.revenue.toLocaleString() || "..."}`} 
          icon={<DollarSign className="text-yellow-400" />} 
          trend={metrics?.trends.rev || "0%"} 
        />
        <MetricCard 
          title="Số Khách Hàng" 
          value={metrics?.total_customers.toLocaleString() || "..."} 
          icon={<Users className="text-blue-400" />} 
          trend={metrics?.trends.cust || "0%"} 
        />
        <MetricCard 
          title="Số Sản Phẩm" 
          value={metrics?.total_products.toLocaleString() || "..."} 
          icon={<Package className="text-blue-400" />} 
          trend="Stable" 
        />
      </div>

      {/* SECTION 2: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Biểu đồ ngang cập nhật từ Kafka 'top_products_stream' */}
        <Card className="bg-[#353a44] border-[#4a6072] text-[#e8edf3]">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" /> Top 10 Sản Phẩm (Kafka Live)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 40, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a6072" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#7b9bb8" fontSize={10} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2228', border: '1px solid #4a6072' }} />
                <Bar dataKey="value" fill="#60a5fa" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Biểu đồ Line cập nhật từ Kafka 'recommendation_stream' */}
        <Card className="bg-[#353a44] border-[#4a6072] text-[#e8edf3]">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-yellow-400" /> Tần Suất Giao Dịch Real-time
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a6072" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis stroke="#7b9bb8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2228', border: '1px solid #4a6072' }} />
                <Line type="monotone" dataKey="count" stroke="#fbbf24" strokeWidth={3} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend }: any) {
  return (
    <Card className="bg-[#353a44] border-[#4a6072] text-[#e8edf3]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-bold text-[#7b9bb8] uppercase tracking-wider">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-[10px] mt-1 font-medium ${trend.includes('+') ? 'text-green-400' : 'text-gray-400'}`}>
          {trend} <span className="opacity-50">so với tháng trước</span>
        </p>
      </CardContent>
    </Card>
  );
}