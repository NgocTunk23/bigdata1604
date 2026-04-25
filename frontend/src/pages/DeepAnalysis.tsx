import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DailyPoint = { date: string; orders: number };
type RollingPoint = { date: string; orders: number };
type HourlyPoint = { hour: string; orders: number };
type WeekdayPoint = { weekday: string; orders: number };
type HeatPoint = { weekday: string; hour: number; orders: number };

type DeepAnalysisPayload = {
  daily_trend: DailyPoint[];
  rolling_30_days: RollingPoint[];
  hourly_distribution: HourlyPoint[];
  weekday_distribution: WeekdayPoint[];
  heatmap: HeatPoint[];
};

const emptyData: DeepAnalysisPayload = {
  daily_trend: [],
  rolling_30_days: [],
  hourly_distribution: [],
  weekday_distribution: [],
  heatmap: [],
};

const weekdayOrder = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const heatmapColors = ["#FBE4D5", "#F8C9A8", "#F3A46E", "#EE7D36", "#DD5D18"];

function getHeatLevel(value: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  const ratio = value / maxValue;
  if (ratio <= 0.2) return 0;
  if (ratio <= 0.4) return 1;
  if (ratio <= 0.6) return 2;
  if (ratio <= 0.8) return 3;
  return 4;
}

export default function DeepAnalysis() {
  const [streamData, setStreamData] = useState<DeepAnalysisPayload>(emptyData);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      socket = new WebSocket("ws://localhost:8000/ws/deep-analysis");

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.topic === "deep_analysis_snapshot" && parsed?.data) {
            setStreamData(parsed.data as DeepAnalysisPayload);
          }
        } catch {
          // keep UI stable on malformed stream messages
        }
      };

      socket.onclose = () => {
        reconnectTimer = window.setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, []);

  const heatMapRows = useMemo(() => {
    const matrix = weekdayOrder.map((weekday) => ({
      weekday,
      cells: Array.from({ length: 24 }, (_, hour) => {
        const found = streamData.heatmap.find((it) => it.weekday === weekday && it.hour === hour);
        return found?.orders ?? 0;
      }),
    }));
    return matrix;
  }, [streamData.heatmap]);

  const maxHeatValue = useMemo(() => {
    return streamData.heatmap.reduce((acc, item) => Math.max(acc, item.orders), 0);
  }, [streamData.heatmap]);

  return (
    <div className="min-h-screen p-6 space-y-6 bg-[#f3f5f8] text-[#1f3c5a]">
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-white border-[#d8e2ee] text-[#1f3c5a]">
          <CardHeader>
            <CardTitle>Xu hướng đơn hàng theo ngày - Biến động số lượng đơn hàng 30 ngày gần nhất</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={streamData.rolling_30_days.length > 0 ? streamData.rolling_30_days : streamData.daily_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e5f2" />
                <XAxis dataKey="date" stroke="#5f7c9c" tick={{ fontSize: 11 }} />
                <YAxis stroke="#5f7c9c" />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d8e2ee" }} />
                <Bar dataKey="orders" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-white border-[#d8e2ee] text-[#1f3c5a]">
          <CardHeader>
            <CardTitle>Mua sắm theo giờ trong ngày</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={streamData.hourly_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e5f2" />
                <XAxis dataKey="hour" stroke="#5f7c9c" tick={{ fontSize: 11 }} />
                <YAxis stroke="#5f7c9c" />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d8e2ee" }} />
                <Line type="monotone" dataKey="orders" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#d8e2ee] text-[#1f3c5a]">
          <CardHeader>
            <CardTitle>Mua sắm theo thứ trong tuần</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={streamData.weekday_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e5f2" />
                <XAxis dataKey="weekday" stroke="#5f7c9c" />
                <YAxis stroke="#5f7c9c" />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d8e2ee" }} />
                <Bar dataKey="orders" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-[#d8e2ee] text-[#1f3c5a]">
        <CardHeader>
          <CardTitle>Bản đồ nhiệt: Mật độ mua sắm (Thứ × Giờ)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <div className="min-w-[840px] space-y-2">
              <div className="grid grid-cols-[60px_repeat(24,minmax(24px,1fr))] gap-1 text-[10px] text-[#5f7c9c]">
                <div />
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="text-center">{hour}</div>
                ))}
              </div>

              {heatMapRows.map((row) => (
                <div key={row.weekday} className="grid grid-cols-[60px_repeat(24,minmax(24px,1fr))] gap-1 items-center">
                  <div className="text-xs font-medium text-[#5f7c9c]">{row.weekday}</div>
                  {row.cells.map((value, idx) => {
                    const level = getHeatLevel(value, maxHeatValue);
                    return (
                      <div
                        key={`${row.weekday}-${idx}`}
                        className="h-6 rounded-sm border border-[#d8e2ee]"
                        style={{ backgroundColor: heatmapColors[level] }}
                        title={`${row.weekday} - ${idx}:00 | ${value} đơn`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 text-xs text-[#5f7c9c]">
            <span>Mật độ thấp</span>
            {heatmapColors.map((color, idx) => (
              <div key={idx} className="h-4 w-8 rounded-sm border border-[#d8e2ee]" style={{ backgroundColor: color }} />
            ))}
            <span>Mật độ cao</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
