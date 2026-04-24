import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ShoppingCart,
  DollarSign,
  Users,
  TrendingUp,
  Package,
} from "lucide-react";

// Định nghĩa cấu trúc dữ liệu nhận từ Kafka qua WebSocket
interface StreamData {
  time: number;
  value: number;
}

interface ProductData {
  name: string;
  sales: number;
}

interface Dashboard1Props {
  streamData: StreamData[];
  topProducts: ProductData[];
}

export function Dashboard1({ streamData, topProducts }: Dashboard1Props) {
  // State quản lý các chỉ số KPI tích lũy
  const [kpis, setKpis] = useState({
    totalOrders: 12847,
    revenue: 2847500,
    customers: 8934,
    aov: 319,
    products: 1247,
  });

  // Cập nhật các chỉ số KPI mỗi khi có dữ liệu mới đổ về từ luồng Kafka
  useEffect(() => {
    if (streamData.length > 0) {
      const latestTransaction = streamData[streamData.length - 1];
      setKpis((prev) => {
        const newOrders = prev.totalOrders + 1;
        const newRevenue = prev.revenue + latestTransaction.value;
        return {
          ...prev,
          totalOrders: newOrders,
          revenue: newRevenue,
          aov: Math.floor(newRevenue / newOrders),
        };
      });
    }
  }, [streamData]);

  return (
    <div className="space-y-6">
      {/* Hàng thẻ KPI với hiệu ứng Glassmorphism */}
      <div className="grid grid-cols-5 gap-4">
        {/* Tổng đơn hàng */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 backdrop-blur-sm">
                <ShoppingCart className="size-5 text-blue-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-green-600" />
                <span
                  className="text-green-600"
                  style={{ fontSize: "0.75rem", fontWeight: 600 }}
                >
                  +12%
                </span>
              </div>
            </div>
            <p
              className="text-slate-600 mb-1.5"
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              TỔNG ĐƠN HÀNG
            </p>
            <h3
              className="text-slate-900"
              style={{ fontSize: "1.875rem", fontWeight: 700 }}
            >
              {kpis.totalOrders.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Doanh thu */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg">
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 backdrop-blur-sm">
                <DollarSign className="size-5 text-emerald-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-green-600" />
                <span
                  className="text-green-600"
                  style={{ fontSize: "0.75rem", fontWeight: 600 }}
                >
                  +18%
                </span>
              </div>
            </div>
            <p
              className="text-slate-600 mb-1.5"
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              DOANH THU
            </p>
            <h3
              className="text-slate-900"
              style={{ fontSize: "1.875rem", fontWeight: 700 }}
            >
              {(kpis.revenue / 1000000).toFixed(2)}M
            </h3>
          </div>
        </div>

        {/* Khách hàng */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg">
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 backdrop-blur-sm">
                <Users className="size-5 text-purple-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-green-600" />
                <span
                  className="text-green-600"
                  style={{ fontSize: "0.75rem", fontWeight: 600 }}
                >
                  +8%
                </span>
              </div>
            </div>
            <p
              className="text-slate-600 mb-1.5"
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              KHÁCH HÀNG
            </p>
            <h3
              className="text-slate-900"
              style={{ fontSize: "1.875rem", fontWeight: 700 }}
            >
              {kpis.customers.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* AOV */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg">
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-orange-500/20 backdrop-blur-sm">
                <TrendingUp className="size-5 text-orange-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-green-600" />
                <span
                  className="text-green-600"
                  style={{ fontSize: "0.75rem", fontWeight: 600 }}
                >
                  +5%
                </span>
              </div>
            </div>
            <p
              className="text-slate-600 mb-1.5"
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              AOV
            </p>
            <h3
              className="text-slate-900"
              style={{ fontSize: "1.875rem", fontWeight: 700 }}
            >
              {kpis.aov.toLocaleString()}k
            </h3>
          </div>
        </div>

        {/* Sản phẩm */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-sky-500/10 backdrop-blur-sm border border-white/20 p-5 shadow-lg">
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 backdrop-blur-sm">
                <Package className="size-5 text-cyan-600" />
              </div>
            </div>
            <p
              className="text-slate-600 mb-1.5"
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              SẢN PHẨM
            </p>
            <h3
              className="text-slate-900"
              style={{ fontSize: "1.875rem", fontWeight: 700 }}
            >
              {kpis.products.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Biểu đồ theo dõi luồng giao dịch thời gian thực */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3
              className="text-slate-900 flex items-center gap-2"
              style={{ fontWeight: 600, fontSize: "1.25rem" }}
            >
              Dữ liệu luồng giao dịch
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
                <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                <span
                  className="text-red-600"
                  style={{ fontSize: "0.75rem", fontWeight: 600 }}
                >
                  STREAMING
                </span>
              </div>
            </h3>
            <p className="text-slate-500 mt-1" style={{ fontSize: "0.875rem" }}>
              Dữ liệu giao dịch trực tiếp từ Kafka
            </p>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={streamData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="time"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={false}
              />
              <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  borderRadius: "0.75rem",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bảng xếp hạng Top 10 sản phẩm dựa trên dữ liệu thực */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <h3
            className="text-slate-900"
            style={{ fontWeight: 600, fontSize: "1.25rem" }}
          >
            Top 10 Sản phẩm bán chạy nhất
          </h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span
              className="text-red-600"
              style={{ fontSize: "0.75rem", fontWeight: 600 }}
            >
              LIVE ANALYSIS
            </span>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" tick={{ fill: "#64748B", fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#64748B", fontSize: 11 }}
                width={180}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  borderRadius: "0.75rem",
                }}
              />
              <Bar dataKey="sales" fill="#FDE047" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
