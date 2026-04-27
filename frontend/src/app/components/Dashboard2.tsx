import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';

const INITIAL_HOURS_DATA = [
  { hour: '0h', count: 45 },
  { hour: '2h', count: 32 },
  { hour: '4h', count: 28 },
  { hour: '6h', count: 67 },
  { hour: '8h', count: 145 },
  { hour: '10h', count: 198 },
  { hour: '12h', count: 234 },
  { hour: '14h', count: 212 },
  { hour: '16h', count: 187 },
  { hour: '18h', count: 245 },
  { hour: '20h', count: 289 },
  { hour: '22h', count: 156 },
];

const INITIAL_WEEKDAY_DATA = [
  { day: 'Thứ 2', orders: 342 },
  { day: 'Thứ 3', orders: 387 },
  { day: 'Thứ 4', orders: 425 },
  { day: 'Thứ 5', orders: 398 },
  { day: 'Thứ 6', orders: 467 },
  { day: 'Thứ 7', orders: 523 },
  { day: 'Chủ nhật', orders: 489 },
];

const HEATMAP_DATA = [
  { day: 'T2', hours: [12, 15, 18, 24, 45, 67, 89, 98, 87, 76, 65, 54, 78, 92, 103, 98, 87, 112, 124, 98, 76, 54, 32, 18] },
  { day: 'T3', hours: [15, 18, 21, 28, 52, 74, 95, 105, 92, 81, 70, 59, 84, 98, 110, 105, 94, 118, 130, 105, 83, 61, 39, 22] },
  { day: 'T4', hours: [18, 22, 26, 34, 58, 82, 102, 112, 98, 87, 76, 65, 91, 105, 118, 112, 101, 125, 137, 112, 90, 68, 46, 27] },
  { day: 'T5', hours: [14, 17, 20, 26, 48, 70, 91, 101, 88, 77, 66, 55, 81, 95, 108, 101, 90, 114, 126, 101, 79, 57, 35, 20] },
  { day: 'T6', hours: [21, 25, 30, 39, 65, 91, 113, 123, 110, 99, 88, 77, 103, 117, 130, 123, 112, 136, 148, 123, 101, 79, 57, 34] },
  { day: 'T7', hours: [28, 33, 39, 50, 78, 106, 128, 138, 125, 114, 103, 92, 118, 132, 145, 138, 127, 151, 163, 138, 116, 94, 72, 49] },
  { day: 'CN', hours: [24, 29, 35, 45, 71, 97, 119, 129, 116, 105, 94, 83, 109, 123, 136, 129, 118, 142, 154, 129, 107, 85, 63, 40] },
];

const getHeatmapColor = (value: number) => {
  if (value < 30) return '#FFEDD5';
  if (value < 60) return '#FED7AA';
  if (value < 90) return '#FB923C';
  if (value < 120) return '#F97316';
  return '#EA580C';
};

