import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart, DollarSign, Users, TrendingUp, Package } from 'lucide-react';
import { getTopProducts } from '../utils/productData';

interface StreamData {
  time: string;
  value: number;
}

export function Dashboard1() {
  const [streamData, setStreamData] = useState<StreamData[]>([]);
  const [kpis, setKpis] = useState({
    totalOrders: 0,
    revenue: 0,
    customers: 0,
    aov: 0,
    products: 0,
  });
  const [topProducts, setTopProducts] = useState(getTopProducts(10).map(p => ({...p, sales: 0})));

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8001/ws/dashboard');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Sử dụng đúng các trường từ schema Parquet của bạn
      const transactionValue = data.TotalOrderValue || 0;
      const itemsCount = data.TotalItems || (Array.isArray(data.Basket) ? data.Basket.length : 1);

      // Cập nhật KPIs
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

      // Cập nhật biểu đồ luồng thời gian thực
      const now = new Date();
      const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
      setStreamData((prev) => {
        const updated = [...prev, { time: timeStr, value: transactionValue }];
        return updated.slice(-20); // Giữ 20 điểm gần nhất
      });

      // Cập nhật Top 10 sản phẩm từ trường Basket
      if (Array.isArray(data.Basket)) {
        setTopProducts((prev) => {
          const updated = [...prev];
          data.Basket.forEach((item: string) => {
            const productIdx = updated.findIndex((p) => p.name === item);
            if (productIdx !== -1) {
              updated[productIdx].sales += 1;
            } else if (updated.length < 10) {
              // Đã fix lỗi TS2353 ở đây (chỉ push name và sales)
              updated.push({ name: item, sales: 1 });
            }
          });
          return updated.sort((a, b) => b.sales - a.sales).slice(0, 10);
        });
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI Cards (Giao diện giữ nguyên, chỉ thay đổi kpis state) */}
      <div className="grid grid-cols-5 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 backdrop-blur-sm">
                <ShoppingCart className="size-5 text-blue-600" />
              </div>
            </div>
            <p className="text-slate-600 mb-1.5 text-xs font-semibold tracking-wider">TỔNG ĐƠN HÀNG</p>
            <h3 className="text-slate-900 text-3xl font-bold">{kpis.totalOrders.toLocaleString()}</h3>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 backdrop-blur-sm">
                <DollarSign className="size-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-slate-600 mb-1.5 text-xs font-semibold tracking-wider">DOANH THU</p>
            <h3 className="text-slate-900 text-3xl font-bold">{(kpis.revenue / 1000).toFixed(1)}K</h3>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-purple-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 backdrop-blur-sm">
                <Users className="size-5 text-purple-600" />
              </div>
            </div>
            <p className="text-slate-600 mb-1.5 text-xs font-semibold tracking-wider">KHÁCH HÀNG</p>
            <h3 className="text-slate-900 text-3xl font-bold">{kpis.customers.toLocaleString()}</h3>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-orange-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-orange-500/20 backdrop-blur-sm">
                <TrendingUp className="size-5 text-orange-600" />
              </div>
            </div>
            <p className="text-slate-600 mb-1.5 text-xs font-semibold tracking-wider">AOV</p>
            <h3 className="text-slate-900 text-3xl font-bold">{kpis.aov.toLocaleString()}</h3>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-sky-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-cyan-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 backdrop-blur-sm">
                <Package className="size-5 text-cyan-600" />
              </div>
            </div>
            <p className="text-slate-600 mb-1.5 text-xs font-semibold tracking-wider">SẢN PHẨM</p>
            <h3 className="text-slate-900 text-3xl font-bold">{kpis.products.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Streaming Data Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-slate-900 flex items-center gap-2 text-xl font-semibold">
              Dữ liệu luồng giao dịch
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
                <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-600 text-xs font-semibold">LIVE</span>
              </div>
            </h3>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={streamData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="time" tick={{ fill: '#64748B', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
            <Tooltip />
            <Line type="linear" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={true} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 Products */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-slate-900 text-xl font-semibold">Top 10 Sản phẩm bán chạy nhất</h3>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topProducts} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis type="number" tick={{ fill: '#64748B', fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} width={240} />
            <Tooltip />
            <Bar dataKey="sales" fill="#FDE047" radius={[0, 8, 8, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}