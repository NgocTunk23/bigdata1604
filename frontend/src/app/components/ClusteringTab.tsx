import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  {
    name: 'At Risk',
    nameVi: 'Vãng lai',
    color: '#F87171',
    bgColor: '#FEE2E2',
    recency: 245,
    orders: 12,
    aov: 450,
  },
  {
    name: 'Regular',
    nameVi: 'Thân thiết',
    color: '#4ADE80',
    bgColor: '#D1FAE5',
    recency: 45,
    orders: 28,
    aov: 680,
  },
  {
    name: 'Loyal',
    nameVi: 'Trung thành',
    color: '#FCD34D',
    bgColor: '#FEF3C7',
    recency: 15,
    orders: 52,
    aov: 890,
  },
  {
    name: 'VIP',
    nameVi: 'VIP',
    color: '#C084FC',
    bgColor: '#F3E8FF',
    recency: 7,
    orders: 87,
    aov: 1250,
  },
];

const INITIAL_ELBOW_DATA = [
  { k: 2, wcss: 850 },
  { k: 3, wcss: 520 },
  { k: 4, wcss: 280 },
  { k: 5, wcss: 210 },
  { k: 6, wcss: 180 },
  { k: 7, wcss: 165 },
  { k: 8, wcss: 155 },
];

const INITIAL_SILHOUETTE_DATA = [
  { k: 2, score: 0.45 },
  { k: 3, score: 0.52 },
  { k: 4, score: 0.68 },
  { k: 5, score: 0.71 },
  { k: 6, score: 0.58 },
  { k: 7, score: 0.49 },
  { k: 8, score: 0.42 },
];

const generateScatterData = () => [
  ...Array.from({ length: 30 }, () => ({ x: Math.random() * 100 + 200, y: Math.random() * 50 + 10, cluster: 0 })),
  ...Array.from({ length: 40 }, () => ({ x: Math.random() * 80 + 30, y: Math.random() * 40 + 25, cluster: 1 })),
  ...Array.from({ length: 35 }, () => ({ x: Math.random() * 60 + 10, y: Math.random() * 60 + 45, cluster: 2 })),
  ...Array.from({ length: 25 }, () => ({ x: Math.random() * 50 + 5, y: Math.random() * 80 + 70, cluster: 3 })),
];

