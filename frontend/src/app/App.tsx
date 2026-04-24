import { useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { GitBranch, Users, LayoutDashboard, LineChart } from "lucide-react";
import { Dashboard1 } from "./components/Dashboard1";
import { Dashboard2 } from "./components/Dashboard2";
import { AssociationRulesTab } from "./components/AssociationRulesTab";
import { ClusteringTab } from "./components/ClusteringTab";
import { useKafkaStream } from "../hooks/useKafkaStream";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "dashboard1" | "dashboard2" | "rules" | "clustering"
  >("dashboard1");

  // Gọi hook lắng nghe WebSocket
  const { streamData, topProducts, transactions } = useKafkaStream();

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-[#FAFBFC] overflow-hidden relative">
        {/* Sidebar */}
        <aside className="w-56 bg-[#E0F2FE] flex flex-col shadow-xl h-full">
          <div className="relative z-10 flex flex-col h-full">
            {/* Logo/Brand */}
            <div className="px-6 py-8 border-b border-sky-300">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-400/30">
                  <LayoutDashboard
                    className="size-6 text-white"
                    strokeWidth={2.5}
                  />
                </div>
                <div>
                  <h1
                    className="text-slate-800 tracking-tight"
                    style={{ fontWeight: 700, fontSize: "1.25rem" }}
                  >
                    DataLens
                  </h1>
                  <p
                    className="text-blue-600 tracking-wide"
                    style={{
                      fontSize: "0.6875rem",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    PHÂN TÍCH DỮ LIỆU
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              <button
                onClick={() => setActiveTab("dashboard1")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                  activeTab === "dashboard1"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-400/30"
                    : "text-slate-700 hover:bg-sky-200/50 hover:text-slate-900"
                }`}
              >
                <LayoutDashboard
                  className={`size-5 transition-transform duration-300 ${activeTab === "dashboard1" ? "scale-110" : "group-hover:scale-105"}`}
                />
                <span
                  style={{ fontWeight: activeTab === "dashboard1" ? 600 : 500 }}
                >
                  Bảng điều khiển
                </span>
                {activeTab === "dashboard1" && (
                  <div className="ml-auto size-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("dashboard2")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                  activeTab === "dashboard2"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-400/30"
                    : "text-slate-700 hover:bg-sky-200/50 hover:text-slate-900"
                }`}
              >
                <LineChart
                  className={`size-5 transition-transform duration-300 ${activeTab === "dashboard2" ? "scale-110" : "group-hover:scale-105"}`}
                />
                <span
                  style={{ fontWeight: activeTab === "dashboard2" ? 600 : 500 }}
                >
                  Phân tích sâu
                </span>
                {activeTab === "dashboard2" && (
                  <div className="ml-auto size-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("rules")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                  activeTab === "rules"
                    ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-400/30"
                    : "text-slate-700 hover:bg-sky-200/50 hover:text-slate-900"
                }`}
              >
                <GitBranch
                  className={`size-5 transition-transform duration-300 ${activeTab === "rules" ? "scale-110" : "group-hover:scale-105"}`}
                />
                <span style={{ fontWeight: activeTab === "rules" ? 600 : 500 }}>
                  Luật sinh
                </span>
                {activeTab === "rules" && (
                  <div className="ml-auto size-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("clustering")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                  activeTab === "clustering"
                    ? "bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-400/30"
                    : "text-slate-700 hover:bg-sky-200/50 hover:text-slate-900"
                }`}
              >
                <Users
                  className={`size-5 transition-transform duration-300 ${activeTab === "clustering" ? "scale-110" : "group-hover:scale-105"}`}
                />
                <span
                  style={{ fontWeight: activeTab === "clustering" ? 600 : 500 }}
                >
                  Phân cụm khách hàng
                </span>
                {activeTab === "clustering" && (
                  <div className="ml-auto size-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            </nav>

            {/* Footer Info */}
            <div className="px-6 py-4 border-t border-sky-300">
              <div className="px-3 py-2 rounded-lg bg-white border border-sky-200 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-blue-700"
                    style={{
                      fontSize: "0.6875rem",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    TRẠNG THÁI HỆ THỐNG
                  </span>
                  <div className="size-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-400/50" />
                </div>
                <p className="text-slate-600" style={{ fontSize: "0.75rem" }}>
                  Hoạt động bình thường
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h2
                    className="text-slate-900 tracking-tight"
                    style={{ fontSize: "1.75rem", fontWeight: 700 }}
                  >
                    {activeTab === "dashboard1" && "Bảng điều khiển"}
                    {activeTab === "dashboard2" && "Phân tích sâu"}
                    {activeTab === "rules" && "Luật sinh"}
                    {activeTab === "clustering" && "Phân cụm khách hàng"}
                  </h2>
                  <p className="text-slate-500 mt-1">
                    {activeTab === "dashboard1" &&
                      "Theo dõi các chỉ số quan trọng và xu hướng thời gian thực"}
                    {activeTab === "dashboard2" &&
                      "Phân tích chi tiết hành vi mua sắm và xu hướng"}
                    {activeTab === "rules" &&
                      "Khám phá mẫu mua sắm với tối ưu hóa thuật toán"}
                    {activeTab === "clustering" &&
                      "Phân tích RFM và phân khúc khách hàng với K-Means"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3"></div>
              <div className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200">
                <span
                  className="text-slate-700"
                  style={{
                    fontSize: "0.875rem",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {new Date().toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </header>

          {/* Tab Content CHÍNH THỨC */}
          <div className="flex-1 overflow-auto p-8">
            {/* Đã truyền props thực tế từ useKafkaStream */}
            {activeTab === "dashboard1" && (
              <Dashboard1 streamData={streamData} topProducts={topProducts} />
            )}
            {activeTab === "dashboard2" && <Dashboard2 />}
            {activeTab === "rules" && <AssociationRulesTab />}
            {activeTab === "clustering" && (
              <ClusteringTab transactions={transactions} />
            )}
          </div>
        </main>
      </div>
    </DndProvider>
  );
}
