import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid
} from 'recharts';
import { ShoppingBag, DollarSign, Activity, Users, Package, Wallet } from "lucide-react";

type RealtimeTxnRow = {
  transactionNo: string;
  customerNo: string;
  items: string;
};

const DASHBOARD_STREAM_STATE_KEY = "dashboard_stream_state_v1";
const ONE_MINUTE_MS = 60_000;

type RealtimeMetrics = {
  tx: number;
  revenue: number;
  customers: number;
  products: number;
  aov: number;
};

type MetricGrowth = {
  tx: string;
  revenue: string;
  customers: string;
  products: string;
  aov: string;
};

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
  const [realtimeCustomerCount, setRealtimeCustomerCount] = useState<number>(persisted?.realtimeCustomerCount ?? 0);
  const [realtimeProductCount, setRealtimeProductCount] = useState<number>(persisted?.realtimeProductCount ?? 0);
  const [realtimeAov, setRealtimeAov] = useState<number>(persisted?.realtimeAov ?? 0);
  const [growth, setGrowth] = useState<MetricGrowth>(persisted?.growth ?? {
    tx: "0.0%",
    revenue: "0.0%",
    customers: "0.0%",
    products: "0.0%",
    aov: "0.0%",
  });
  const [realtimeTxRows, setRealtimeTxRows] = useState<RealtimeTxnRow[]>(persisted?.realtimeTxRows ?? []);
  const topProductsRef = useRef<any>(persisted?.topProductsMap ?? {}); // Dùng Ref để lưu trữ tạm bộ đếm sản phẩm
  const seenTransactionsRef = useRef<Set<string>>(new Set(persisted?.seenTransactions ?? []));
  const seenCustomersRef = useRef<Set<string>>(new Set(persisted?.seenCustomers ?? []));
  const seenProductsRef = useRef<Set<string>>(new Set(persisted?.seenProducts ?? []));
  const metricHistoryRef = useRef<Array<{ ts: number; metrics: RealtimeMetrics }>>(persisted?.metricHistory ?? []);
  const metricCurrentRef = useRef<RealtimeMetrics>({
    tx: persisted?.realtimeTxCount ?? 0,
    revenue: persisted?.realtimeRevenue ?? 0,
    customers: persisted?.realtimeCustomerCount ?? 0,
    products: persisted?.realtimeProductCount ?? 0,
    aov: persisted?.realtimeAov ?? 0,
  });
  const MAX_REALTIME_ROWS = 300;
  const metricCardStyles: Record<string, string> = {
    "Giao Dịch": "bg-[#eaf3ff] border-[#c8dcf5]",
    "Doanh thu": "bg-[#eaf9ef] border-[#c5ebd0]",
    "Khách hàng": "bg-[#e8f9fb] border-[#bfeff4]",
    AOV: "bg-[#fff4e8] border-[#ffdcbc]",
    "Sản phẩm": "bg-[#f3edff] border-[#d8c9fb]",
  };

  const formatGrowth = (current: number, previous: number) => {
    if (previous <= 0) {
      return current > 0 ? "+100.0%" : "0.0%";
    }
    const pct = ((current - previous) / previous) * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
  };

  const updateGrowthByTimeline = (currentMetrics: RealtimeMetrics) => {
    const now = Date.now();
    const history = [...metricHistoryRef.current, { ts: now, metrics: currentMetrics }].filter(
      (point) => now - point.ts <= ONE_MINUTE_MS * 2
    );
    metricHistoryRef.current = history;

    const baselineCandidates = history.filter((point) => point.ts <= now - ONE_MINUTE_MS);
    const baseline =
      baselineCandidates[baselineCandidates.length - 1] ??
      history[0] ??
      { ts: now, metrics: { tx: 0, revenue: 0, customers: 0, products: 0, aov: 0 } };

    setGrowth({
      tx: formatGrowth(currentMetrics.tx, baseline.metrics.tx),
      revenue: formatGrowth(currentMetrics.revenue, baseline.metrics.revenue),
      customers: formatGrowth(currentMetrics.customers, baseline.metrics.customers),
      products: formatGrowth(currentMetrics.products, baseline.metrics.products),
      aov: formatGrowth(currentMetrics.aov, baseline.metrics.aov),
    });
  };

  useEffect(() => {
    // Chỉ giữ chart top products từ API cũ, các card metrics lấy trực tiếp từ stream.
    axios.get("http://localhost:8000/api/v1/dashboard/metrics")
      .catch(err => console.error("Lỗi lấy metrics ban đầu:", err));

    // Kết nối WebSocket để lấy dữ liệu Streaming
    const socket = new WebSocket("ws://localhost:8000/ws/dashboard");

    socket.onmessage = (event) => {
      const response = JSON.parse(event.data);
      const { topic, data } = response;

      // Xử lý TOP PRODUCTS
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

      // Xử lý GIAO DỊCH REAL-TIME
      if (topic === 'recommendation_stream') {
        const txnNo = String(data?.TransactionNo ?? "").trim();
        if (!txnNo || seenTransactionsRef.current.has(txnNo)) return;
        seenTransactionsRef.current.add(txnNo);

        const customerNo = String(data?.CustomerNo ?? "").trim();
        const rawItems = Array.isArray(data?.items) ? data.items : [];
        const normalizedItems: string[] = rawItems.map((it: unknown) => String(it)).filter(Boolean);
        const estimatedRevenue = Number(data?.monetary_val ?? 0) || 0;

        if (customerNo) {
          seenCustomersRef.current.add(customerNo);
        }
        normalizedItems.forEach((item) => seenProductsRef.current.add(item));

        const nextTxCount = metricCurrentRef.current.tx + 1;
        const nextRevenue = metricCurrentRef.current.revenue + estimatedRevenue;
        const nextCustomerCount = seenCustomersRef.current.size;
        const nextProductCount = seenProductsRef.current.size;
        const nextAov = nextTxCount > 0 ? nextRevenue / nextTxCount : 0;
        metricCurrentRef.current = {
          tx: nextTxCount,
          revenue: nextRevenue,
          customers: nextCustomerCount,
          products: nextProductCount,
          aov: nextAov,
        };

        setRealtimeTxCount(nextTxCount);
        setRealtimeRevenue(nextRevenue);
        setRealtimeCustomerCount(nextCustomerCount);
        setRealtimeProductCount(nextProductCount);
        setRealtimeAov(nextAov);
        updateGrowthByTimeline({
          tx: nextTxCount,
          revenue: nextRevenue,
          customers: nextCustomerCount,
          products: nextProductCount,
          aov: nextAov,
        });
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
      realtimeCustomerCount,
      realtimeProductCount,
      realtimeAov,
      growth,
      realtimeTxRows,
      topProductsMap: topProductsRef.current,
      seenTransactions: Array.from(seenTransactionsRef.current),
      seenCustomers: Array.from(seenCustomersRef.current),
      seenProducts: Array.from(seenProductsRef.current),
      metricHistory: metricHistoryRef.current,
    };
    window.sessionStorage.setItem(DASHBOARD_STREAM_STATE_KEY, JSON.stringify(payload));
  }, [
    topProducts,
    lineData,
    realtimeTxCount,
    realtimeRevenue,
    realtimeCustomerCount,
    realtimeProductCount,
    realtimeAov,
    growth,
    realtimeTxRows,
  ]);

  return (
    <div className="min-h-screen p-6 space-y-6 bg-[#f3f5f8] text-[#1f3c5a]">
      
      {/* SECTION 1: METRIC CARDS REALTIME */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard 
          title="Giao Dịch" 
          value={realtimeTxCount.toLocaleString()} 
          icon={<ShoppingBag className="text-blue-400" />} 
          growth={growth.tx}
          className={metricCardStyles["Giao Dịch"]}
        />
        <MetricCard 
          title="Doanh thu" 
          value={realtimeRevenue.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} 
          icon={<DollarSign className="text-emerald-400" />}
          growth={growth.revenue}
          className={metricCardStyles["Doanh thu"]}
        />
        <MetricCard 
          title="Khách hàng" 
          value={realtimeCustomerCount.toLocaleString()} 
          icon={<Users className="text-cyan-400" />}
          growth={growth.customers}
          className={metricCardStyles["Khách hàng"]}
        />
        <MetricCard 
          title="AOV" 
          value={realtimeAov.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} 
          icon={<Wallet className="text-amber-400" />}
          growth={growth.aov}
          className={metricCardStyles.AOV}
        />
        <MetricCard 
          title="Sản phẩm" 
          value={realtimeProductCount.toLocaleString()} 
          icon={<Package className="text-violet-400" />}
          growth={growth.products}
          className={metricCardStyles["Sản phẩm"]}
        />
      </div>

      {/* SECTION 2: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        
        {/* Biểu đồ ngang cập nhật từ Kafka 'top_products_stream' */}
        <Card className="bg-white border-[#d8e2ee] text-[#1f3c5a]">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" /> Top 10 Sản Phẩm (Kafka Live)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 40, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e5f2" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#5f7c9c" fontSize={10} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d8e2ee' }} />
                <Bar dataKey="value" fill="#60a5fa" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* SECTION 3: BẢNG GIAO DỊCH REALTIME */}
      <Card className="bg-white border-[#d8e2ee] text-[#1f3c5a]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Danh sách giao dịch realtime
          </CardTitle>
          <span className="text-[10px] text-[#5f7c9c] uppercase">Mới nhất ở trên cùng</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[360px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-[#f6f9fc]">
                <TableRow className="border-[#d8e2ee]">
                  <TableHead className="text-[#dda94b] text-[11px] uppercase">Mã GD</TableHead>
                  <TableHead className="text-[#1f8f5f] text-[11px] uppercase">Mã KH</TableHead>
                  <TableHead className="text-[#5f7c9c] text-[11px] uppercase">Giỏ hàng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realtimeTxRows.map((row) => (
                  <TableRow key={`${row.transactionNo}-${row.customerNo}`} className="border-[#d8e2ee] hover:bg-[#f3f8ff] transition-colors">
                    <TableCell className="font-medium text-sm text-[#dda94b]">{row.transactionNo}</TableCell>
                    <TableCell className="font-medium text-sm text-[#1f8f5f]">{row.customerNo || "-"}</TableCell>
                    <TableCell className="text-sm text-[#1f3c5a]">{row.items || "-"}</TableCell>
                  </TableRow>
                ))}
                {realtimeTxRows.length === 0 && (
                  <TableRow className="border-[#d8e2ee]">
                    <TableCell colSpan={3} className="text-center text-[#5f7c9c] py-6">
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

function MetricCard({ title, value, icon, growth, className = "" }: any) {
  return (
    <Card className={`text-[#1f3c5a] ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-bold text-[#5f7c9c] uppercase tracking-wider">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-[#5f7c9c] mt-1">Tăng trưởng: <span className="text-[#1f3c5a]">{growth}</span></div>
      </CardContent>
    </Card>
  );
}