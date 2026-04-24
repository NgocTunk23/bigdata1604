import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid
} from 'recharts';
import { ShoppingBag, DollarSign, Activity } from "lucide-react";

type RealtimeTxnRow = {
  transactionNo: string;
  customerNo: string;
  items: string;
};

const DASHBOARD_STREAM_STATE_KEY = "dashboard_stream_state_v1";

function readPersistedDashboardState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(DASHBOARD_STREAM_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const persisted = readPersistedDashboardState();

  const [topProducts, setTopProducts] = useState<any[]>(persisted?.topProducts ?? []);
  const [lineData, setLineData] = useState<any[]>(persisted?.lineData ?? []);
  const [realtimeTxCount, setRealtimeTxCount] = useState<number>(persisted?.realtimeTxCount ?? 0);
  const [realtimeRevenue, setRealtimeRevenue] = useState<number>(persisted?.realtimeRevenue ?? 0);
  const [realtimeTxRows, setRealtimeTxRows] = useState<RealtimeTxnRow[]>(persisted?.realtimeTxRows ?? []);
  const topProductsRef = useRef<any>(persisted?.topProductsMap ?? {}); // Dùng Ref để lưu trữ tạm bộ đếm sản phẩm
  const seenTransactionsRef = useRef<Set<string>>(new Set(persisted?.seenTransactions ?? []));
  const MAX_REALTIME_ROWS = 300;

  useEffect(() => {
    // Chỉ giữ chart top products từ API cũ, các card metrics lấy trực tiếp từ stream.
    axios.get("http://localhost:8000/api/v1/dashboard/metrics")
      .catch(err => console.error("Lỗi lấy metrics ban đầu:", err));

    // 2. Kết nối WebSocket để lấy dữ liệu Streaming
    const socket = new WebSocket("ws://localhost:8000/ws/dashboard");

    socket.onmessage = (event) => {
      const response = JSON.parse(event.data);
      const { topic, data } = response;

      // Xử lý TOP PRODUCTS (Cập nhật cột ngang)
      if (topic === 'top_products_stream') {
        // Lưu vào object để cập nhật số lượng mới nhất
        topProductsRef.current[data.product] = data.total_sold;
        
        // Chuyển sang mảng, sắp xếp và lấy Top 10
        const sorted = Object.entries(topProductsRef.current)
          .map(([name, value]) => ({ name, value: Number(value) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
        
        setTopProducts(sorted);
      }

      // Xử lý GIAO DỊCH REAL-TIME (Cập nhật đường Line)
      if (topic === 'recommendation_stream') {
        const txnNo = String(data?.TransactionNo ?? "").trim();
        if (!txnNo || seenTransactionsRef.current.has(txnNo)) return;
        seenTransactionsRef.current.add(txnNo);

        const customerNo = String(data?.CustomerNo ?? "").trim();
        const rawItems = Array.isArray(data?.items) ? data.items : [];
        const normalizedItems = rawItems.map((it: unknown) => String(it)).filter(Boolean);
        const estimatedRevenue = Number(data?.monetary_val ?? 0) || 0;

        setRealtimeTxCount((prev) => prev + 1);
        setRealtimeRevenue((prev) => prev + estimatedRevenue);
        setRealtimeTxRows((prev) => {
          const nextRows = [
            {
              transactionNo: txnNo,
              customerNo,
              items: normalizedItems.join(", "),
            },
            ...prev,
          ];
          return nextRows.slice(0, MAX_REALTIME_ROWS);
        });

        setLineData((prev) => {
          const newData = [...prev, { 
            time: new Date().toLocaleTimeString(), 
            count: prev.length > 0 ? prev[prev.length - 1].count + 1 : 1
          }];
          return newData.slice(-20); // Chỉ giữ lại 20 điểm dữ liệu gần nhất
        });
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      topProducts,
      lineData,
      realtimeTxCount,
      realtimeRevenue,
      realtimeTxRows,
      topProductsMap: topProductsRef.current,
      seenTransactions: Array.from(seenTransactionsRef.current),
    };
    window.sessionStorage.setItem(DASHBOARD_STREAM_STATE_KEY, JSON.stringify(payload));
  }, [topProducts, lineData, realtimeTxCount, realtimeRevenue, realtimeTxRows]);

  return (
    <div className="min-h-screen p-6 space-y-6 bg-[#1f2228] text-[#e8edf3]">
      
      {/* SECTION 1: METRIC CARDS REALTIME */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard 
          title="Giao Dịch" 
          value={realtimeTxCount.toLocaleString()} 
          icon={<ShoppingBag className="text-blue-400" />} 
        />
      </div>

      {/* SECTION 2: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        
        {/* Biểu đồ ngang cập nhật từ Kafka 'top_products_stream' */}
        <Card className="bg-[#353a44] border-[#4a6072] text-[#e8edf3]">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" /> Top 10 Sản Phẩm (Kafka Live)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 40, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a6072" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#7b9bb8" fontSize={10} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2228', border: '1px solid #4a6072' }} />
                <Bar dataKey="value" fill="#60a5fa" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* SECTION 3: BẢNG GIAO DỊCH REALTIME */}
      <Card className="bg-[#353a44] border-[#4a6072] text-[#e8edf3]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Danh sách giao dịch realtime
          </CardTitle>
          <span className="text-[10px] text-[#7b9bb8] uppercase">Mới nhất ở trên cùng</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[360px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-[#1f2228]/80">
                <TableRow className="border-[#4a6072]">
                  <TableHead className="text-[#7b9bb8] text-[11px] uppercase">Mã GD</TableHead>
                  <TableHead className="text-[#7b9bb8] text-[11px] uppercase">Mã KH</TableHead>
                  <TableHead className="text-[#7b9bb8] text-[11px] uppercase">Giỏ hàng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realtimeTxRows.map((row) => (
                  <TableRow key={`${row.transactionNo}-${row.customerNo}`} className="border-[#4a6072] hover:bg-[#4a6072]/40 transition-colors">
                    <TableCell className="font-mono text-[11px] text-[#7b9bb8]">{row.transactionNo}</TableCell>
                    <TableCell className="font-medium text-sm text-green-400">{row.customerNo || "-"}</TableCell>
                    <TableCell className="text-sm text-[#e8edf3]">{row.items || "-"}</TableCell>
                  </TableRow>
                ))}
                {realtimeTxRows.length === 0 && (
                  <TableRow className="border-[#4a6072]">
                    <TableCell colSpan={3} className="text-center text-[#7b9bb8] py-6">
                      Chua co giao dich realtime
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon }: any) {
  return (
    <Card className="bg-[#353a44] border-[#4a6072] text-[#e8edf3]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-bold text-[#7b9bb8] uppercase tracking-wider">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}