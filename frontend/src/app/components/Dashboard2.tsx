import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';

// Khởi tạo mảng các thứ ĐẦY ĐỦ 7 ngày trong tuần
const initWeekdayData = () => [
  { day: 'Thứ 2', orders: 0 }, 
  { day: 'Thứ 3', orders: 0 },
  { day: 'Thứ 4', orders: 0 },
  { day: 'Thứ 5', orders: 0 }, 
  { day: 'Thứ 6', orders: 0 }, 
  { day: 'Thứ 7', orders: 0 }, 
  { day: 'Chủ nhật', orders: 0 }
];

export function Dashboard2() {
  const [trendData, setTrendData] = useState<{ day: number; orders: number }[]>([]);
  const [weekdayData, setWeekdayData] = useState(initWeekdayData());

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8001/ws/dashboard');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const recordDateStr = data.Date;
      if (!recordDateStr) return;

      const dateObj = new Date(recordDateStr);
      const dayOfMonth = dateObj.getDate();
      
      // Lấy thứ trong tuần (0: Chủ nhật, 1: T2, 2: T3...)
      const dayIdx = dateObj.getDay();
      // Map về Index của mảng initWeekdayData (Chủ nhật đưa về cuối mảng - index 6)
      const mappedIdx = dayIdx === 0 ? 6 : dayIdx - 1;

      // 1. Cập nhật Trend Data (Sắp xếp tăng dần theo ngày 1->31)
      setTrendData(prev => {
        const existing = prev.find(p => p.day === dayOfMonth);
        let updated;
        if (existing) {
          updated = prev.map(p => p.day === dayOfMonth ? { ...p, orders: p.orders + 1 } : p);
        } else {
          updated = [...prev, { day: dayOfMonth, orders: 1 }];
        }
        return updated.sort((a, b) => a.day - b.day).slice(-30); // Giữ 30 ngày gần nhất
      });

      // 2. Cập nhật Weekday Data (Đã sửa lỗi mất Thứ 3)
      setWeekdayData(prev => {
        const updated = [...prev];
        updated[mappedIdx].orders += 1;
        return updated;
      });
    };

    return () => ws.close();
  }, []);

  return (
    <div className="space-y-6">
      {/* Xu hướng đơn hàng theo ngày */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-slate-900 text-xl font-semibold mb-6">Xu hướng mua sắm theo ngày</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trendData} margin={{ bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="day" tick={{ fill: '#64748B' }}>
              <Label value="Ngày trong tháng" offset={-10} position="insideBottom" fill="#64748B" />
            </XAxis>
            <YAxis tick={{ fill: '#64748B' }}>
              <Label value="Số đơn hàng" angle={-90} position="insideLeft" fill="#64748B" />
            </YAxis>
            <Tooltip />
            <Bar dataKey="orders" fill="#93C5FD" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mua sắm theo thứ */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-slate-900 text-xl font-semibold mb-6">Xu hướng mua sắm theo thứ trong tuần</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weekdayData} margin={{ bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="day" tick={{ fill: '#64748B' }}>
              <Label value="Thứ" offset={-10} position="insideBottom" fill="#64748B" />
            </XAxis>
            <YAxis tick={{ fill: '#64748B' }}>
              <Label value="Số lượng" angle={-90} position="insideLeft" fill="#64748B" />
            </YAxis>
            <Tooltip />
            <Bar dataKey="orders" fill="#86EFAC" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}