import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShoppingCart, Star, X, Plus, Trash2, Loader2 } from "lucide-react";

export default function Recommendation() {
  // --- DỮ LIỆU SẢN PHẨM ---
  const [stdProducts, setStdProducts] = useState<string[]>([]);
  const [supProducts, setSupProducts] = useState<string[]>([]);
  const [loadingStdItems, setLoadingStdItems] = useState(false);
  const [loadingSupItems, setLoadingSupItems] = useState(false);

  // --- STATE TIÊU CHUẨN (STANDARD) ---
  const [selectedStd, setSelectedStd] = useState<string[]>([]);
  const [searchStd, setSearchStd] = useState("");
  const [stdStatus, setStdStatus] = useState("");
  const [stdResults, setStdResults] = useState<any[]>([]);
  const [loadingStd, setLoadingStd] = useState(false);

  // --- STATE SUPER ---
  const [selectedSup, setSelectedSup] = useState<string[]>([]);
  const [searchSup, setSearchSup] = useState("");
  const [supResults, setSupResults] = useState<any[]>([]);
  const [loadingSuper, setLoadingSuper] = useState(false);

  // Load sản phẩm ban đầu
  useEffect(() => {
    const fetchAll = async () => {
      setLoadingStdItems(true); setLoadingSupItems(true);
      try {
        const [resStd, resSup] = await Promise.all([
          fetch("http://localhost:8000/api/v1/products/standard"),
          fetch("http://localhost:8000/api/v1/products/super")
        ]);
        
        const dataStd = await resStd.json();
        const dataSup = await resSup.json();

        setStdProducts(dataStd.products || []);
        setSupProducts(dataSup.products || []);
      } finally {
        setLoadingStdItems(false); setLoadingSupItems(false);
      }
    };
    fetchAll();
  }, []);

  // --- LOGIC XỬ LÝ (CHUNG CHO CẢ 2) ---
  const removeItem = (
    e: React.MouseEvent,
    item: string,
    setFn: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    e.stopPropagation();
    setFn(prev => prev.filter(i => i !== item));
  };

  const analyzeStandard = async () => {
    if (selectedStd.length === 0) return;

    setLoadingStd(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/analyze/standard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selectedStd }),
      });

      const data = await res.json();
      setStdResults(data.results || []);
    } finally {
      setLoadingStd(false);
    }
  };

  const analyzeSuper = async () => {
    if (selectedSup.length === 0) return;
    setLoadingSuper(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/analyze/super", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selectedSup }),
      });
      const data = await res.json();
      setSupResults(data.results || []);
    } finally {
      setLoadingSuper(false);
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-10 bg-[#1f2228] text-[#e8edf3]">
      
      {/* SECTION 1: TIÊU CHUẨN */}
      <div className="space-y-4">
        <h2 className="text-green-500 font-bold flex items-center gap-2 px-2">
          <ShoppingCart size={20}/> MÔ HÌNH TIÊU CHUẨN (REAL-TIME)
        </h2>
        
        <Card className="bg-[#353a44] border-[#4a6072]">
          <CardHeader className="border-b border-[#4a6072] pb-4">
            <CardTitle className="text-lg flex items-center justify-between text-[#7b9bb8]">
              <span>🛒 Giỏ hàng Tiêu chuẩn</span>
              <span className="text-sm font-normal">Số lượng: {selectedStd.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs uppercase text-[#7b9bb8] font-bold">Sản phẩm đã chọn</label>
                <button onClick={() => setSelectedStd([])} className="text-xs text-red-400 flex items-center gap-1 hover:underline"><Trash2 size={12}/> Xóa hết</button>
              </div>
              <div className="min-h-[80px] p-4 border-2 border-dashed border-[#4a6072] rounded-lg bg-[#1f2228]/50 flex flex-wrap gap-2">
                {selectedStd.length === 0 ? <p className="text-[#4a6072] text-sm italic w-full text-center py-4">Trống...</p> : 
                  selectedStd.map(item => (
                    <Badge key={item} className="bg-[#7b9bb8] text-[#1f2228] flex gap-1 items-center px-3 py-1">
                      {item} <X size={14} className="cursor-pointer hover:text-red-600" onClick={(e) => removeItem(e, item, setSelectedStd)} />
                    </Badge>
                  ))
                }
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6072]" size={16} />
                <Input placeholder="Tìm sản phẩm tiêu chuẩn..." className="bg-[#1f2228] border-[#4a6072] pl-10" value={searchStd} onChange={e => setSearchStd(e.target.value)} />
              </div>
              <ScrollArea className="h-[150px] border border-[#4a6072] rounded-md p-2 bg-[#1f2228]/30">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {stdProducts.filter(p => p.toLowerCase().includes(searchStd.toLowerCase())).map(item => (
                    <button key={item} onClick={() => !selectedStd.includes(item) && setSelectedStd([...selectedStd, item])} className="flex items-center justify-between px-3 py-2 text-sm text-green-400 bg-[#353a44] border border-[#4a6072] rounded hover:border-[#7b9bb8] transition-all">
                      <span className="truncate">{item}</span> <Plus size={14} />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Kết quả Standard bên dưới ô chọn */}
        <Card className="bg-[#353a44] border-[#4a6072] border-t-2 border-t-green-500 pt-0 pb-6">
          <CardHeader className="bg-[#1f2228]/50 flex flex-row items-center justify-between py-4">
            <CardTitle className="text-md text-[#e8edf3] flex items-center gap-2">Phân tích Tiêu chuẩn</CardTitle>
            <Button size="sm" onClick={analyzeStandard} className="bg-green-600 hover:bg-green-700">Gửi vào Luồng Kafka</Button>
          </CardHeader>
          <CardContent className="p-4 text-center">
            {stdStatus ? <p className="text-green-400 font-bold animate-pulse">{stdStatus}</p> : <p className="text-sm text-[#7b9bb8]">Kết quả sẽ cập nhật tại Dashboard qua WebSocket.</p>}
          </CardContent>
        </Card>
      </div>

      <hr className="border-[#4a6072] opacity-30" />

      {/* SECTION 2: SUPER */}
      <div className="space-y-4">
        <h2 className="text-yellow-500 font-bold flex items-center gap-2 px-2">
          <Star size={20} fill="currentColor"/> MÔ HÌNH SUPER (AI RECOMMENDATION)
        </h2>

        <Card className="bg-[#353a44] border-[#4a6072]">
          <CardHeader className="border-b border-[#4a6072] pb-4">
            <CardTitle className="text-lg flex items-center justify-between text-yellow-500/80">
              <span>🌟 Giỏ hàng Super (Hàng hiếm)</span>
              <span className="text-sm font-normal">Số lượng: {selectedSup.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs uppercase text-[#7b9bb8] font-bold">Sản phẩm đã chọn (Super)</label>
                <button onClick={() => setSelectedSup([])} className="text-xs text-red-400 flex items-center gap-1 hover:underline"><Trash2 size={12}/> Xóa hết</button>
              </div>
              <div className="min-h-[80px] p-4 border-2 border-dashed border-[#4a6072] rounded-lg bg-[#1f2228]/50 flex flex-wrap gap-2">
                {selectedSup.length === 0 ? <p className="text-[#4a6072] text-sm italic w-full text-center py-4">Trống...</p> : 
                  selectedSup.map(item => (
                    <Badge key={item} className="bg-yellow-600 text-black flex gap-1 items-center px-3 py-1">
                      {item} <X size={14} className="cursor-pointer hover:text-red-600" onClick={(e) => removeItem(e, item, setSelectedSup)} />
                    </Badge>
                  ))
                }
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6072]" size={16} />
                <Input placeholder="Tìm sản phẩm đặc trưng..." className="bg-[#1f2228] border-[#4a6072] pl-10" value={searchSup} onChange={e => setSearchSup(e.target.value)} />
              </div>
              <ScrollArea className="h-[150px] border border-[#4a6072] rounded-md p-2 bg-[#1f2228]/30">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {supProducts.filter(p => p.toLowerCase().includes(searchSup.toLowerCase())).map(item => (
                    <button key={item} onClick={() => !selectedSup.includes(item) && setSelectedSup([...selectedSup, item])} className="flex items-center justify-between px-3 py-2 text-sm text-yellow-500 bg-[#353a44] border border-[#4a6072] rounded hover:border-yellow-500 transition-all">
                      <span className="truncate">{item}</span> <Plus size={14} />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#353a44] border-[#4a6072] border-t-2 border-t-green-500 pt-0 pb-6">
          <CardHeader className="bg-[#1f2228]/50 flex flex-row items-center justify-between py-4">
            <CardTitle className="text-md text-green-400">
              Kết quả gợi ý (Standard)
            </CardTitle>

            <Button size="sm" onClick={analyzeStandard} disabled={loadingStd}>
              {loadingStd ? <Loader2 className="animate-spin" size={16}/> : "Phân tích"}
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#1f2228]">
                <TableRow>
                  <TableHead>Mã SP</TableHead>
                  <TableHead>Tên SP</TableHead>
                  <TableHead>Gợi ý</TableHead>
                  <TableHead className="text-center">Confidence (%)</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {stdResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-gray-400">
                      Chưa có kết quả
                    </TableCell>
                  </TableRow>
                ) : (
                  stdResults.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.product_id}</TableCell>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell className="text-green-400">
                        {item.suggestion}
                      </TableCell>
                      <TableCell className="text-center text-yellow-400">
                        {item.confidence}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {/* Kết quả Super bên dưới ô chọn */}
        <Card className="bg-[#353a44] border-[#4a6072] border-t-2 border-t-yellow-500 pt-0 pb-6">
          <CardHeader className="bg-[#1f2228]/50 flex flex-row items-center justify-between py-4">
            <CardTitle className="text-md text-yellow-500 flex items-center gap-2">Kết quả Super Recommendation</CardTitle>
            <Button size="sm" onClick={analyzeSuper} className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold" disabled={loadingSuper}>
              {loadingSuper ? <Loader2 className="animate-spin" size={16} /> : "Phân tích ngay"}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#1f2228]">
                <TableRow className="border-[#4a6072]">
                  <TableHead className="text-yellow-500/70">Đã chọn</TableHead>
                  <TableHead className="text-yellow-500/70">Gợi ý</TableHead>
                  <TableHead className="text-center text-yellow-500/70">Độ tin cậy (%)</TableHead>
                  <TableHead className="text-right text-yellow-500/70">Tương quan (Lift)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supResults.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-[#4a6072] italic">Chọn sản phẩm Super và nhấn Phân tích</TableCell></TableRow>
                ) : (
                  supResults.map((item, idx) => (
                    <TableRow key={idx} className="border-[#4a6072] hover:bg-[#1f2228]/30">
                      <TableCell className="text-gray-400 text-xs">
                        {item.selected_items}
                      </TableCell>

                      <TableCell className="text-yellow-400 font-medium">
                        {item.suggestion}
                      </TableCell>

                      <TableCell className="text-center text-green-400 font-mono">
                        {item.confidence}%
                      </TableCell>

                      <TableCell className="text-right text-blue-400 font-mono">
                        {item.lift}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}