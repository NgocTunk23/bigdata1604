import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Dashboard2Props {
  // trendData có thể lấy từ prop hoặc fetch từ /api/eda-data
  trendData?: any[];
}

export function Dashboard2({ trendData = [] }: Dashboard2Props) {
  const [edaData, setEdaData] = useState<any>(null);

  useEffect(() => {
    // Gọi API lấy dữ liệu EDA tĩnh từ backend
    fetch("/api/eda-data")
      .then((res) => res.json())
      .then((data) => setEdaData(data));
  }, []);

  const getHeatmapColor = (value: number) => {
    if (value < 30) return "#FFEDD5";
    if (value < 60) return "#FED7AA";
    if (value < 90) return "#FB923C";
    if (value < 120) return "#F97316";
    return "#EA580C";
  };

  return (
    <div className="space-y-6">
      {/* Xu hướng đơn hàng - Dữ liệu thực từ Prop */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-slate-900 font-semibold text-xl">
              Xu hướng đơn hàng theo ngày
            </h3>
            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider">
              Historical Analysis
            </span>
          </div>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData.length > 0 ? trendData : []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" tick={{ fill: "#64748B", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: "0.75rem" }} />
              <Bar dataKey="orders" fill="#93C5FD" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Mua sắm theo giờ */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-6">
            Mua sắm theo giờ trong ngày
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[]}>
                {" "}
                {/* Gắn hourlyData ở đây */}
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#8B5CF6"
                  fill="url(#colorHours)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mua sắm theo thứ */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-6">
            Mua sắm theo thứ trong tuần
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#86EFAC" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
