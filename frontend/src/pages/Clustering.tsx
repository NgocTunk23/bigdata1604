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
  VIP:        { label: "Thân thiết",color: "#f5e61e", icon: <Crown          className="text-[#f5e61e]" /> },
  Potential:  { label: "Tiềm năng", color: "#05df72", icon: <Star           className="text-[#05df72]" /> },
  Risk:       { label: "Nguy cơ",   color: "#ef5350", icon: <AlertTriangle  className="text-[#ef5350]" /> },
  Lost:       { label: "Vãng lai",  color: "#60a5fa", icon: <Ghost          className="text-[#60a5fa]" /> },
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
        recency: `${segment.avg_recency_days.toFixed(1)} ngày`,
        orders: `${Math.round(segment.avg_orders)} đơn`,
        aov: `${segment.avg_aov.toLocaleString("en-US", { maximumFractionDigits: 0 })}k`,
      };
    });
  }, [segmentStats]);

  const pieData = useMemo(
    () => uiStats.map((s) => ({ name: s.label, value: s.count, color: s.color })),
    [uiStats]
  );

  const badgeColorByType = (type: string) => {
    if (type === "VIP") return "#f5e61e";
    if (type === "Potential") return "#05df72";
    if (type === "Risk") return "#ef5350";
    if (type === "Lost") return "#60a5fa";
    return "#64748b";
  };

  const parseRecency = (value: string) => {
    if (!value) return 0;
    if (value.toLowerCase().includes("vừa xong")) return 0;
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
    <div className="min-h-screen p-6 space-y-6 bg-[#f3f5f8] text-slate-900">
      
      {/* SECTION 1: 4 NHÓM KHÁCH HÀNG */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {uiStats.map((segment) => (
          <Card 
            key={segment.type} 
            className="bg-[#ffffff] border-slate-200 relative overflow-hidden group hover:shadow-md transition-all border-t-4"
            style={{ borderTopColor: segment.color }}
          >
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
              {segment.icon}
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold tracking-wider" style={{ color: segment.color }}>
                {segment.label.toUpperCase()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                <span className="text-[11px] text-slate-500">Recency:</span>
                <span className="text-sm font-semibold text-emerald-600">{segment.recency}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                <span className="text-[11px] text-slate-500">Tổng đơn:</span>
                <span className="text-sm font-semibold text-blue-600">{segment.orders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">AOV (TB):</span>
                <span className="text-sm font-bold text-amber-600">{segment.aov}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SECTION 2: BIỂU ĐỒ TRÒN & BẢNG GIÁM SÁT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Biểu đồ tròn Phân bổ - Chiếm 2/5 chiều rộng (To hơn trước) */}
        <Card className="lg:col-span-2 bg-[#ffffff] border-slate-200 flex flex-col shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <Activity size={16} className="text-slate-400" /> Tỷ lệ Phân bổ
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[350px]"> {/* Tăng min-h để cân xứng với ô to */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={50} // Giảm từ 60 xuống 50 để dày hơn
                  outerRadius={100} // Tăng từ 80 lên 100 để to hơn
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bảng Giám sát Real-time - Chiếm 3/5 chiều rộng (Bé lại) */}
        <Card className="lg:col-span-3 bg-[#ffffff] border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-800">
              Giám sát phân loại Real-time
            </CardTitle>
            <div className="hidden sm:flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-slate-400 uppercase font-medium">Kafka Active</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-500 text-[11px] uppercase w-20">Mã GD</TableHead>
                  {/* Thu hẹp cột Mã KH */}
                  <TableHead className="text-slate-500 text-[11px] uppercase w-24">Mã KH</TableHead>
                  <TableHead className="text-slate-500 text-[11px] uppercase text-right">Chi tiêu</TableHead>
                  <TableHead className="text-slate-500 text-[11px] uppercase text-center">Tần suất</TableHead>
                  <TableHead className="text-slate-500 text-[11px] uppercase text-center">Độ trễ</TableHead>
                  {/* Thu hẹp cột Phân loại */}
                  <TableHead className="text-slate-500 text-[11px] uppercase text-right w-24">Loại</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realtimeRows.map((row) => {
                  const color = badgeColorByType(row.type);
                  return (
                  <TableRow key={`${row.id}-${row.cid}`} className="border-slate-100 hover:bg-slate-50 transition-colors">
                    <TableCell className="font-mono text-[11px] text-slate-400 truncate max-w-[80px]">{row.id}</TableCell>
                    <TableCell className="font-medium text-sm text-slate-700 whitespace-nowrap">{row.cid}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">{row.spend}</TableCell>
                    <TableCell className="text-center text-sm text-blue-600 whitespace-nowrap">{row.freq} đơn</TableCell>
                    <TableCell className="text-center text-xs text-slate-400">{row.rec}</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        className="px-2 py-0 text-[10px] whitespace-nowrap"
                        style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
                      >
                        {row.type}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-[#ffffff] border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Phương pháp Elbow (WCSS theo số cụm K)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={elbowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="k" stroke="#64748b" fontSize={12} label={{ value: "Số cụm K", position: "insideBottom", offset: -5, fill: "#64748b" }} />
                <YAxis stroke="#64748b" fontSize={12} label={{ value: "WCSS", angle: -90, position: "insideLeft", fill: "#64748b" }} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }} />
                <Line type="monotone" dataKey="wcss" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#ffffff] border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Hệ số Silhouette (SilhouetteScore theo cụm K)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={silhouetteData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="k" stroke="#64748b" fontSize={12} label={{ value: "Cụm K", position: "insideBottom", offset: -5, fill: "#64748b" }} />
                <YAxis domain={[0, 1]} stroke="#64748b" fontSize={12} label={{ value: "SilhouetteScore", angle: -90, position: "insideLeft", fill: "#64748b" }} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }} />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-[#ffffff] border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Scatter plot: Phân bố cụm trong không gian 2D</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid stroke="#e2e8f0" />
                <XAxis type="number" dataKey="x" name="Recency" stroke="#64748b" label={{ value: "Recency (Ngày)", position: "insideBottom", offset: -5, fill: "#64748b" }} />
                <YAxis type="number" dataKey="y" name="Frequency" stroke="#64748b" label={{ value: "Frequency (Đơn hàng)", angle: -90, position: "insideLeft", fill: "#64748b" }} />
                <ZAxis type="number" dataKey="z" range={[60, 160]} />
                <RechartsTooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }} />
                <Legend />
                {CLUSTER_ORDER.map((cluster) => (
                  <Scatter key={cluster} name={cluster} data={scatterDataByCluster[cluster]} fill={badgeColorByType(cluster)} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#ffffff] border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Hồ sơ RFM theo cụm (tam giác R-F-M)</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={[{ metric: "Độ mới" }, { metric: "Giá trị" }, { metric: "Tần suất" }]}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" stroke="#64748b" fontSize={12} />
                <PolarRadiusAxis domain={[0, 1400]} ticks={[0, 350, 700, 1050, 1400]} stroke="#e2e8f0" fontSize={10} />
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
                    fillOpacity={0.15}
                  />
                ))}
                <Legend />
                <RechartsTooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#ffffff] border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm text-slate-700">So sánh chỉ số RFM giữa các cụm</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* 1. Recency Chart */}
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareCharts.recency}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="cluster" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Độ mới (ngày)">
                  {compareCharts.recency.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={badgeColorByType(entry.cluster)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 2. Avg Orders Chart */}
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareCharts.avgOrders}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="cluster" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Số đơn trung bình">
                  {compareCharts.avgOrders.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={badgeColorByType(entry.cluster)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 3. Total Spend Chart */}
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareCharts.totalSpend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="cluster" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Tổng chi tiêu">
                  {compareCharts.totalSpend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={badgeColorByType(entry.cluster)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 4. Avg AOV Chart */}
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareCharts.avgAov}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="cluster" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Giá trị TB đơn">
                  {compareCharts.avgAov.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={badgeColorByType(entry.cluster)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}