export function Dashboard2() {
  const [trendData, setTrendData] = useState(
    Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      orders: Math.floor(Math.random() * 200) + 300,
    }))
  );
  const [hoursData, setHoursData] = useState(INITIAL_HOURS_DATA);
  const [weekdayData, setWeekdayData] = useState(INITIAL_WEEKDAY_DATA);
  const [heatmapData, setHeatmapData] = useState(HEATMAP_DATA);

  useEffect(() => {
    // Trend by day - now streaming (every 2.5 seconds)
    const trendInterval = setInterval(() => {
      setTrendData((prev) => {
        const updated = prev.slice(1);
        updated.push({
          day: prev[prev.length - 1].day + 1,
          orders: Math.floor(Math.random() * 200) + 300,
        });
        return updated;
      });
    }, 2500);

    // Hours data - updates streaming (every 3 seconds)
    const hoursInterval = setInterval(() => {
      setHoursData((prev) =>
        prev.map((item) => ({
          ...item,
          count: Math.max(20, item.count + Math.floor(Math.random() * 20) - 10),
        }))
      );
    }, 3000);

    // Weekday data - updates streaming (every 2.5 seconds)
    const weekdayInterval = setInterval(() => {
      setWeekdayData((prev) =>
        prev.map((item) => ({
          ...item,
          orders: Math.max(200, item.orders + Math.floor(Math.random() * 30) - 15),
        }))
      );
    }, 2500);

    // Heatmap - real-time streaming (every 2 seconds)
    const heatmapInterval = setInterval(() => {
      setHeatmapData((prev) =>
        prev.map((row) => ({
          ...row,
          hours: row.hours.map((val) => Math.max(10, val + Math.floor(Math.random() * 10) - 4)),
        }))
      );
    }, 2000);

    return () => {
      clearInterval(trendInterval);
      clearInterval(hoursInterval);
      clearInterval(weekdayInterval);
      clearInterval(heatmapInterval);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Row 1: Trend by day */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-slate-900" style={{ fontWeight: 600, fontSize: '1.25rem' }}>
                Xu hướng đơn hàng theo ngày
              </h3>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
                <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-600" style={{ fontSize: '0.75rem', fontWeight: 600 }}>STREAMING</span>
              </div>
            </div>
            <p className="text-slate-500 mt-1" style={{ fontSize: '0.875rem' }}>Biến động số lượng đơn hàng 30 ngày gần nhất</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={trendData}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis key="xaxis" dataKey="day" tick={{ fill: '#64748B', fontSize: 12 }} />
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
            <Bar key="bar" dataKey="orders" fill="#93C5FD" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Row 2: Hour chart and Weekday chart */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-slate-900" style={{ fontWeight: 600, fontSize: '1.25rem' }}>
              Mua sắm theo giờ trong ngày
            </h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
              <div className="size-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-600" style={{ fontSize: '0.75rem', fontWeight: 600 }}>STREAMING</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={hoursData}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis key="xaxis" dataKey="hour" tick={{ fill: '#64748B', fontSize: 11 }} />
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
              <Area key="area" type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
              <Line key="line" type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-slate-900" style={{ fontWeight: 600, fontSize: '1.25rem' }}>
              Mua sắm theo thứ trong tuần
            </h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
              <div className="size-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-600" style={{ fontSize: '0.75rem', fontWeight: 600 }}>STREAMING</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weekdayData}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis key="xaxis" dataKey="day" tick={{ fill: '#64748B', fontSize: 11 }} />
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
              <Bar key="bar" dataKey="orders" fill="#86EFAC" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Heatmap */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-slate-900" style={{ fontWeight: 600, fontSize: '1.25rem' }}>
              Bản đồ nhiệt: Mật độ mua sắm (Thứ × Giờ)
            </h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
              <div className="size-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-600" style={{ fontSize: '0.75rem', fontWeight: 600 }}>STREAMING</span>
            </div>
          </div>
          <p className="text-slate-500" style={{ fontSize: '0.875rem' }}>
            Màu đậm hơn = mật độ đơn hàng cao hơn
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex gap-1">
              {/* Y-axis labels */}
              <div className="flex flex-col gap-1 pt-8">
                {heatmapData.map((row, idx) => (
                  <div
                    key={idx}
                    className="h-12 flex items-center justify-end pr-3"
                    style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748B' }}
                  >
                    {row.day}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              <div>
                {/* X-axis labels */}
                <div className="flex gap-1 mb-1">
                  {Array.from({ length: 24 }, (_, i) => (
                    <div
                      key={i}
                      className="w-12 h-7 flex items-center justify-center"
                      style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}
                    >
                      {i}h
                    </div>
                  ))}
                </div>

                {/* Grid cells */}
                {heatmapData.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex gap-1 mb-1">
                    {row.hours.map((value, colIdx) => (
                      <div
                        key={colIdx}
                        className="w-12 h-12 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-lg cursor-pointer flex items-center justify-center group relative"
                        style={{
                          backgroundColor: getHeatmapColor(value),
                        }}
                      >
                        <span
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-white drop-shadow-lg"
                          style={{ fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <span className="text-slate-600" style={{ fontSize: '0.875rem' }}>Thấp</span>
              <div className="flex gap-1">
                <div className="w-8 h-6 rounded" style={{ backgroundColor: '#FFEDD5' }} />
                <div className="w-8 h-6 rounded" style={{ backgroundColor: '#FED7AA' }} />
                <div className="w-8 h-6 rounded" style={{ backgroundColor: '#FB923C' }} />
                <div className="w-8 h-6 rounded" style={{ backgroundColor: '#F97316' }} />
                <div className="w-8 h-6 rounded" style={{ backgroundColor: '#EA580C' }} />
              </div>
              <span className="text-slate-600" style={{ fontSize: '0.875rem' }}>Cao</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
