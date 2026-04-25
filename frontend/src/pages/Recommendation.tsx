import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShoppingCart, Star, X, Plus, Trash2, Loader2 } from "lucide-react";
import { getProductTranslation } from "../lib/translationUtils";

export default function Recommendation() {
  // --- DỮ LIỆU NGÔN NGỮ ---
  const [selectedLanguage, setSelectedLanguage] = useState("en"); // Default to Vietnamese
  const supportedLanguages = [
    { code: "vi", label: "Tiếng Việt" },
    { code: "en", label: "English" }
  ];
  // --- DỮ LIỆU SẢN PHẨM ---
  const [stdProducts, setStdProducts] = useState<string[]>([]);
  const [supProducts, setSupProducts] = useState<string[]>([]);

  // --- STATE TIÊU CHUẨN (STANDARD) ---
  const [selectedStd, setSelectedStd] = useState<string[]>([]);
  const [searchStd, setSearchStd] = useState("");
  const [stdResults, setStdResults] = useState<any[]>([]);
  const [loadingStd, setLoadingStd] = useState(false);

  // --- STATE SUPER ---
  const [selectedSup, setSelectedSup] = useState<string[]>([]);
  const [searchSup, setSearchSup] = useState("");
  const [supResults, setSupResults] = useState<any[]>([]);
  const [loadingSuper, setLoadingSuper] = useState(false);

  // Language setting/fetching translation from CSV
  const getDisplayName = (productName: string): string => {
    return getProductTranslation(productName, selectedLanguage as 'en' | 'vi');
  };

  // Load sản phẩm ban đầu
  useEffect(() => {
    const fetchAll = async () => {
      const [resStd, resSup] = await Promise.all([
        fetch("http://localhost:8000/api/v1/products/standard"),
        fetch("http://localhost:8000/api/v1/products/super")
      ]);
      
      const dataStd = await resStd.json();
      const dataSup = await resSup.json();

      setStdProducts(dataStd.products || []);
      setSupProducts(dataSup.products || []);
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
    <div className="min-h-screen p-6 space-y-10 bg-[#f3f5f8] text-[#1f3c5a]">

      {/* LANGUAGE MODE */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-[#09750e]">
            Ngôn ngữ / Language:
          </label>

          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="
              bg-white
              border border-slate-300
              text-blue-800
              px-3 py-2
              rounded-md
              shadow-sm
              hover:border-blue-400
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
          >
            {supportedLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 1: TIÊU CHUẨN */}
      <div className="space-y-4">
        <h2 className="text-[#db2777] font-bold flex items-center gap-2 px-2">
          <ShoppingCart size={20}/> MÔ HÌNH TIÊU CHUẨN
        </h2>
        
        <Card className="bg-white border-[#d8e2ee]">
          <CardHeader className="border-b border-[#f1c8df] pb-4">
            <CardTitle className="text-lg flex items-center justify-between text-[#b83280]">
              <span>🛒 Giỏ hàng Tiêu chuẩn</span>
              <span className="text-sm font-normal">Số lượng: {selectedStd.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs uppercase text-[#b83280] font-bold">Sản phẩm đã chọn</label>
                <button onClick={() => setSelectedStd([])} className="text-xs text-red-400 flex items-center gap-1 hover:underline"><Trash2 size={12}/> Xóa hết</button>
              </div>
              <div className="min-h-[80px] p-4 border-2 border-dashed border-[#f1c8df] rounded-lg bg-[#fff8fc] flex flex-wrap gap-2">
                {selectedStd.length === 0 ? <p className="text-[#c17cab] text-sm italic w-full text-center py-4">Trống...</p> : 
                  selectedStd.map(item => (
                    <Badge key={item} className="bg-[#fbcfe8] text-[#831843] flex gap-1 items-center px-3 py-1">
                      {getDisplayName(item)} <X size={14} className="cursor-pointer hover:text-red-600" onClick={(e) => removeItem(e, item, setSelectedStd)} />
                    </Badge>
                  ))
                }
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b06a97]" size={16} />
                <Input placeholder="Tìm sản phẩm tiêu chuẩn..." className="bg-white border-[#f1c8df] text-[#1f3c5a] pl-10" value={searchStd} onChange={e => setSearchStd(e.target.value)} />
              </div>
              <ScrollArea className="h-[150px] border border-[#f1c8df] rounded-md p-2 bg-[#fff8fc]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {stdProducts.filter(p => p.toLowerCase().includes(searchStd.toLowerCase())).map(item => (
                    <button key={item} onClick={() => !selectedStd.includes(item) && setSelectedStd([...selectedStd, item])} className="flex items-center justify-between px-3 py-2 text-sm text-[#be185d] bg-white border border-[#f1c8df] rounded hover:border-[#db2777] transition-all">
                      <span className="truncate">{getDisplayName(item)}</span> <Plus size={14} />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Kết quả Standard bên dưới ô chọn */}
        <Card className="bg-white border-[#d8e2ee] border-t-2 border-t-[#db2777] pt-0 pb-6">
          <CardHeader className="bg-[#fff4fa] flex flex-row items-center justify-between py-4">
            <CardTitle className="text-md text-[#be185d]">
              Kết quả gợi ý Standard
            </CardTitle>

            <Button size="sm" onClick={analyzeStandard} className="bg-[#db2777] hover:bg-[#be185d] text-white font-bold" disabled={loadingStd}>
              {loadingStd ? <Loader2 className="animate-spin" size={16}/> : "Phân tích"}
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#fff8fc]">
                <TableRow>
                  <TableHead className = "text-[#be185d]">Mã SP</TableHead>
                  <TableHead className = "text-[#be185d]">Tên SP</TableHead>
                  <TableHead className = "text-[#be185d]">Gợi ý</TableHead>
                  <TableHead className="text-center text-[#be185d]">Độ tin cậy (%)</TableHead>
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
                      <TableCell className="text-[#be185d] font-medium">{item.product_id}</TableCell>
                      <TableCell className="text-[#be185d] font-medium">{getDisplayName(item.product_name)}</TableCell>
                      <TableCell className="text-[#be185d]">
                        {getDisplayName(item.suggestion)}
                      </TableCell>
                      <TableCell className="text-center text-[#be185d]">
                        {item.confidence}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <hr className="border-[#d8e2ee] opacity-70" />

      {/* SECTION 2: SUPER */}
      <div className="space-y-4">
        <h2 className="text-[#7e22ce] font-bold flex items-center gap-2 px-2">
          <Star size={20} fill="currentColor"/> MÔ HÌNH SUPER
        </h2>

        <Card className="bg-white border-[#d8e2ee]">
          <CardHeader className="border-b border-[#dcc9f9] pb-4">
            <CardTitle className="text-lg flex items-center justify-between text-[#7e22ce]/90">
              <span>🌟 Giỏ hàng Super</span>
              <span className="text-sm font-normal">Số lượng: {selectedSup.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs uppercase text-[#7e22ce] font-bold">Sản phẩm đã chọn (Super)</label>
                <button onClick={() => setSelectedSup([])} className="text-xs text-red-400 flex items-center gap-1 hover:underline"><Trash2 size={12}/> Xóa hết</button>
              </div>
              <div className="min-h-[80px] p-4 border-2 border-dashed border-[#dcc9f9] rounded-lg bg-[#faf5ff] flex flex-wrap gap-2">
                {selectedSup.length === 0 ? <p className="text-[#a78bca] text-sm italic w-full text-center py-4">Trống...</p> : 
                  selectedSup.map(item => (
                    <Badge key={item} className="bg-[#e9d5ff] text-[#581c87] flex gap-1 items-center px-3 py-1">
                      {getDisplayName(item)} <X size={14} className="cursor-pointer hover:text-red-600" onClick={(e) => removeItem(e, item, setSelectedSup)} />
                    </Badge>
                  ))
                }
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8d70b3]" size={16} />
                <Input placeholder="Tìm sản phẩm đặc trưng..." className="bg-white border-[#dcc9f9] text-[#1f3c5a] pl-10" value={searchSup} onChange={e => setSearchSup(e.target.value)} />
              </div>
              <ScrollArea className="h-[150px] border border-[#dcc9f9] rounded-md p-2 bg-[#faf5ff]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {supProducts.filter(p => p.toLowerCase().includes(searchSup.toLowerCase())).map(item => (
                    <button key={item} onClick={() => !selectedSup.includes(item) && setSelectedSup([...selectedSup, item])} className="flex items-center justify-between px-3 py-2 text-sm text-[#7e22ce] bg-white border border-[#dcc9f9] rounded hover:border-[#7e22ce] transition-all">
                      <span className="truncate">{getDisplayName(item)}</span> <Plus size={14} />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Kết quả Super bên dưới ô chọn */}
        <Card className="bg-white border-[#d8e2ee] border-t-2 border-t-[#7e22ce] pt-0 pb-6">
          <CardHeader className="bg-[#faf5ff] flex flex-row items-center justify-between py-4">
            <CardTitle className="text-md text-[#7e22ce] flex items-center gap-2">Kết quả Super Recommendation</CardTitle>
            <Button size="sm" onClick={analyzeSuper} className="bg-[#7e22ce] hover:bg-[#6b21a8] text-white font-bold" disabled={loadingSuper}>
              {loadingSuper ? <Loader2 className="animate-spin" size={16} /> : "Phân tích"}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#faf5ff]">
                <TableRow className="border-[#dcc9f9]">
                  <TableHead className="text-[#7e22ce]/80">Đã chọn</TableHead>
                  <TableHead className="text-[#7e22ce]/80">Gợi ý</TableHead>
                  <TableHead className="text-center text-[#7e22ce]/80">Độ tin cậy (%)</TableHead>
                  <TableHead className="text-right text-[#7e22ce]/80">Tương quan (Lift)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supResults.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-[#8d70b3] italic">Chọn sản phẩm Super và nhấn Phân tích</TableCell></TableRow>
                ) : (
                  supResults.map((item, idx) => (
                    <TableRow key={idx} className="border-[#dcc9f9] hover:bg-[#faf5ff]">
                      <TableCell className="text-[#7e22ce] font-medium">
                        {getDisplayName(item.selected_items)}
                      </TableCell>

                      <TableCell className="text-[#7e22ce] font-medium">
                        {getDisplayName(item.suggestion)}
                      </TableCell>

                      <TableCell className="text-center text-[#7e22ce] font-mono">
                        {item.confidence}%
                      </TableCell>

                      <TableCell className="text-right text-[#7e22ce] font-mono">
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