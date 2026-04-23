import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Crown, Star, AlertTriangle, Ghost, Activity } from "lucide-react";

type SegmentStatApi = {
  type: "VIP" | "Potential" | "Risk" | "Lost";
  count: number;
  avg_recency_days: number;
  avg_orders: number;
  avg_aov: number;
};

type RealtimeRow = {
  id: string;
  cid: string;
  spend: string;
  freq: number;
  rec: string;
  type: string;
};

const SEGMENT_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  VIP: { label: "VIP", color: "#fbbf24", icon: <Crown className="text-yellow-400" /> },
  Potential: { label: "Tiem nang", color: "#05df72", icon: <Star className="text-green-400" /> },
  Risk: { label: "Nguy co", color: "#ef5350", icon: <AlertTriangle className="text-red-400" /> },
  Lost: { label: "Vang lai", color: "#60a5fa", icon: <Ghost className="text-blue-400" /> },
};

export default function Clustering() {
  const [segmentStats, setSegmentStats] = useState<SegmentStatApi[]>([]);
  const [realtimeRows, setRealtimeRows] = useState<RealtimeRow[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/clustering/stats");
        const data = await res.json();
        if (Array.isArray(data)) {
          setSegmentStats(data);
        }
      } catch (error) {
        console.error("Loi lay clustering stats:", error);
      }
    };

    const fetchRealtime = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/clustering/realtime?limit=20");
        const data = await res.json();
        setRealtimeRows(Array.isArray(data?.rows) ? data.rows : []);
      } catch (error) {
        console.error("Loi lay clustering realtime:", error);
      }
    };

    fetchStats();
    fetchRealtime();

    const statsTimer = setInterval(fetchStats, 5000);
    const realtimeTimer = setInterval(fetchRealtime, 5000);
    return () => {
      clearInterval(statsTimer);
      clearInterval(realtimeTimer);
    };
  }, []);

  const uiStats = useMemo(() => {
    return segmentStats.map((segment) => {
      const meta = SEGMENT_META[segment.type] ?? SEGMENT_META.Potential;
      return {
        ...segment,
        label: meta.label,
        color: meta.color,
        icon: meta.icon,
        recency: `${segment.avg_recency_days.toFixed(1)} ngay`,
        orders: `${Math.round(segment.avg_orders)} don`,
        aov: `${segment.avg_aov.toLocaleString("en-US", { maximumFractionDigits: 0 })}k`,
      };
    });
  }, [segmentStats]);

  const pieData = useMemo(
    () => uiStats.map((s) => ({ name: s.label, value: s.count, color: s.color })),
    [uiStats]
  );

  const badgeColorByType = (type: string) => {
    if (type === "VIP") return "#fbbf24";
    if (type === "Potential") return "#05df72";
    if (type === "Risk") return "#ef5350";
    if (type === "Lost") return "#60a5fa";
    return "#7b9bb8";
  };

  return (
    <div className="min-h-screen p-6 space-y-6 bg-[#1f2228] text-[#e8edf3]">
      
      {/* SECTION 1: 4 NHÓM KHÁCH HÀNG (Mỗi thẻ 1 nhóm) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {uiStats.map((segment) => (
          <Card key={segment.type} className="bg-[#353a44] border-[#4a6072] relative overflow-hidden group hover:border-[#7b9bb8] transition-colors">
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
              {segment.icon}
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold tracking-wider" style={{ color: segment.color }}>
                NHOM: {segment.label.toUpperCase()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center border-b border-[#4a6072] pb-1">
                <span className="text-[11px] text-[#7b9bb8]">Recency:</span>
                <span className="text-sm font-semibold text-green-400">{segment.recency}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#4a6072] pb-1">
                <span className="text-[11px] text-[#7b9bb8]">Tổng đơn:</span>
                <span className="text-sm font-semibold text-blue-400">{segment.orders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#7b9bb8]">AOV (TB):</span>
                <span className="text-sm font-bold text-yellow-400">{segment.aov}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SECTION 2: BIỂU ĐỒ TRÒN & BẢNG GIÁM SÁT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Biểu đồ tròn Phân bổ (1/3 chiều rộng) */}
        <Card className="bg-[#353a44] border-[#4a6072] flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity size={16} className="text-[#7b9bb8]" /> Tỷ lệ Phân bổ
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1f2228', border: '1px solid #4a6072', borderRadius: '8px' }}
                  itemStyle={{ color: '#e8edf3' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bảng Giám sát Real-time (2/3 chiều rộng) */}
        <Card className="lg:col-span-2 bg-[#353a44] border-[#4a6072]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-[#e8edf3]">
              Giám sát phân loại Real-time
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] text-[#7b9bb8] uppercase">Kafka Stream Active</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#1f2228]/80">
                <TableRow className="border-[#4a6072]">
                  <TableHead className="text-[#7b9bb8] text-[11px] uppercase">Mã GD</TableHead>
                  <TableHead className="text-[#7b9bb8] text-[11px] uppercase">Mã KH</TableHead>
                  <TableHead className="text-[#7b9bb8] text-[11px] uppercase text-right">Chi tiêu</TableHead>
                  <TableHead className="text-[#7b9bb8] text-[11px] uppercase text-center">Tần suất</TableHead>
                  <TableHead className="text-[#7b9bb8] text-[11px] uppercase text-center">Độ trễ</TableHead>
                  <TableHead className="text-[#7b9bb8] text-[11px] uppercase text-right">Phân loại</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realtimeRows.map((row) => {
                  const color = badgeColorByType(row.type);
                  return (
                  <TableRow key={row.id} className="border-[#4a6072] hover:bg-[#4a6072]/40 transition-colors">
                    <TableCell className="font-mono text-[11px] text-[#7b9bb8]">{row.id}</TableCell>
                    <TableCell className="font-medium text-sm text-green-400">{row.cid}</TableCell>
                    <TableCell className="text-right font-bold text-yellow-400">{row.spend}</TableCell>
                    <TableCell className="text-center text-sm text-blue-400">{row.freq} đơn</TableCell>
                    <TableCell className="text-center text-xs text-[#7b9bb8]">{row.rec}</TableCell>
                    <TableCell className="text-right">
                      <Badge style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>
                        {row.type}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )})}
                {realtimeRows.length === 0 && (
                  <TableRow className="border-[#4a6072]">
                    <TableCell colSpan={6} className="text-center text-[#7b9bb8] py-6">
                      Chua co du lieu realtime
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}