const generateTransaction = (id: number): TransactionData => {
  const clusterIdx = Math.floor(Math.random() * 4);
  const profile = CLUSTER_PROFILES[clusterIdx];

  return {
    id: `TXN${String(id).padStart(6, '0')}`,
    customerId: `KH${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
    totalSpending: Math.floor(profile.aov * (0.7 + Math.random() * 0.6)),
    frequency: Math.floor(profile.orders * (0.7 + Math.random() * 0.6)),
    recency: Math.floor(profile.recency * (0.7 + Math.random() * 0.6)),
    cluster: profile.nameVi,
    clusterColor: profile.color,
  };
};

export function ClusteringTab() {
  const [clusterDistribution, setClusterDistribution] = useState<ClusterData[]>([
    { name: 'Vãng lai', value: 245, color: '#F87171' },
    { name: 'Thân thiết', value: 328, color: '#4ADE80' },
    { name: 'Trung thành', value: 412, color: '#FCD34D' },
    { name: 'VIP', value: 198, color: '#C084FC' },
  ]);

  const [transactions, setTransactions] = useState<TransactionData[]>(
    Array.from({ length: 10 }, (_, i) => generateTransaction(i))
  );
  const [scatterData, setScatterData] = useState(generateScatterData());
  const [elbowData, setElbowData] = useState(INITIAL_ELBOW_DATA);
  const [silhouetteData, setSilhouetteData] = useState(INITIAL_SILHOUETTE_DATA);
  const [radarData, setRadarData] = useState([
    { metric: 'Độ mới', 'Vãng lai': 245, 'Thân thiết': 45, 'Trung thành': 15, VIP: 7 },
    { metric: 'Tần suất', 'Vãng lai': 12, 'Thân thiết': 28, 'Trung thành': 52, VIP: 87 },
    { metric: 'Giá trị', 'Vãng lai': 450, 'Thân thiết': 680, 'Trung thành': 890, VIP: 1250 },
  ]);
  const nextIdRef = useRef(10);

  useEffect(() => {
    const interval = setInterval(() => {
      setTransactions((prev) => {
        const newTxn = generateTransaction(nextIdRef.current);
        nextIdRef.current += 1;
        const updated = [newTxn, ...prev].slice(0, 15);
        return updated;
      });

      setClusterDistribution((prev) => {
        return prev.map((cluster) => ({
          ...cluster,
          value: cluster.value + Math.floor(Math.random() * 3),
        }));
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const totalDistribution = clusterDistribution.reduce((sum, c) => sum + c.value, 0);

  const recencyData = CLUSTER_PROFILES.map(p => ({ cluster: p.nameVi, value: p.recency }));
  const averageOrdersData = CLUSTER_PROFILES.map(p => ({ cluster: p.nameVi, value: p.orders }));
  const totalSpendData = CLUSTER_PROFILES.map(p => ({ cluster: p.nameVi, value: p.orders * p.aov }));
  const averageOrderValueData = CLUSTER_PROFILES.map(p => ({ cluster: p.nameVi, value: p.aov }));

  return (
    <div className="space-y-6">
      {/* 4 Cluster Profile Cards */}
      <div className="grid grid-cols-4 gap-4">
        {CLUSTER_PROFILES.map((profile, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
          >
            <div className="h-1.5 bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(to right, ${profile.color}, ${profile.color}CC)` }} />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="size-3 rounded-full"
                  style={{ backgroundColor: profile.color }}
                />
                <h3 className="text-slate-900" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                  {profile.nameVi}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600" style={{ fontSize: '0.8125rem' }}>Recency</span>
                  <span className="text-slate-900 font-mono" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {profile.recency}d
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600" style={{ fontSize: '0.8125rem' }}>Đơn hàng</span>
                  <span className="text-slate-900 font-mono" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {profile.orders}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600" style={{ fontSize: '0.8125rem' }}>AOV</span>
                  <span className="text-slate-900 font-mono" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {profile.aov.toLocaleString()}k
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Distribution Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-slate-900" style={{ fontWeight: 600, fontSize: '1.25rem' }}>
            Tỷ Lệ Loại Khách Hàng
          </h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-600" style={{ fontSize: '0.75rem', fontWeight: 600 }}>STREAMING</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Pie Chart */}
          <div className="col-span-2">
            <h4 className="text-slate-700 mb-4" style={{ fontWeight: 600, fontSize: '1rem' }}>
              Tỷ lệ Cụm khách hàng
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  key="pie"
                  data={clusterDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, payload }) => {
                    const radius = innerRadius + (outerRadius - innerRadius) * 1.25;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    
                    const darkColors: Record<string, string> = {
                      '#F87171': '#B91C1C', 
                      '#4ADE80': '#15803D', 
                      '#FCD34D': '#B45309', 
                      '#C084FC': '#7E22CE', 
                    };
                    const fillColor = darkColors[payload.color] || '#333333';
                    const percentage = (percent * 100).toFixed(1);

                    return (
                      <text 
                        x={x} 
                        y={y} 
                        fill={fillColor} 
                        textAnchor={x > cx ? 'start' : 'end'} 
                        dominantBaseline="central" 
                        style={{ fontWeight: 700, fontSize: '0.875rem' }}
                      >
                        {percentage}%
                      </text>
                    );
                  }}
                  outerRadius={100}
                  innerRadius={60}
                  dataKey="value"
                  animationDuration={800}
                >
                  {clusterDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip
                  key="tooltip"
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const percentage = ((data.value / totalDistribution) * 100).toFixed(1);
                      return (
                        <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-lg">
                          <p className="text-slate-900 mb-1" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {data.name}
                          </p>
                          <p className="text-slate-600 font-mono" style={{ fontSize: '0.875rem' }}>
                            Số lượng: {data.value}
                          </p>
                          <p className="text-purple-600 font-mono" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            {percentage}% tổng
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {clusterDistribution.map((cluster, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="size-3 rounded-full" style={{ backgroundColor: cluster.color }} />
                  <span className="text-slate-600" style={{ fontSize: '0.8125rem' }}>{cluster.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Table */}
          <div className="col-span-3">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-600" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Mã GD</th>
                    <th className="px-3 py-2 text-left text-slate-600" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Mã KH</th>
                    <th className="px-3 py-2 text-right text-slate-600" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Chi tiêu</th>
                    <th className="px-3 py-2 text-right text-slate-600" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Tần suất</th>
                    <th className="px-3 py-2 text-right text-slate-600" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Độ trễ</th>
                    <th className="px-3 py-2 text-center text-slate-600" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Phân loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transactions.slice(0, 10).map((txn, idx) => (
                    <tr
                      key={txn.id}
                      className={`hover:bg-slate-50 transition-colors ${idx === 0 ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="px-3 py-2 text-slate-600 font-mono" style={{ fontSize: '0.8125rem' }}>{txn.id}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono" style={{ fontSize: '0.8125rem' }}>{txn.customerId}</td>
                      <td className="px-3 py-2 text-right text-slate-900 font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                        {txn.totalSpending.toLocaleString()}k
                      </td>
                      <td className="px-3 py-2 text-right text-slate-900 font-mono" style={{ fontSize: '0.8125rem' }}>{txn.frequency}</td>
                      <td className="px-3 py-2 text-right text-slate-900 font-mono" style={{ fontSize: '0.8125rem' }}>{txn.recency}d</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className="px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: txn.clusterColor + '20', // Thêm opacity 20% cho màu nền
                            color: {
                              '#F87171': '#B91C1C', 
                              '#4ADE80': '#15803D', 
                              '#FCD34D': '#B45309', 
                              '#C084FC': '#7E22CE', 
                            }[txn.clusterColor] || '#333333',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
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
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-slate-900" style={{ fontWeight: 600, fontSize: '1.125rem' }}>
              Phương pháp Elbow
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={elbowData}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis key="xaxis" dataKey="k" label={{ value: 'Số cụm (K)', position: 'insideBottom', offset: -5 }} tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis key="yaxis" label={{ value: 'WCSS', angle: -90, position: 'insideLeft' }} tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip key="tooltip" />
              <Line key="line" type="monotone" dataKey="wcss" stroke="#C084FC" strokeWidth={3} dot={{ fill: '#C084FC', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-slate-900" style={{ fontWeight: 600, fontSize: '1.125rem' }}>
              Hệ số Silhouette
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={silhouetteData}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis key="xaxis" dataKey="k" label={{ value: 'Số cụm (K)', position: 'insideBottom', offset: -5 }} tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis key="yaxis" label={{ value: 'Silhouette Score', angle: -90, position: 'insideLeft' }} tick={{ fill: '#64748B', fontSize: 12 }} domain={[0, 1]} />
              <Tooltip key="tooltip" />
              <Line key="line" type="monotone" dataKey="score" stroke="#4ADE80" strokeWidth={3} dot={{ fill: '#4ADE80', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Visual Analysis Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Scatter Plot */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-slate-900" style={{ fontWeight: 600, fontSize: '1.125rem' }}>
              Phân bố cụm trong không gian 2D
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis key="xaxis" type="number" dataKey="x" name="Recency" label={{ value: 'Recency (ngày)', position: 'insideBottom', offset: -5 }} tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis key="yaxis" type="number" dataKey="y" name="Frequency" label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip key="tooltip" cursor={{ strokeDasharray: '3 3' }} />
              <Scatter key="scatter0" data={scatterData.filter(d => d.cluster === 0)} fill="#F87171" shape="circle" name="Vãng lai" />
              <Scatter key="scatter1" data={scatterData.filter(d => d.cluster === 1)} fill="#4ADE80" shape="circle" name="Thân thiết" />
              <Scatter key="scatter2" data={scatterData.filter(d => d.cluster === 2)} fill="#FCD34D" shape="circle" name="Trung thành" />
              <Scatter key="scatter3" data={scatterData.filter(d => d.cluster === 3)} fill="#C084FC" shape="circle" name="VIP" />
              <Legend key="legend" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-slate-900" style={{ fontWeight: 600, fontSize: '1.125rem' }}>
              Hồ sơ RFM theo cụm
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid key="grid" stroke="#E2E8F0" />
              <PolarAngleAxis key="angle" dataKey="metric" tick={{ fill: '#64748B', fontSize: 12 }} />
              <PolarRadiusAxis key="radius" tick={false} />
              <Radar key="radar0" name="Vãng lai" dataKey="Vãng lai" stroke="#F87171" fill="#F87171" fillOpacity={0.3} />
              <Radar key="radar1" name="Thân thiết" dataKey="Thân thiết" stroke="#4ADE80" fill="#4ADE80" fillOpacity={0.3} />
              <Radar key="radar2" name="Trung thành" dataKey="Trung thành" stroke="#FCD34D" fill="#FCD34D" fillOpacity={0.3} />
              <Radar key="radar3" name="VIP" dataKey="VIP" stroke="#C084FC" fill="#C084FC" fillOpacity={0.3} />
              <Legend key="legend" />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RFM Comparison - 4 separate charts */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-slate-900 mb-6" style={{ fontWeight: 600, fontSize: '1.25rem' }}>
          So sánh chỉ số RFM giữa các cụm
        </h3>
        <div className="grid grid-cols-4 gap-6">
          {/* Recency */}
          <div>
            <h4 className="text-slate-700 mb-3" style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Độ mới (ngày)</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={recencyData}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis key="xaxis" dataKey="cluster" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis key="yaxis" tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip key="tooltip" />
                <Bar key="bar" dataKey="value" radius={[8, 8, 0, 0]}>
                  {recencyData.map((entry, index) => {
                    const color = clusterDistribution.find(c => c.name === entry.cluster)?.color || '#CBD5E1';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Average Orders */}
          <div>
            <h4 className="text-slate-700 mb-3" style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Số đơn trung bình</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={averageOrdersData}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis key="xaxis" dataKey="cluster" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis key="yaxis" tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip key="tooltip" />
                <Bar key="bar" dataKey="value" radius={[8, 8, 0, 0]}>
                  {averageOrdersData.map((entry, index) => {
                    const color = clusterDistribution.find(c => c.name === entry.cluster)?.color || '#CBD5E1';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Total Spend */}
          <div>
            <h4 className="text-slate-700 mb-3" style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Tổng chi tiêu</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={totalSpendData}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis key="xaxis" dataKey="cluster" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis key="yaxis" tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip key="tooltip" formatter={(value: number) => value.toLocaleString()} />
                <Bar key="bar" dataKey="value" radius={[8, 8, 0, 0]}>
                  {totalSpendData.map((entry, index) => {
                    const color = clusterDistribution.find(c => c.name === entry.cluster)?.color || '#CBD5E1';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Average Order Value */}
          <div>
            <h4 className="text-slate-700 mb-3" style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Giá trị TB đơn</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={averageOrderValueData}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis key="xaxis" dataKey="cluster" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis key="yaxis" tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip key="tooltip" formatter={(value: number) => value.toLocaleString()} />
                <Bar key="bar" dataKey="value" radius={[8, 8, 0, 0]}>
                  {averageOrderValueData.map((entry, index) => {
                    const color = clusterDistribution.find(c => c.name === entry.cluster)?.color || '#CBD5E1';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
