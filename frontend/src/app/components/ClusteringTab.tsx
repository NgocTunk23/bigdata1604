import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';

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

// 1. Định nghĩa chuẩn Profile theo ID từ mô hình RFM
const CLUSTER_PROFILES = [

  { name: 'At Risk', nameVi: 'Vãng lai', color: '#F87171', bgColor: '#FEE2E2', id: 0 }, 
  { name: 'Hibernating', nameVi: 'Ngủ đông', color: '#94A3B8', bgColor: '#F1F5F9', id: 1 }, 
  { name: 'Potential', nameVi: 'Tiềm năng', color: '#4ADE80', bgColor: '#D1FAE5', id: 2 }, 
  { name: 'VIP', nameVi: 'VIP', color: '#C084FC', bgColor: '#F3E8FF', id: 3 }, 
];

export const ClusteringTab = React.memo(function ClusteringTab({ liveData }: { liveData?: any }) {
  // Logic lấy dữ liệu tĩnh
  const elbowData = useMemo(() => clusteringData.map((d: any) => ({ k: d.k, wcss: d.wcss })), []);
  const silhouetteData = useMemo(() => clusteringData.map((d: any) => ({ k: d.k, score: d.silhouette })), []);

  const users = useMemo(() => {
    return rawUsersData.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  }, []);

  const scatterData = useMemo(() => users.map((u: any) => ({
    x: u.recency_days,
    y: u.total_orders,
    cluster: u.cluster
  })), [users]);

  const getAvg = (clusterId: number, field: string) => {
    const cUsers = users.filter((u: any) => u.cluster === clusterId);
    if (!cUsers.length) return 0;
    return Math.round(cUsers.reduce((sum: number, u: any) => sum + u[field], 0) / cUsers.length);
  };

  const radarData = useMemo(() => {
    const maxR = Math.max(...[0,1,2,3].map(i => getAvg(i, 'recency_days'))) || 1;
    const maxF = Math.max(...[0,1,2,3].map(i => getAvg(i, 'total_orders'))) || 1;
    const maxM = Math.max(...[0,1,2,3].map(i => getAvg(i, 'total_spend'))) || 1;

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

  // 2. Cập nhật state Distribution đúng thứ tự màu
  const [clusterDistribution, setClusterDistribution] = useState<ClusterData[]>([
    { name: 'Vãng lai', value: 0, color: '#F87171' },
    { name: 'Ngủ đông', value: 0, color: '#94A3B8' },//
    { name: 'Tiềm năng', value: 0, color: '#4ADE80' },
    { name: 'VIP', value: 0, color: '#C084FC' },
  ]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws/clusters`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
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
  }, []);

  return (
    <div className="space-y-6">
      {/* Cluster Cards */}
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

      {/* Distribution & Live Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-slate-900 font-semibold text-xl mb-6">Tỷ Lệ Loại Khách Hàng (Live)</h3>
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-2">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clusterDistribution}
                  cx="50%" cy="50%"
                  isAnimationActive={false}
                  outerRadius={100} innerRadius={60} dataKey="value"
                >
                  {clusterDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="col-span-3">
            <div className="overflow-x-auto rounded-lg border border-slate-200 h-[300px]">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold">Mã GD</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">Mã KH</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold">Chi tiêu</th>
                    <th className="px-3 py-2 text-center text-sm font-semibold">Phân loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transactions.map((txn, idx) => (
                    <tr key={`${txn.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-mono text-sm">{txn.id}</td>
                      <td className="px-3 py-2 font-mono text-sm">{txn.customerId}</td>
                      <td className="px-3 py-2 text-right font-mono text-sm font-semibold">{txn.totalSpending.toLocaleString()}</td>
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

      {/* Model Evaluation Charts - Đã xóa isAnimationActive ở Chart component để hết lỗi TS */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-4">Phương pháp Elbow</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={elbowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="k" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="wcss" stroke="#C084FC" strokeWidth={3} dot={{ fill: '#C084FC', r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-4">Hệ số Silhouette</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={silhouetteData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="k" />
              <YAxis domain={['dataMin - 0.05', 'dataMax + 0.05']} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#4ADE80" strokeWidth={3} dot={{ fill: '#4ADE80', r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Visual Analysis */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-4">Phân bố cụm (Scatter)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="Recency" />
              <YAxis type="number" dataKey="y" name="Frequency" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              {[0, 1, 2, 3].map(id => (
                <Scatter key={id} data={scatterData.filter(d => d.cluster === id)} fill={CLUSTER_PROFILES[id].color} name={CLUSTER_PROFILES[id].nameVi} isAnimationActive={false} />
              ))}
              <Legend />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-slate-900 font-semibold text-lg mb-4">Hồ sơ Radar RFM</h3>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis tick={false} />
              {[0, 1, 2, 3].map(idx => (
                 <Radar key={idx} name={CLUSTER_PROFILES[idx].nameVi} dataKey={CLUSTER_PROFILES[idx].nameVi} stroke={CLUSTER_PROFILES[idx].color} fill={CLUSTER_PROFILES[idx].color} fillOpacity={0.3} isAnimationActive={false} />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RFM Comparison Bars */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-slate-900 font-semibold text-xl mb-6">So sánh chỉ số RFM giữa các cụm</h3>
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: 'Độ mới (ngày)', data: recencyData },
            { label: 'Số đơn trung bình', data: averageOrdersData },
            { label: 'Tổng chi tiêu', data: totalSpendData },
            { label: 'Giá trị TB đơn', data: averageOrderValueData }
          ].map((item, i) => (
            <div key={i}>
              <h4 className="text-slate-700 font-semibold text-sm mb-3">{item.label}</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={item.data}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="cluster" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip/>
                  <Bar dataKey="value" isAnimationActive={false}>
                    {item.data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CLUSTER_PROFILES[index].color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});