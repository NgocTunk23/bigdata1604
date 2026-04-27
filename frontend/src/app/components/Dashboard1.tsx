import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart, DollarSign, Users, TrendingUp, Package } from 'lucide-react';
import { getTopProducts, ALL_PRODUCTS } from '../utils/productData';

interface StreamData {
  time: number;
  value: number;
}

// Get top 10 products from association rules data
const INITIAL_PRODUCTS = getTopProducts(10);

export function Dashboard1() {
  const [streamData, setStreamData] = useState<StreamData[]>(
    Array.from({ length: 20 }, (_, i) => ({
      time: i,
      value: Math.floor(Math.random() * 500) + 300,
    }))
  );
  const [kpis, setKpis] = useState({
    totalOrders: 12847,
    revenue: 2847500,
    customers: 8934,
    aov: 319,
    products: 1247,
  });
  const [topProducts, setTopProducts] = useState(INITIAL_PRODUCTS);
  const timeRef = useRef(20);

  useEffect(() => {
    // Stream data - real-time (every 2 seconds)
    const streamInterval = setInterval(() => {
      setStreamData((prev) => {
        const newValue = Math.floor(Math.random() * 500) + 300;
        const updated = [...prev.slice(1), { time: timeRef.current, value: newValue }];
        timeRef.current += 1;
        return updated;
      });

      setKpis((prev) => ({
        totalOrders: prev.totalOrders + Math.floor(Math.random() * 3),
        revenue: prev.revenue + Math.floor(Math.random() * 5000),
        customers: prev.customers + Math.floor(Math.random() * 2),
        aov: Math.floor((prev.revenue + Math.floor(Math.random() * 5000)) / (prev.totalOrders + Math.floor(Math.random() * 3))),
        products: prev.products,
      }));
    }, 2000);

    // Top products - fast stream update (every 3 seconds)
    const productsInterval = setInterval(() => {
      setTopProducts((prev) =>
        prev.map((product) => ({
          ...product,
          sales: product.sales + Math.floor(Math.random() * 5),
        })).sort((a, b) => b.sales - a.sales)
      );
    }, 3000);

    return () => {
      clearInterval(streamInterval);
      clearInterval(productsInterval);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI Cards with Glassmorphism */}
      <div className="grid grid-cols-5 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 backdrop-blur-sm">
                <ShoppingCart className="size-5 text-blue-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-green-600" />
                <span className="text-green-600" style={{ fontSize: '0.75rem', fontWeight: 600 }}>+12%</span>
              </div>
            </div>
            <p className="text-slate-600 mb-1.5" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>TỔNG ĐƠN HÀNG</p>
            <h3 className="text-slate-900" style={{ fontSize: '1.875rem', fontWeight: 700 }}>
              {kpis.totalOrders.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 backdrop-blur-sm">
                <DollarSign className="size-5 text-emerald-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-green-600" />
                <span className="text-green-600" style={{ fontSize: '0.75rem', fontWeight: 600 }}>+18%</span>
              </div>
            </div>
            <p className="text-slate-600 mb-1.5" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>DOANH THU</p>
            <h3 className="text-slate-900" style={{ fontSize: '1.875rem', fontWeight: 700 }}>
              {(kpis.revenue / 1000000).toFixed(2)}M
            </h3>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-purple-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 backdrop-blur-sm">
                <Users className="size-5 text-purple-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-green-600" />
                <span className="text-green-600" style={{ fontSize: '0.75rem', fontWeight: 600 }}>+8%</span>
              </div>
            </div>
            <p className="text-slate-600 mb-1.5" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>KHÁCH HÀNG</p>
            <h3 className="text-slate-900" style={{ fontSize: '1.875rem', fontWeight: 700 }}>
              {kpis.customers.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-orange-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-orange-500/20 backdrop-blur-sm">
                <TrendingUp className="size-5 text-orange-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-green-600" />
                <span className="text-green-600" style={{ fontSize: '0.75rem', fontWeight: 600 }}>+5%</span>
              </div>
            </div>
            <p className="text-slate-600 mb-1.5" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>AOV</p>
            <h3 className="text-slate-900" style={{ fontSize: '1.875rem', fontWeight: 700 }}>
              {kpis.aov.toLocaleString()}k
            </h3>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-sky-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 rounded-full bg-cyan-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 backdrop-blur-sm">
                <Package className="size-5 text-cyan-600" />
              </div>
            </div>
            <p className="text-slate-600 mb-1.5" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>SẢN PHẨM</p>
            <h3 className="text-slate-900" style={{ fontSize: '1.875rem', fontWeight: 700 }}>
              {kpis.products.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Streaming Data Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-slate-900 flex items-center gap-2" style={{ fontWeight: 600, fontSize: '1.25rem' }}>
              Dữ liệu luồng giao dịch
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
                <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-600" style={{ fontSize: '0.75rem', fontWeight: 600 }}>STREAMING</span>
              </div>
            </h3>
            <p className="text-slate-500 mt-1" style={{ fontSize: '0.875rem' }}>Theo dõi giao dịch thời gian thực</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={streamData}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis 
              key="xaxis" 
              dataKey="time" 
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: '#64748B', fontSize: 12 }} 
            />
            <YAxis key="yaxis" tick={{ fill: '#64748B', fontSize: 12 }} />
            <Tooltip
              key="tooltip"
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Line
              key="line"
              type="linear"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 Products */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-slate-900" style={{ fontWeight: 600, fontSize: '1.25rem' }}>
            Top 10 Sản phẩm bán chạy nhất
          </h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-600" style={{ fontSize: '0.75rem', fontWeight: 600 }}>STREAMING</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topProducts} layout="vertical">
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis key="xaxis" type="number" tick={{ fill: '#64748B', fontSize: 12 }} />
            <YAxis key="yaxis" type="category" dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} width={240} />
            <Tooltip
              key="tooltip"
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Bar key="bar" dataKey="sales" fill="#FDE047" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
