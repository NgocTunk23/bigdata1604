import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Import data
import clusteringData from '../../data/clusteringdata.json';
import rawUsersData from '../../data/clustered_users.jsonl?raw';

interface ClusterData {
  name: string;
  value: number;
  color: string;
}

interface TransactionData {
  id: string;
  customerId: string;
  totalSpending: number;
  frequency: number;
  recency: number;
  cluster: string;
  clusterColor: string;
}

const CLUSTER_PROFILES = [
  { name: 'At Risk', nameVi: 'Vãng lai', color: '#F87171', bgColor: '#FEE2E2' },
  { name: 'Regular', nameVi: 'Thân thiết', color: '#4ADE80', bgColor: '#D1FAE5' },
  { name: 'Loyal', nameVi: 'Trung thành', color: '#FCD34D', bgColor: '#FEF3C7' },
  { name: 'VIP', nameVi: 'VIP', color: '#C084FC', bgColor: '#F3E8FF' },
];

export function ClusteringTab() {
  // 1. Data từ clusteringdata.json cho Elbow và Silhouette
  const elbowData = useMemo(() => clusteringData.map((d: any) => ({ k: d.k, wcss: d.wcss })), []);
  const silhouetteData = useMemo(() => clusteringData.map((d: any) => ({ k: d.k, score: d.silhouette })), []);

  // 2. Parse dữ liệu clustered_users.jsonl cho các biểu đồ phân phối
  const users = useMemo(() => {
    return rawUsersData.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  }, []);

  const scatterData = useMemo(() => users.map((u: any) => ({
    x: u.recency_days,
    y: u.total_orders,
    cluster: u.cluster
  })), [users]);

  // Hàm tính trung bình cho từng cụm để vẽ Radar và Bar Charts
  const getAvg = (clusterId: number, field: string) => {
    const cUsers = users.filter((u: any) => u.cluster === clusterId);
    if (!cUsers.length) return 0;
    return Math.round(cUsers.reduce((sum: number, u: any) => sum + u[field], 0) / cUsers.length);
  };

  const radarData = useMemo(() => [
    { metric: 'Độ mới', 'Vãng lai': getAvg(0, 'recency_days'), 'Thân thiết': getAvg(1, 'recency_days'), 'Trung thành': getAvg(2, 'recency_days'), VIP: getAvg(3, 'recency_days') },
    { metric: 'Tần suất', 'Vãng lai': getAvg(0, 'total_orders'), 'Thân thiết': getAvg(1, 'total_orders'), 'Trung thành': getAvg(2, 'total_orders'), VIP: getAvg(3, 'total_orders') },
    { metric: 'Giá trị', 'Vãng lai': getAvg(0, 'total_spend'), 'Thân thiết': getAvg(1, 'total_spend'), 'Trung thành': getAvg(2, 'total_spend'), VIP: getAvg(3, 'total_spend') },
  ], [users]);

  const recencyData = CLUSTER_PROFILES.map((p, i) => ({ cluster: p.nameVi, value: getAvg(i, 'recency_days') }));
  const averageOrdersData = CLUSTER_PROFILES.map((p, i) => ({ cluster: p.nameVi, value: getAvg(i, 'total_orders') }));
  const totalSpendData = CLUSTER_PROFILES.map((p, i) => ({ cluster: p.nameVi, value: getAvg(i, 'total_spend') }));
  const averageOrderValueData = CLUSTER_PROFILES.map((p, i) => ({ cluster: p.nameVi, value: getAvg(i, 'avg_order_value') }));

  // 3. Streaming Data (Pie Chart & Table)
  const [clusterDistribution, setClusterDistribution] = useState<ClusterData[]>([
    { name: 'Vãng lai', value: 0, color: '#F87171' },
    { name: 'Thân thiết', value: 0, color: '#4ADE80' },
    { name: 'Trung thành', value: 0, color: '#FCD34D' },
    { name: 'VIP', value: 0, color: '#C084FC' },
  ]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);

  useEffect(() => {
    // Kết nối tới WebSocket Server (Kafka Consumer Middleware)
    const ws = new WebSocket('ws://localhost:8000/ws/clusters');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const profile = CLUSTER_PROFILES[data.cluster] || CLUSTER_PROFILES[0];
      
      const newTxn: TransactionData = {
        id: `TXN${Math.floor(Math.random() * 100000)}`, // Random ID cho đẹp mắt hoặc lấy từ data nếu có
        customerId: data.CustomerNo,
        totalSpending: Math.round(data.total_spend),
        frequency: data.total_orders,
        recency: data.recency_days,
        cluster: profile.nameVi,
        clusterColor: profile.color,
      };

      setTransactions((prev) => [newTxn, ...prev].slice(0, 15));

      setClusterDistribution((prev) => 
        prev.map((c, i) => i === data.cluster ? { ...c, value: c.value + 1 } : c)
      );
    };

    return () => ws.close();
  }, []);

  const totalDistribution = clusterDistribution.reduce((sum, c) => sum + c.value, 0);

  // --- HTML RENDER: Có thể tái sử dụng gần như toàn bộ layout cũ của bạn ---
  return (
    <div className="space-y-6">
      {/* 4 Cluster Profile Cards - Lấy data từ avg tính toán phía trên */}
      <div className="grid grid-cols-4 gap-4">
        {CLUSTER_PROFILES.map((profile, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(to right, ${profile.color}, ${profile.color}CC)` }} />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-3 rounded-full" style={{ backgroundColor: profile.color }} />
                <h3 className="text-slate-900 font-bold text-lg">{profile.nameVi}</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 text-sm">Recency</span>
                  <span className="text-slate-900 font-mono font-semibold text-sm">{getAvg(idx, 'recency_days')}d</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 text-sm">Đơn hàng</span>
                  <span className="text-slate-900 font-mono font-semibold text-sm">{getAvg(idx, 'total_orders')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 text-sm">AOV</span>
                  <span className="text-slate-900 font-mono font-semibold text-sm">{getAvg(idx, 'avg_order_value').toLocaleString()}k</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Distribution Section (Streaming from Kafka) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-slate-900 font-semibold text-xl">Tỷ Lệ Loại Khách Hàng</h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-600 text-xs font-bold">STREAMING KAFKA</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Pie Chart */}
          <div className="col-span-2">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clusterDistribution}
                  cx="50%" cy="50%"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    const radius = innerRadius + (outerRadius - innerRadius) * 1.25;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    return (
                      <text x={x} y={y} fill="#333" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="font-bold text-sm">
                        {totalDistribution > 0 ? (percent * 100).toFixed(1) + '%' : ''}
                      </text>
                    );
                  }}
                  outerRadius={100} innerRadius={60} dataKey="value" animationDuration={800}
                >
                  {clusterDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Live Table */}
          <div className="col-span-3">
            <div className="overflow-x-auto rounded-lg border border-slate-200 h-[300px]">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-600 text-sm font-semibold">Mã GD</th>
                    <th className="px-3 py-2 text-left text-slate-600 text-sm font-semibold">Mã KH</th>
                    <th className="px-3 py-2 text-right text-slate-600 text-sm font-semibold">Chi tiêu</th>
                    <th className="px-3 py-2 text-right text-slate-600 text-sm font-semibold">Tần suất</th>
                    <th className="px-3 py-2 text-right text-slate-600 text-sm font-semibold">Độ trễ</th>
                    <th className="px-3 py-2 text-center text-slate-600 text-sm font-semibold">Phân loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transactions.map((txn, idx) => (
                    <tr key={`${txn.id}-${idx}`} className={`hover:bg-slate-50 transition-colors ${idx === 0 ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-3 py-2 text-slate-600 font-mono text-sm">{txn.id}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-sm">{txn.customerId}</td>
                      <td className="px-3 py-2 text-right text-slate-900 font-mono text-sm font-semibold">{txn.totalSpending.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-slate-900 font-mono text-sm">{txn.frequency}</td>
                      <td className="px-3 py-2 text-right text-slate-900 font-mono text-sm">{txn.recency}d</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: txn.clusterColor + '20', color: txn.clusterColor }}>
                          {txn.cluster}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Model Evaluation Row */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-4">Phương pháp Elbow</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={elbowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="k" label={{ value: 'Số cụm (K)', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'WCSS', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line type="monotone" dataKey="wcss" stroke="#C084FC" strokeWidth={3} dot={{ fill: '#C084FC', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-4">Hệ số Silhouette</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={silhouetteData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="k" label={{ value: 'Số cụm (K)', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'Silhouette Score', angle: -90, position: 'insideLeft' }} domain={[0, 1]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#4ADE80" strokeWidth={3} dot={{ fill: '#4ADE80', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Visual Analysis Row */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-4">Phân bố cụm trong không gian 2D</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" dataKey="x" name="Recency" />
              <YAxis type="number" dataKey="y" name="Frequency" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={scatterData.filter(d => d.cluster === 0)} fill="#F87171" name="Vãng lai" />
              <Scatter data={scatterData.filter(d => d.cluster === 1)} fill="#4ADE80" name="Thân thiết" />
              <Scatter data={scatterData.filter(d => d.cluster === 2)} fill="#FCD34D" name="Trung thành" />
              <Scatter data={scatterData.filter(d => d.cluster === 3)} fill="#C084FC" name="VIP" />
              <Legend />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-4">Hồ sơ RFM theo cụm</h3>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis tick={false} />
              <Radar name="Vãng lai" dataKey="Vãng lai" stroke="#F87171" fill="#F87171" fillOpacity={0.3} />
              <Radar name="Thân thiết" dataKey="Thân thiết" stroke="#4ADE80" fill="#4ADE80" fillOpacity={0.3} />
              <Radar name="Trung thành" dataKey="Trung thành" stroke="#FCD34D" fill="#FCD34D" fillOpacity={0.3} />
              <Radar name="VIP" dataKey="VIP" stroke="#C084FC" fill="#C084FC" fillOpacity={0.3} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RFM Comparison */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-slate-900 font-semibold text-xl mb-6">So sánh chỉ số RFM giữa các cụm</h3>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <h4 className="text-slate-700 font-semibold text-sm mb-3">Độ mới (ngày)</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={recencyData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="cluster"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#8884d8"><Cell fill="#F87171"/><Cell fill="#4ADE80"/><Cell fill="#FCD34D"/><Cell fill="#C084FC"/></Bar></BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="text-slate-700 font-semibold text-sm mb-3">Số đơn trung bình</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={averageOrdersData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="cluster"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#8884d8"><Cell fill="#F87171"/><Cell fill="#4ADE80"/><Cell fill="#FCD34D"/><Cell fill="#C084FC"/></Bar></BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="text-slate-700 font-semibold text-sm mb-3">Tổng chi tiêu</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={totalSpendData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="cluster"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#8884d8"><Cell fill="#F87171"/><Cell fill="#4ADE80"/><Cell fill="#FCD34D"/><Cell fill="#C084FC"/></Bar></BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="text-slate-700 font-semibold text-sm mb-3">Giá trị TB đơn</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={averageOrderValueData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="cluster"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#8884d8"><Cell fill="#F87171"/><Cell fill="#4ADE80"/><Cell fill="#FCD34D"/><Cell fill="#C084FC"/></Bar></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}