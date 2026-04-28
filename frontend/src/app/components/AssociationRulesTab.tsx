import { useState } from "react";
import { X, Sparkles, ChevronRight, TrendingUp } from "lucide-react";

// Import trực tiếp dữ liệu từ file JSON
import standardRulesData from "../../data/association_rules.json";
import superRulesData from "../../data/association_rules_super.json";

interface Rule {
  id: string; // Đổi sang string để tránh trùng lặp ID
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
}

// Hàm hỗ trợ so sánh 2 mảng (để lọc rule trùng)
const arraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
};

// Map dữ liệu từ JSON vào định dạng chuẩn
const STANDARD_RULES: Rule[] = standardRulesData.map(
  (rule: any, idx: number) => ({
    id: `std-${idx}`,
    antecedent: rule.antecedent,
    consequent: rule.consequent,
    support: rule.support,
    confidence: rule.confidence,
    lift: rule.lift,
  }),
);

// Map dữ liệu SUPER và LỌC bỏ các dòng đã tồn tại trong STANDARD_RULES
const SUPER_RULES: Rule[] = superRulesData
  .map((rule: any, idx: number) => ({
    id: `sup-${idx}`,
    antecedent: rule.antecedent,
    consequent: rule.consequent,
    support: rule.support,
    confidence: rule.confidence,
    lift: rule.lift,
  }))
  .filter((superRule) => {
    // Kiểm tra xem có luật nào trong STANDARD_RULES giống y hệt (cùng tập antecedent và consequent)
    const isDuplicate = STANDARD_RULES.some(
      (stdRule) =>
        arraysEqual(stdRule.antecedent, superRule.antecedent) &&
        arraysEqual(stdRule.consequent, superRule.consequent)
    );
    // Chỉ giữ lại những luật chưa có trong STANDARD_RULES
    return !isDuplicate;
  });

// Trích xuất tự động danh sách các sản phẩm từ thuộc tính 'antecedent' (loại bỏ trùng lặp)
const STANDARD_PRODUCTS = Array.from(
  new Set(STANDARD_RULES.flatMap((rule) => rule.antecedent))
).sort();

const SUPER_PRODUCTS = Array.from(
  new Set(SUPER_RULES.flatMap((rule) => rule.antecedent))
).sort();

