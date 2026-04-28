import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';

// Khởi tạo khung dữ liệu rỗng chuẩn format
const initHoursData = () => Array.from({ length: 12 }, (_, i) => ({ hour: `${i * 2}h`, count: 0 }));
const initWeekdayData = () => [
  { day: 'Thứ 2', orders: 0 }, { day: 'Thứ 3', orders: 0 }, { day: 'Thứ 4', orders: 0 },
  { day: 'Thứ 5', orders: 0 }, { day: 'Thứ 6', orders: 0 }, { day: 'Thứ 7', orders: 0 }, { day: 'Chủ nhật', orders: 0 }
];
const initHeatmapData = () => [
  { day: 'T2', hours: Array(24).fill(0) }, { day: 'T3', hours: Array(24).fill(0) }, { day: 'T4', hours: Array(24).fill(0) },
  { day: 'T5', hours: Array(24).fill(0) }, { day: 'T6', hours: Array(24).fill(0) }, { day: 'T7', hours: Array(24).fill(0) },
  { day: 'CN', hours: Array(24).fill(0) }
];

const getHeatmapColor = (value: number) => {
  if (value === 0) return '#f8fafc';
  if (value < 5) return '#FFEDD5';
  if (value < 15) return '#FED7AA';
  if (value < 30) return '#FB923C';
  if (value < 50) return '#F97316';
  return '#EA580C';
};

export function Dashboard2() {
  const [trendData, setTrendData] = useState<{ day: number; orders: number }[]>([]);
  const [hoursData, setHoursData] = useState(initHoursData());
  const [weekdayData, setWeekdayData] = useState(initWeekdayData());
  const [heatmapData, setHeatmapData] = useState(initHeatmapData());

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8001/ws/dashboard');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Lấy thời gian từ trường 'Date' trong schema của bạn
      const recordDateStr = data.Date;
      if (!recordDateStr) return; // Bỏ qua nếu không có ngày tháng

      const dateObj = new Date(recordDateStr);
      
      const dayOfMonth = dateObj.getDate();
      const currentHour = dateObj.getHours();
      // Map về [T2, T3, T4, T5, T6, T7, CN] (index 0->6)
      const dayOfWeekIdx = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1; 

      // 1. Cập nhật Trend Data
      setTrendData(prev => {
        const existing = prev.find(p => p.day === dayOfMonth);
        if (existing) {
          return prev.map(p => p.day === dayOfMonth ? { ...p, orders: p.orders + 1 } : p);
        } else {
          const updated = [...prev, { day: dayOfMonth, orders: 1 }];
          return updated.length > 30 ? updated.slice(-30) : updated;
        }
      });

      // 2. Cập nhật Hours Data
      const hourIndex = Math.floor(currentHour / 2);
      setHoursData(prev => prev.map((item, i) => i === hourIndex ? { ...item, count: item.count + 1 } : item));

      // 3. Cập nhật Weekday Data
      setWeekdayData(prev => prev.map((item, i) => i === dayOfWeekIdx ? { ...item, orders: item.orders + 1 } : item));

      // 4. Cập nhật Heatmap Data
      setHeatmapData(prev => {
        const updated = [...prev];
        updated[dayOfWeekIdx].hours[currentHour] += 1;
        return updated;
      });
    };

    return () => ws.close();
  }, []);

  return (
    <div className="space-y-6">
      {/* Trend Data */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-slate-900 text-xl font-semibold">Xu hướng đơn hàng theo ngày</h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-600 text-xs font-semibold">LIVE</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="orders" fill="#93C5FD" radius={[8, 8, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Hours Data */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 text-xl font-semibold mb-6">Mua sắm theo giờ trong ngày</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={hoursData}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="hour" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekday Data */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 text-xl font-semibold mb-6">Mua sắm theo thứ trong tuần</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weekdayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="orders" fill="#86EFAC" radius={[8, 8, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap Data */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-slate-900 text-xl font-semibold mb-6">Bản đồ nhiệt: Mật độ mua sắm (Thứ × Giờ)</h3>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex gap-1">
              <div className="flex flex-col gap-1 pt-8">
                {heatmapData.map((row, idx) => (
                  <div key={idx} className="h-12 flex items-center justify-end pr-3 text-sm font-medium text-slate-500">
                    {row.day}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-1 mb-1">
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} className="w-12 h-7 flex items-center justify-center text-xs font-medium text-slate-500">
                      {i}h
                    </div>
                  ))}
                </div>
                {heatmapData.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex gap-1 mb-1">
                    {row.hours.map((value, colIdx) => (
                      <div
                        key={colIdx}
                        className="w-12 h-12 rounded-lg transition-all duration-200 hover:scale-110 flex items-center justify-center group relative"
                        style={{ backgroundColor: getHeatmapColor(value) }}
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-700 text-xs font-semibold drop-shadow-md">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}