import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ClusteringTabProps {
  transactions: any[]; // Dữ liệu từ topic recommendation_stream
}

const COLORS = {
  VIP: "#C084FC",
  "Trung thành": "#FCD34D",
  "Thân thiết": "#4ADE80",
  "Nguy cơ": "#F87171",
};

export function ClusteringTab({ transactions }: ClusteringTabProps) {
  // Logic tính toán tỷ lệ cụm từ 15 giao dịch gần nhất
  const distribution = Object.entries(
    transactions.reduce((acc: any, curr) => {
      const label = curr.rfm_label || "Khác";
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-slate-900 font-bold text-xl">
            Giám sát Phân loại Khách hàng Real-time
          </h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-600 text-xs font-bold uppercase">
              Streaming
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Biểu đồ tròn tỷ lệ cụm */}
          <div className="col-span-2 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        COLORS[entry.name as keyof typeof COLORS] || "#CBD5E1"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bảng giao dịch real-time */}
          <div className="col-span-3 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="px-4 py-3">Mã KH</th>
                  <th className="px-4 py-3">Chi tiêu</th>
                  <th className="px-4 py-3">Tần suất</th>
                  <th className="px-4 py-3 text-center">Phân loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((txn, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-600">
                      {txn.CustomerNo || "N/A"}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {txn.monetary_val?.toLocaleString()}$
                    </td>
                    <td className="px-4 py-3">{txn.frequency_val}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: `${COLORS[txn.rfm_label as keyof typeof COLORS] || "#CBD5E1"}20`,
                          color:
                            COLORS[txn.rfm_label as keyof typeof COLORS] ||
                            "#64748B",
                        }}
                      >
                        {txn.rfm_label || "Chưa xác định"}
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
  );
}