export function AssociationRulesTab() {
  const [standardSelected, setStandardSelected] = useState<string[]>([]);
  const [superSelected, setSuperSelected] = useState<string[]>([]);
  const [standardResults, setStandardResults] = useState<Rule[]>([]);
  const [superResults, setSuperResults] = useState<Rule[]>([]);

  const toggleStandardProduct = (product: string) => {
    setStandardSelected((prev) =>
      prev.includes(product)
        ? prev.filter((p) => p !== product)
        : [...prev, product],
    );
  };

  const toggleSuperProduct = (product: string) => {
    setSuperSelected((prev) =>
      prev.includes(product)
        ? prev.filter((p) => p !== product)
        : [...prev, product],
    );
  };

  const removeStandardProduct = (product: string) => {
    setStandardSelected((prev) => prev.filter((p) => p !== product));
  };

  const removeSuperProduct = (product: string) => {
    setSuperSelected((prev) => prev.filter((p) => p !== product));
  };

  const getStandardRecommendations = () => {
    if (standardSelected.length === 0) {
      setStandardResults([]);
      return;
    }

    // Lọc các luật có chứa sản phẩm gốc trong giỏ hàng
    const filtered = STANDARD_RULES.filter((rule) =>
      standardSelected.some((p) => rule.antecedent.includes(p)),
    );
    setStandardResults(filtered);
  };

  const getSuperRecommendations = () => {
    if (superSelected.length === 0) {
      setSuperResults([]);
      return;
    }

    // Lọc các luật có chứa sản phẩm gốc trong giỏ hàng
    const filtered = SUPER_RULES.filter((rule) =>
      superSelected.some((p) => rule.antecedent.includes(p)),
    );
    setSuperResults(filtered);
  };

  return (
    <div className="space-y-8">
      {/* ========================================== */}
      {/* MÔ HÌNH TIÊU CHUẨN - PINK PASTEL             */}
      {/* ========================================== */}
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[#f7c2d4]">
              <TrendingUp className="size-5 text-[#9c0b3d]" />
            </div>
            <h2
              className="text-pink-900"
              style={{ fontSize: "1.5rem", fontWeight: 700 }}
            >
              Mô hình FP-Growth
            </h2>
          </div>
          <p className="text-pink-700" style={{ fontSize: "0.875rem" }}>
            Phân tích dữ liệu với luật kết hợp của mô hình FP-Growth
          </p>
        </div>

        {/* Selected Products Bar */}
        <div className="bg-white rounded-xl p-4 border border-pink-200 shadow-sm">
          <label
            className="text-pink-800 mb-3 block"
            style={{ fontWeight: 600, fontSize: "0.9375rem" }}
          >
            Sản phẩm đã chọn ({standardSelected.length})
          </label>
          <div className="min-h-[80px] p-4 rounded-lg border-2 border-dashed border-pink-300 bg-pink-50/50">
            {standardSelected.length === 0 ? (
              <div className="flex items-center justify-center h-full text-pink-400">
                <p style={{ fontSize: "0.875rem" }}>Chưa chọn sản phẩm nào</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {standardSelected.map((product, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f7c2d4] text-[#9c0b3d] shadow-md"
                  >
                    <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                      {product}
                    </span>
                    <button
                      onClick={() => removeStandardProduct(product)}
                      className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Selection Grid */}
        <div className="bg-white rounded-xl p-6 border border-pink-200 shadow-sm">
          <label
            className="text-pink-800 mb-4 block"
            style={{ fontWeight: 600, fontSize: "0.9375rem" }}
          >
            Chọn sản phẩm để phân tích ({STANDARD_PRODUCTS.length} sản phẩm)
          </label>
          <div className="grid grid-cols-4 gap-3">
            {STANDARD_PRODUCTS.map((product, idx) => (
              <button
                key={idx}
                onClick={() => toggleStandardProduct(product)}
                className={`px-3 py-2 rounded-lg border-2 transition-all duration-200 text-left ${
                  standardSelected.includes(product)
                    ? "bg-[#f7c2d4] text-[#9c0b3d] border-[#f7c2d4] shadow-md scale-105"
                    : "bg-white text-slate-700 border-pink-100 hover:border-pink-300 hover:bg-pink-50"
                }`}
                style={{ fontSize: "0.8125rem", fontWeight: 500 }}
              >
                {product}
              </button>
            ))}
          </div>

          {/* Recommend Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={getStandardRecommendations}
              disabled={standardSelected.length === 0}
              className={`flex items-center gap-2 px-8 py-3 rounded-lg transition-all duration-300 ${
                standardSelected.length === 0
                  ? "bg-pink-100 text-pink-400 cursor-not-allowed"
                  : "bg-[#f7c2d4] text-[#9c0b3d] hover:shadow-lg hover:scale-105"
              }`}
              style={{ fontWeight: 600, fontSize: "1rem" }}
            >
              <Sparkles className="size-5" />
              Gợi ý sản phẩm mua kèm
            </button>
          </div>
        </div>

        {/* Results Table */}
        {standardResults.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-pink-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="px-6 py-4 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-200">
              <h3
                className="text-pink-900"
                style={{ fontWeight: 600, fontSize: "1.125rem" }}
              >
                Kết quả gợi ý - Mô hình FP-Growth
              </h3>
              <p
                className="text-pink-600 mt-1"
                style={{ fontSize: "0.875rem" }}
              >
                Tìm thấy {standardResults.length} luật kết hợp
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-pink-50/50 border-b border-pink-200">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-pink-700"
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}
                    >
                      Sản phẩm trong giỏ
                    </th>
                    <th
                      className="px-6 py-3 text-center text-pink-700"
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}
                    ></th>
                    <th
                      className="px-6 py-3 text-left text-pink-700"
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}
                    >
                      Sản phẩm gợi ý
                    </th>
                    <th
                      className="px-6 py-3 text-center text-pink-700"
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}
                    >
                      Support
                    </th>
                    <th
                      className="px-6 py-3 text-center text-pink-700"
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}
                    >
                      Confidence
                    </th>
                    <th
                      className="px-6 py-3 text-center text-pink-700"
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}
                    >
                      Lift
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-100">
                  {standardResults.map((rule) => (
                    <tr
                      key={rule.id}
                      className="hover:bg-pink-50/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {rule.antecedent.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-full bg-pink-100 text-pink-800"
                              style={{ fontSize: "0.8125rem", fontWeight: 500 }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <ChevronRight className="size-5 text-pink-400 mx-auto" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {rule.consequent.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800"
                              style={{ fontSize: "0.8125rem", fontWeight: 500 }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 text-center text-pink-900 font-mono"
                        style={{ fontSize: "0.875rem" }}
                      >
                        {(rule.support * 100).toFixed(1)}%
                      </td>
                      <td
                        className="px-6 py-4 text-center text-pink-900 font-mono"
                        style={{ fontSize: "0.875rem" }}
                      >
                        {(rule.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className="px-3 py-1 rounded-full bg-rose-200 text-rose-800 font-mono"
                          style={{ fontSize: "0.875rem", fontWeight: 600 }}
                        >
                          {rule.lift.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MÔ HÌNH SUPER - PURPLE PASTEL                */}
      {/* ========================================== */}
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[#e8c7f1]">
              <Sparkles className="size-5 text-[#84359b]" />
            </div>
            <h2
              className="text-purple-900"
              style={{ fontSize: "1.5rem", fontWeight: 700 }}
            >
              Mô hình FP-Growth Super
            </h2>
          </div>
          <p className="text-purple-700" style={{ fontSize: "0.875rem" }}>
            Phân tích dữ liệu với luật kết hợp của mô hình FP-Growth Super
          </p>
        </div>

        {/* Selected Products Bar */}
        <div className="bg-white rounded-xl p-4 border border-purple-200 shadow-sm">
          <label
            className="text-purple-800 mb-3 block"
            style={{ fontWeight: 600, fontSize: "0.9375rem" }}
          >
            Sản phẩm đã chọn ({superSelected.length})
          </label>
          <div className="min-h-[80px] p-4 rounded-lg border-2 border-dashed border-purple-300 bg-purple-50/50">
            {superSelected.length === 0 ? (
              <div className="flex items-center justify-center h-full text-purple-400">
                <p style={{ fontSize: "0.875rem" }}>Chưa chọn sản phẩm nào</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {superSelected.map((product, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#e8c7f1] text-[#84359b] shadow-md"
                  >
                    <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                      {product}
                    </span>
                    <button
                      onClick={() => removeSuperProduct(product)}
                      className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Selection Grid */}
        <div className="bg-white rounded-xl p-6 border border-purple-200 shadow-sm">
          <label
            className="text-purple-800 mb-4 block"
            style={{ fontWeight: 600, fontSize: "0.9375rem" }}
          >
            Chọn sản phẩm cho mô hình FP-Growth Super ({SUPER_PRODUCTS.length} sản phẩm)
          </label>
          <div className="grid grid-cols-3 gap-3">
            {SUPER_PRODUCTS.length === 0 ? (
              <div className="col-span-3 p-4 text-center text-slate-500">
                Không có dữ liệu luật mới ở mô hình Super so với Tiêu chuẩn.
              </div>
            ) : (
              SUPER_PRODUCTS.map((product, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleSuperProduct(product)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 text-left ${
                    superSelected.includes(product)
                      ? "bg-[#e8c7f1] text-[#84359b] border-[#e8c7f1] shadow-md scale-105"
                      : "bg-white text-slate-700 border-purple-100 hover:border-purple-300 hover:bg-purple-50"
                  }`}
                  style={{ fontSize: "0.8125rem", fontWeight: 500 }}
                >
                  {product}
                </button>
              ))
            )}
          </div>

          {/* Recommend Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={getSuperRecommendations}
              disabled={superSelected.length === 0}
              className={`flex items-center gap-2 px-8 py-3 rounded-lg transition-all duration-300 ${
                superSelected.length === 0
                  ? "bg-purple-100 text-purple-400 cursor-not-allowed"
                  : "bg-[#e8c7f1] text-[#84359b] hover:shadow-lg hover:scale-105"
              }`}
              style={{ fontWeight: 600, fontSize: "1rem" }}
            >
              <Sparkles className="size-5" />
              Gợi ý sản phẩm mua kèm
            </button>
          </div>
        </div>

        {/* Results Table */}
        {superResults.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-purple-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 border-b border-purple-200">
              <h3
                className="text-purple-900 flex items-center gap-2"
                style={{ fontWeight: 600, fontSize: "1.125rem" }}
              >
                <Sparkles className="size-5 text-purple-600" />
                Kết quả gợi ý - Mô hình FP-Growth Super
              </h3>
              <p
                className="text-purple-700 mt-1"
                style={{ fontSize: "0.875rem" }}
              >
                Tìm thấy {superResults.length} luật kết hợp cao cấp
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-50/50 border-b border-purple-200">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-purple-800"
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}
                    >
                      Sản phẩm trong giỏ
                    </th>
                    <th
                      className="px-6 py-3 text-center text-purple-800"
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}
                    ></th>
                    <th
                      className="px-6 py-3 text-left text-purple-800"
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}
                    >
                      Sản phẩm gợi ý
                    </th>
                    <th
                      className="px-6 py-3 text-center text-purple-800"
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}
                    >
                      Support
                    </th>
                    <th
                      className="px-6 py-3 text-center text-purple-800"
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}
                    >
                      Confidence
                    </th>
                    <th
                      className="px-6 py-3 text-center text-purple-800"
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}
                    >
                      Lift
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100">
                  {superResults.map((rule) => (
                    <tr
                      key={rule.id}
                      className="hover:bg-purple-50/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {rule.antecedent.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800"
                              style={{ fontSize: "0.8125rem", fontWeight: 500 }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <ChevronRight className="size-5 text-purple-400 mx-auto" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {rule.consequent.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-full bg-[#e8c7f1] text-[#84359b] shadow-sm"
                              style={{ fontSize: "0.8125rem", fontWeight: 500 }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 text-center text-purple-900 font-mono"
                        style={{ fontSize: "0.875rem", fontWeight: 600 }}
                      >
                        {(rule.support * 100).toFixed(1)}%
                      </td>
                      <td
                        className="px-6 py-4 text-center text-purple-900 font-mono"
                        style={{ fontSize: "0.875rem", fontWeight: 600 }}
                      >
                        {(rule.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className="px-3 py-1 rounded-full bg-gradient-to-r from-fuchsia-400 to-purple-500 text-white font-mono shadow-md"
                          style={{ fontSize: "0.875rem", fontWeight: 600 }}
                        >
                          {rule.lift.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
