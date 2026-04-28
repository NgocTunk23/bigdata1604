import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Cell } from 'recharts';
import { ShoppingCart, DollarSign, Users, TrendingUp, Package } from 'lucide-react';

interface StreamData {
  time: string;
  value: number;
}

// Bảng màu cho các cột biểu đồ
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1'];

export function Dashboard1() {
  const [streamData, setStreamData] = useState<StreamData[]>([]);
  const [kpis, setKpis] = useState({
    totalOrders: 0,
    revenue: 0,
    customers: 0,
    aov: 0,
    products: 0,
  });
  // Khởi tạo mảng rỗng để chỉ hiện sản phẩm thực tế từ stream
  const [topProducts, setTopProducts] = useState<{ name: string; sales: number }[]>([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8001/ws/dashboard');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      const transactionValue = data.TotalOrderValue || 0;
      const itemsCount = data.TotalItems || (Array.isArray(data.Basket) ? data.Basket.length : 1);

      setKpis((prev) => {
        const newTotalOrders = prev.totalOrders + 1;
        const newRevenue = prev.revenue + transactionValue;
        return {
          totalOrders: newTotalOrders,
          revenue: newRevenue,
          customers: prev.customers + (data.CustomerNo ? 1 : 0),
          aov: Math.round(newRevenue / newTotalOrders),
          products: prev.products + itemsCount,
        };
      });

      const now = new Date();
      const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
      setStreamData((prev) => {
        const updated = [...prev, { time: timeStr, value: transactionValue }];
        return updated.slice(-20);
      });

      if (Array.isArray(data.Basket)) {
        setTopProducts((prev) => {
          let updated = [...prev];
          data.Basket.forEach((item: string) => {
            const productIdx = updated.findIndex((p) => p.name === item);
            if (productIdx !== -1) {
              updated[productIdx].sales += 1;
            } else {
              // Thêm sản phẩm mới nếu chưa có trong danh sách
              updated.push({ name: item, sales: 1 });
            }
          });
          // Sắp xếp và lấy tối đa 10 sản phẩm thực tế
          return updated.sort((a, b) => b.sales - a.sales).slice(0, 10);
        });
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI Cards giữ nguyên giao diện */}
      <div className="grid grid-cols-5 gap-4">
        {/* ... (Các card KPI tương tự như bản trước) */}
      </div>

      {/* Biểu đồ luồng giao dịch */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-slate-900 text-xl font-semibold mb-6 flex items-center gap-2">
          Dữ liệu giao dịch
          <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-full animate-pulse border border-red-200">LIVE</span>
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={streamData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="time" tick={{ fill: '#64748B', fontSize: 12 }}>
              <Label value="Thời gian (Giờ:Phút:Giây)" offset={-20} position="insideBottom" fill="#64748B" />
            </XAxis>
            <YAxis tick={{ fill: '#64748B', fontSize: 12 }}>
              <Label value="Giá trị (Bảng Anh)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fill="#64748B" />
            </YAxis>
            <Tooltip />
            <Line type="linear" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={true} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Biểu đồ Top Sản phẩm */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-slate-900 text-xl font-semibold mb-6 flex items-center gap-2">Top Sản phẩm bán chạy
           <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-full animate-pulse border border-red-200">LIVE</span>
        </h3>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis type="number">
              <Label value="Số lượng bán ra" offset={-15} position="insideBottom" fill="#64748B" />
            </XAxis>
            <YAxis 
              type="category" 
              dataKey="name" 
              // 1. Tăng fontSize từ 10 lên 14 hoặc 16 tùy nhu cầu
              tick={{ fill: '#64748B', fontSize: 14, fontWeight: 500 }} 
              // 2. Tăng width từ 150 lên 200 để có không gian cho chữ to
              width={200} 
            >
              <Label 
                value="Tên sản phẩm" 
                angle={-90} 
                position="insideLeft" 
                // Tăng kích thước tiêu đề trục nếu muốn
                style={{ textAnchor: 'middle', fontSize: '18px', fill: '#64748B' }} 
              />
            </YAxis>
            <Tooltip />
            <Bar dataKey="sales" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {topProducts.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
