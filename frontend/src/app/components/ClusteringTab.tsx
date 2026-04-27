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
  { name: 'At Risk', nameVi: 'Vãng lai', color: '#F87171', bgColor: '#FEE2E2', id: 2 },
  { name: 'Regular', nameVi: 'Thân thiết', color: '#4ADE80', bgColor: '#D1FAE5', id: 0 },
  { name: 'Loyal', nameVi: 'Trung thành', color: '#FCD34D', bgColor: '#FEF3C7', id: 1 },
  { name: 'VIP', nameVi: 'VIP', color: '#C084FC', bgColor: '#F3E8FF', id: 3 },
];

export function ClusteringTab({ liveData }: { liveData: any }) {
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

  // 1. Cập nhật hàm tạo radarData có chuẩn hóa dữ liệu
  const radarData = useMemo(() => {
    // Tìm max của từng trục
    const maxR = Math.max(...[0,1,2,3].map(i => getAvg(i, 'recency_days'))) || 1;
    const maxF = Math.max(...[0,1,2,3].map(i => getAvg(i, 'total_orders'))) || 1;
    const maxM = Math.max(...[0,1,2,3].map(i => getAvg(i, 'total_spend'))) || 1;

    // Chuẩn hóa về thang 100% theo % max
    return [
      {
        metric: 'Độ mới',
        [CLUSTER_PROFILES[0].nameVi]: (getAvg(0, 'recency_days') / maxR) * 100,
        [CLUSTER_PROFILES[1].nameVi]: (getAvg(1, 'recency_days') / maxR) * 100,
        [CLUSTER_PROFILES[2].nameVi]: (getAvg(2, 'recency_days') / maxR) * 100,
        [CLUSTER_PROFILES[3].nameVi]: (getAvg(3, 'recency_days') / maxR) * 100,
      },
      {
        metric: 'Tần suất',
        [CLUSTER_PROFILES[0].nameVi]: (getAvg(0, 'total_orders') / maxF) * 100,
        [CLUSTER_PROFILES[1].nameVi]: (getAvg(1, 'total_orders') / maxF) * 100,
        [CLUSTER_PROFILES[2].nameVi]: (getAvg(2, 'total_orders') / maxF) * 100,
        [CLUSTER_PROFILES[3].nameVi]: (getAvg(3, 'total_orders') / maxF) * 100,
      },
      {
        metric: 'Giá trị',
        [CLUSTER_PROFILES[0].nameVi]: (getAvg(0, 'total_spend') / maxM) * 100,
        [CLUSTER_PROFILES[1].nameVi]: (getAvg(1, 'total_spend') / maxM) * 100,
        [CLUSTER_PROFILES[2].nameVi]: (getAvg(2, 'total_spend') / maxM) * 100,
        [CLUSTER_PROFILES[3].nameVi]: (getAvg(3, 'total_spend') / maxM) * 100,
      }
    ];
  }, [users]);

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
    // Tự động ăn theo port hiện tại của React và gọi qua proxy
    const ws = new WebSocket(`ws://${window.location.host}/ws/clusters`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Dữ liệu từ ws_server.py gửi data.cluster là các số 0, 1, 2, 3
      const profile = CLUSTER_PROFILES.find(p => p.id === data.cluster) || CLUSTER_PROFILES[0];
      
      const newTxn: TransactionData = {
        id: `TXN${Math.floor(Math.random() * 100000)}`,
        customerId: data.CustomerNo,
        totalSpending: Math.round(data.total_spend),
        frequency: data.total_orders,
        recency: data.recency_days,
        cluster: profile.nameVi,
        clusterColor: profile.color,
      };

      setTransactions((prev) => [newTxn, ...prev].slice(0, 15));

      setClusterDistribution((prev) => 
        prev.map((c) => c.name === profile.nameVi ? { ...c, value: c.value + 1 } : c)
      );
    };

    return () => ws.close();
  }, []); // Chỉ chạy 1 lần khi khởi tạo, không bị reset nhờ CSS hidden

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
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-4">Phương pháp Elbow</h3>
          <ResponsiveContainer width="100%" height={280}>
            {/* Thêm margin ở đây */}
            <LineChart data={elbowData} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              {/* Đổi position thành 'bottom' để không bị lẹm */}
              <XAxis dataKey="k" label={{ value: 'Số cụm (K)', position: 'bottom', offset: 5 }} />
              {/* Cấp width={80} cho YAxis để có không gian cho chữ WCSS */}
              <YAxis width={80} label={{ value: 'WCSS', angle: -90, position: 'insideLeft', offset: -10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="wcss" stroke="#C084FC" strokeWidth={3} dot={{ fill: '#C084FC', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-4">Hệ số Silhouette</h3>
          <ResponsiveContainer width="100%" height={280}>
            {/* Thêm margin tương tự */}
            <LineChart data={silhouetteData} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="k" label={{ value: 'Số cụm (K)', position: 'bottom', offset: 5 }} />
              {/* Cấp width={80} cho YAxis */}
              <YAxis 
                width={80} 
                label={{ value: 'Silhouette Score', angle: -90, position: 'insideLeft', offset: -10 }} 
                domain={['dataMin - 0.05', 'dataMax + 0.05']} 
                tickFormatter={(tick) => tick.toFixed(2)}
              />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#4ADE80" strokeWidth={3} dot={{ fill: '#4ADE80', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      {/* Visual Analysis Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Render Scatter Chart tự động theo CLUSTER_PROFILES */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-4">Phân bố cụm trong không gian 2D</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" dataKey="x" name="Recency" />
              <YAxis type="number" dataKey="y" name="Frequency" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              {[0, 1, 2, 3].map(clusterId => (
                <Scatter key={clusterId} data={scatterData.filter(d => d.cluster === clusterId)} fill={CLUSTER_PROFILES[clusterId].color} name={CLUSTER_PROFILES[clusterId].nameVi} />
              ))}
              <Legend />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Render Radar Chart tự động theo CLUSTER_PROFILES */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-4">Hồ sơ RFM theo cụm</h3>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis tick={false} />
              {[0, 1, 2, 3].map(idx => (
                 <Radar key={idx} name={CLUSTER_PROFILES[idx].nameVi} dataKey={CLUSTER_PROFILES[idx].nameVi} stroke={CLUSTER_PROFILES[idx].color} fill={CLUSTER_PROFILES[idx].color} fillOpacity={0.3} />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RFM Comparison */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-slate-900 font-semibold text-xl mb-6">So sánh chỉ số RFM giữa các cụm</h3>
        <div className="grid grid-cols-4 gap-6">
          {/* Biểu đồ 1: Độ mới */}
          <div>
            <h4 className="text-slate-700 font-semibold text-sm mb-3">Độ mới (ngày)</h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={recencyData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="cluster" interval={0} tick={{ fontSize: 11 }} height={40} />
                <YAxis width={40} tick={{ fontSize: 11 }} />
                <Tooltip/>
                <Bar dataKey="value">
                  {recencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CLUSTER_PROFILES[index].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Biểu đồ 2: Tần suất */}
          <div>
            <h4 className="text-slate-700 font-semibold text-sm mb-3">Số đơn trung bình</h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={averageOrdersData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="cluster" interval={0} tick={{ fontSize: 11 }} height={40} />
                <YAxis width={40} tick={{ fontSize: 11 }} />
                <Tooltip/>
                <Bar dataKey="value">
                  {averageOrdersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CLUSTER_PROFILES[index].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Biểu đồ 3: Tổng chi tiêu */}
          <div>
            <h4 className="text-slate-700 font-semibold text-sm mb-3">Tổng chi tiêu</h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={totalSpendData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="cluster" interval={0} tick={{ fontSize: 11 }} height={40} />
                <YAxis width={50} tick={{ fontSize: 11 }} />
                <Tooltip/>
                <Bar dataKey="value">
                  {totalSpendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CLUSTER_PROFILES[index].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Biểu đồ 4: AOV */}
          <div>
            <h4 className="text-slate-700 font-semibold text-sm mb-3">Giá trị TB đơn</h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={averageOrderValueData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="cluster" interval={0} tick={{ fontSize: 11 }} height={40} />
                <YAxis width={50} tick={{ fontSize: 11 }} />
                <Tooltip/>
                <Bar dataKey="value">
                  {averageOrderValueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CLUSTER_PROFILES[index].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}