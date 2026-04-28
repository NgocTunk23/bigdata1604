import { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { GitBranch, Users, LayoutDashboard, LineChart } from "lucide-react";
import { Dashboard1 } from "./components/Dashboard1";
import { Dashboard2 } from "./components/Dashboard2";
import { AssociationRulesTab } from "./components/AssociationRulesTab";
import { ClusteringTab } from "./components/ClusteringTab";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "dashboard1" | "dashboard2" | "rules" | "clustering"
  >("dashboard1");

  // Gửi sự kiện resize để fix lỗi biểu đồ Recharts (Tab bị trắng) khi switch tab
  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50); // delay một chút cho DOM render hiển thị xong
  }, [activeTab]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-[#FAFBFC] overflow-hidden relative">
        {/* Sidebar */}
        <aside className="w-56 bg-[#E0F2FE] flex flex-col shadow-xl h-full">
          <div className="relative z-10 flex flex-col h-full">
            <div className="px-6 py-8 border-b border-sky-300">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-400/30">
                  <LayoutDashboard className="size-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-slate-800 tracking-tight" style={{ fontWeight: 700, fontSize: "1.25rem" }}>
                    Big Data
                  </h1>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              <button
                onClick={() => setActiveTab("dashboard1")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${activeTab === "dashboard1" ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-400/30" : "text-slate-700 hover:bg-sky-200/50 hover:text-slate-900"}`}
              >
                <LayoutDashboard className={`size-5 transition-transform duration-300 ${activeTab === "dashboard1" ? "scale-110" : "group-hover:scale-105"}`} />
                <span style={{ fontWeight: activeTab === "dashboard1" ? 600 : 500 }}>Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab("dashboard2")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${activeTab === "dashboard2" ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-400/30" : "text-slate-700 hover:bg-sky-200/50 hover:text-slate-900"}`}
              >
                <LineChart className={`size-5 transition-transform duration-300 ${activeTab === "dashboard2" ? "scale-110" : "group-hover:scale-105"}`} />
                <span style={{ fontWeight: activeTab === "dashboard2" ? 600 : 500 }}>Analysis</span>
              </button>
              <button
                onClick={() => setActiveTab("rules")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${activeTab === "rules" ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-400/30" : "text-slate-700 hover:bg-sky-200/50 hover:text-slate-900"}`}
              >
                <GitBranch className={`size-5 transition-transform duration-300 ${activeTab === "rules" ? "scale-110" : "group-hover:scale-105"}`} />
                <span style={{ fontWeight: activeTab === "rules" ? 600 : 500 }}>AssociationRules</span>
              </button>
              <button
                onClick={() => setActiveTab("clustering")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${activeTab === "clustering" ? "bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-400/30" : "text-slate-700 hover:bg-sky-200/50 hover:text-slate-900"}`}
              >
                <Users className={`size-5 transition-transform duration-300 ${activeTab === "clustering" ? "scale-110" : "group-hover:scale-105"}`} />
                <span style={{ fontWeight: activeTab === "clustering" ? 600 : 500 }}>Clustering</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-slate-900 tracking-tight" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
                {activeTab === "dashboard1" && "Dashboard"}
                {activeTab === "dashboard2" && "Analysis"}
                {activeTab === "rules" && "AssociationRules"}
                {activeTab === "clustering" && "Clustering"}
              </h2>

              {/* KHU VỰC THANH KÉO ĐIỀU CHỈNH TỐC ĐỘ */}
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                <span className="text-sm font-semibold text-slate-700">Độ trễ Stream:</span>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  defaultValue="1"
                  onChange={(e) => {
                    const val = e.target.value;
                    document.getElementById('speedValue')!.innerText = val + 's';
                    fetch(`http://localhost:8003/api/speed/${val}`).catch(err => console.log("Lỗi đổi tốc độ", err));
                  }}
                  className="w-32 cursor-pointer accent-blue-600"
                />
                <span className="text-sm font-mono font-bold text-slate-500 min-w-[3ch] text-right" id="speedValue">
                  1.0s
                </span>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-8 relative">
            <div className={activeTab === "dashboard1" ? "block h-full" : "hidden"}>
              <Dashboard1 /> 
            </div>
            <div className={activeTab === "dashboard2" ? "block h-full" : "hidden"}>
              <Dashboard2 />
            </div>
            <div className={activeTab === "rules" ? "block h-full" : "hidden"}>
              <AssociationRulesTab/>
            </div>
            <div className={activeTab === "clustering" ? "block h-full" : "hidden"}>
              <ClusteringTab />
            </div>
          </div>
        </main>
      </div>
    </DndProvider>
  );
}
