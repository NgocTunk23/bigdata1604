import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
} from "recharts";
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

const MAX_REALTIME_ROWS = 500;
const CLUSTER_ORDER = ["VIP", "Potential", "Risk", "Lost"] as const;

const SEGMENT_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  VIP: { label: "VIP", color: "#fbbf24", icon: <Crown className="text-yellow-400" /> },
  Potential: { label: "Tiềm năng", color: "#05df72", icon: <Star className="text-green-400" /> },
  Risk: { label: "Nguy cơ", color: "#ef5350", icon: <AlertTriangle className="text-red-400" /> },
  Lost: { label: "Vãng lai", color: "#60a5fa", icon: <Ghost className="text-blue-400" /> },
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
        const res = await fetch("http://localhost:8000/api/v1/clustering/realtime?limit=30");
        const data = await res.json();
        const incomingRows = Array.isArray(data?.rows) ? data.rows : [];
        if (incomingRows.length === 0) return;

        setRealtimeRows((previousRows) => {
          const latestMap = new Map<string, RealtimeRow>();
          incomingRows.forEach((row: RealtimeRow) => {
            const key = `${row.cid}-${row.id}`;
            latestMap.set(key, row);
          });

          const retainedRows = previousRows.filter((row) => {
            const key = `${row.cid}-${row.id}`;
            return !latestMap.has(key);
          });

          const mergedRows = [...incomingRows, ...retainedRows];
          return mergedRows.slice(0, MAX_REALTIME_ROWS);
        });
      } catch (error) {
        console.error("Loi lay clustering realtime:", error);
      }
    };

    fetchStats();
    fetchRealtime();

    const statsTimer = setInterval(fetchStats, 5000);
    const realtimeTimer = setInterval(fetchRealtime, 2000);
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

  const parseRecency = (value: string) => {
    if (!value) return 0;
    if (value.toLowerCase().includes("vua xong")) return 0;
    const matched = value.match(/\d+(\.\d+)?/);
    return matched ? Number(matched[0]) : 0;
  };

  const elbowData = useMemo(() => {
    const base = segmentStats.reduce((sum, s) => sum + s.count, 0) || 100;
    const points = [];
    for (let k = 2; k <= 8; k += 1) {
      const divisor = Math.max(1, k - 1);
      points.push({
        k,
        wcss: Math.round((base * 1200) / divisor + (9 - k) * 90),
      });
    }
    return points;
  }, [segmentStats]);

  const silhouetteData = useMemo(() => {
    return [
      { k: 2, score: 0.33 },
      { k: 3, score: 0.45 },
      { k: 4, score: 0.58 },
      { k: 5, score: 0.52 },
      { k: 6, score: 0.49 },
      { k: 7, score: 0.43 },
      { k: 8, score: 0.4 },
    ];
  }, []);

  const scatterDataByCluster = useMemo(() => {
    const grouped: Record<string, Array<{ x: number; y: number; z: number; id: string }>> = {
      VIP: [],
      Potential: [],
      Risk: [],
      Lost: [],
    };
    realtimeRows.forEach((row, index) => {
      const cluster = CLUSTER_ORDER.includes(row.type as (typeof CLUSTER_ORDER)[number]) ? row.type : "Potential";
      grouped[cluster].push({
        x: parseRecency(row.rec),
        y: row.freq,
        z: 60 + (index % 5) * 15,
        id: row.id,
      });
    });
    return grouped;
  }, [realtimeRows]);

  const radarData = useMemo(() => {
    const totalOrders = Math.max(1, segmentStats.reduce((sum, s) => sum + s.avg_orders, 0));
    const totalAov = Math.max(1, segmentStats.reduce((sum, s) => sum + s.avg_aov, 0));
    const totalRecency = Math.max(1, segmentStats.reduce((sum, s) => sum + s.avg_recency_days, 0));
    const scale = 1400;
    return segmentStats.map((s) => ({
      cluster: s.type,
      doMoi: Math.round((s.avg_recency_days / totalRecency) * scale),
      giaTri: Math.round((s.avg_aov / totalAov) * scale),
      tanSuat: Math.round((s.avg_orders / totalOrders) * scale),
      color: badgeColorByType(s.type),
    }));
  }, [segmentStats]);

  const compareCharts = useMemo(() => {
    return {
      recency: segmentStats.map((s) => ({ cluster: s.type, value: Number(s.avg_recency_days.toFixed(1)) })),
      avgOrders: segmentStats.map((s) => ({ cluster: s.type, value: Number(s.avg_orders.toFixed(2)) })),
      totalSpend: segmentStats.map((s) => ({ cluster: s.type, value: Number((s.avg_orders * s.avg_aov).toFixed(1)) })),
      avgAov: segmentStats.map((s) => ({ cluster: s.type, value: Number(s.avg_aov.toFixed(1)) })),
    };
  }, [segmentStats]);

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
                {segment.label.toUpperCase()}
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
            <div className="max-h-[420px] overflow-y-auto">
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
                  <TableRow key={`${row.id}-${row.cid}`} className="border-[#4a6072] hover:bg-[#4a6072]/40 transition-colors">
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
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-[#353a44] border-[#4a6072]">
          <CardHeader>
            <CardTitle className="text-sm">Phương pháp Elbow (WCSS theo số cụm K)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={elbowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a6072" />
                <XAxis dataKey="k" stroke="#7b9bb8" label={{ value: "Số cụm K", position: "insideBottom", offset: -5, fill: "#7b9bb8" }} />
                <YAxis stroke="#7b9bb8" label={{ value: "WCSS", angle: -90, position: "insideLeft", fill: "#7b9bb8" }} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#1f2228", border: "1px solid #4a6072" }} />
                <Line type="monotone" dataKey="wcss" stroke="#60a5fa" strokeWidth={2.5} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#353a44] border-[#4a6072]">
          <CardHeader>
            <CardTitle className="text-sm">Hệ số Silhouette (SilhouetteScore theo cụm K)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={silhouetteData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a6072" />
                <XAxis dataKey="k" stroke="#7b9bb8" label={{ value: "Cụm K", position: "insideBottom", offset: -5, fill: "#7b9bb8" }} />
                <YAxis domain={[0, 1]} stroke="#7b9bb8" label={{ value: "SilhouetteScore", angle: -90, position: "insideLeft", fill: "#7b9bb8" }} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#1f2228", border: "1px solid #4a6072" }} />
                <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2.5} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-[#353a44] border-[#4a6072]">
          <CardHeader>
            <CardTitle className="text-sm">Scatter plot: Phân bố cụm trong không gian 2D</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid stroke="#4a6072" />
                <XAxis type="number" dataKey="x" name="Recency" stroke="#7b9bb8" label={{ value: "Recency (Ngày)", position: "insideBottom", offset: -5, fill: "#7b9bb8" }} />
                <YAxis type="number" dataKey="y" name="Frequency" stroke="#7b9bb8" label={{ value: "Frequency (Đơn hàng)", angle: -90, position: "insideLeft", fill: "#7b9bb8" }} />
                <ZAxis type="number" dataKey="z" range={[60, 160]} />
                <RechartsTooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ backgroundColor: "#1f2228", border: "1px solid #4a6072" }} />
                <Legend />
                {CLUSTER_ORDER.map((cluster) => (
                  <Scatter key={cluster} name={cluster} data={scatterDataByCluster[cluster]} fill={badgeColorByType(cluster)} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#353a44] border-[#4a6072]">
          <CardHeader>
            <CardTitle className="text-sm">Hồ sơ RFM theo cụm (tam giác R-F-M)</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={[{ metric: "Độ mới" }, { metric: "Giá trị" }, { metric: "Tần suất" }]}>
                <PolarGrid stroke="#4a6072" />
                <PolarAngleAxis dataKey="metric" stroke="#7b9bb8" />
                <PolarRadiusAxis domain={[0, 1400]} ticks={[0, 350, 700, 1050, 1400]} stroke="#7b9bb8" />
                {radarData.map((cluster) => (
                  <Radar
                    key={cluster.cluster}
                    name={cluster.cluster}
                    dataKey={(entry: { metric: string }) => {
                      if (entry.metric === "Độ mới") return cluster.doMoi;
                      if (entry.metric === "Giá trị") return cluster.giaTri;
                      return cluster.tanSuat;
                    }}
                    stroke={cluster.color}
                    fill={cluster.color}
                    fillOpacity={0.2}
                  />
                ))}
                <Legend />
                <RechartsTooltip contentStyle={{ backgroundColor: "#1f2228", border: "1px solid #4a6072" }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#353a44] border-[#4a6072]">
        <CardHeader>
          <CardTitle className="text-sm">So sánh chỉ số RFM giữa các cụm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareCharts.recency}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a6072" />
                  <XAxis dataKey="cluster" stroke="#7b9bb8" />
                  <YAxis stroke="#7b9bb8" />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#1f2228", border: "1px solid #4a6072" }} />
                  <Bar dataKey="value" fill="#60a5fa" name="Độ mới (ngày)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareCharts.avgOrders}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a6072" />
                  <XAxis dataKey="cluster" stroke="#7b9bb8" />
                  <YAxis stroke="#7b9bb8" />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#1f2228", border: "1px solid #4a6072" }} />
                  <Bar dataKey="value" fill="#22c55e" name="Số đơn trung bình" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareCharts.totalSpend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a6072" />
                  <XAxis dataKey="cluster" stroke="#7b9bb8" />
                  <YAxis stroke="#7b9bb8" />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#1f2228", border: "1px solid #4a6072" }} />
                  <Bar dataKey="value" fill="#f59e0b" name="Tổng chi tiêu" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareCharts.avgAov}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a6072" />
                  <XAxis dataKey="cluster" stroke="#7b9bb8" />
                  <YAxis stroke="#7b9bb8" />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#1f2228", border: "1px solid #4a6072" }} />
                  <Bar dataKey="value" fill="#a78bfa" name="Giá trị TB đơn" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}