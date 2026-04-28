import { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
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
  const [topProducts, setTopProducts] = useState<{ name: string; sales: number }[]>([]);

  // Dùng useRef để lưu trữ dữ liệu tính toán ngầm nhằm tránh re-render giật lag
  const uniqueCustomers = useRef(new Set<string>());
  const productSales = useRef<Record<string, number>>({});

  useEffect(() => {
    // KẾT NỐI WEBSOCKET - Lưu ý: Chỉnh lại port 8000 hoặc 8001 cho đúng với backend của bạn
    const ws = new WebSocket('ws://localhost:8001/ws/dashboard');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Bỏ qua nếu dữ liệu không phải là 1 giao dịch hợp lệ
        if (!data.TransactionNo) return;

        // 1. Xử lý cột Basket (Giỏ hàng)
        let basketItems: string[] = [];
        if (Array.isArray(data.Basket)) {
            basketItems = data.Basket;
        } else if (typeof data.Basket === 'string') {
            try {
                basketItems = JSON.parse(data.Basket.replace(/'/g, '"'));
            } catch {
                basketItems = data.Basket.split(',').map((item: string) => item.trim());
            }
        }

        // Lấy thông tin từ giao dịch hiện tại
        const orderValue = data.TotalOrderValue || 0;
        const customerId = data.CustomerNo || data.CustomerID;
        const totalItems = data.TotalItems || basketItems.length;

        // Đếm số lượng khách hàng Unique
        if (customerId) {
            uniqueCustomers.current.add(String(customerId));
        }

        // 2. Cập nhật dữ liệu cho biểu đồ Bar Chart (Top Products)
        basketItems.forEach(item => {
            if (!productSales.current[item]) {
                productSales.current[item] = 0;
            }
            productSales.current[item] += 1;
        });

        // Sắp xếp lấy Top 10
        const sortedTop = Object.entries(productSales.current)
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10);

        setTopProducts(sortedTop);

        // 3. Tính toán và nảy số cho các ô KPI
        setKpis(prev => {
          const newTotalOrders = prev.totalOrders + 1;
          const newRevenue = prev.revenue + orderValue;
          return {
            totalOrders: newTotalOrders,
            revenue: newRevenue,
            customers: uniqueCustomers.current.size,
            aov: newTotalOrders > 0 ? newRevenue / newTotalOrders : 0,
            products: prev.products + totalItems,
          };
        });

        // 4. Cập nhật biểu đồ Line Chart (Giữ tối đa 20 điểm trên màn hình để không lag)
        setStreamData(prev => {
          const now = new Date();
          const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
          const newPoint = { time: timeStr, value: orderValue };
          return [...prev, newPoint].slice(-20); 
        });

      } catch (err) {
        console.error("Lỗi parse dữ liệu WebSocket:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* 1. Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">E-commerce Real-time Analytics</h1>
          <p className="text-slate-500">Giám sát hiệu suất bán hàng và luồng giao dịch trực tiếp</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full border border-red-100 shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-sm font-bold tracking-wider">LIVE STREAMING</span>
        </div>
      </div>

      {/* 2. KPI Cards Grid - Các ô hiển thị chỉ số */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Orders */}
        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <ShoppingCart className="size-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Live</span>
          </div>
          <p className="text-sm font-medium text-slate-500">Tổng đơn hàng</p>
          <h3 className="text-2xl font-bold text-slate-800">{kpis.totalOrders.toLocaleString()}</h3>
        </div>

        {/* Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <DollarSign className="size-6 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Live</span>
          </div>
          <p className="text-sm font-medium text-slate-500">Doanh thu (USD)</p>
          <h3 className="text-2xl font-bold text-slate-800">
            ${kpis.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="size-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Khách hàng</p>
          <h3 className="text-2xl font-bold text-slate-800">{kpis.customers.toLocaleString()}</h3>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <TrendingUp className="size-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Giá trị TB đơn</p>
          <h3 className="text-2xl font-bold text-slate-800">
            ${kpis.aov.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
        </div>

        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-rose-50 rounded-lg">
              <Package className="size-6 text-rose-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Số lượng SP đã bán</p>
          <h3 className="text-2xl font-bold text-slate-800">{kpis.products.toLocaleString()}</h3>
        </div>
      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Top Products */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Package className="size-5 text-blue-500" />
            Top 10 Sản phẩm bán chạy nhất
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fill: '#64748B', fontSize: 12 }} 
                width={150}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="sales" radius={[0, 4, 4, 0]} barSize={20}>
                {topProducts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart - Revenue Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="size-5 text-emerald-500" />
            Biến động doanh thu theo thời gian
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={streamData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#10B981" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}