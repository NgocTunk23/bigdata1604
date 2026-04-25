import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Recommendation from "./pages/Recommendation";
import Clustering from "./pages/Clustering";
import DeepAnalysis from "./pages/DeepAnalysis";

export default function App() {
  return (
    <BrowserRouter>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden bg-[#f3f5f8]">
          
          {/* Sidebar */}
          <AppSidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Navbar/Header cố định */}
            <header className="h-16 border-b border-[#d8e2ee] bg-white px-6 flex items-center justify-between shrink-0 z-50">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-[#355070] hover:bg-[#e9f1fb] hover:text-[#1d4f8f]" />
                <h1 className="text-xl font-semibold text-[#1f3c5a]">
                  Big Data Retail Analytics
                </h1>
              </div>

              {/* Phần bên phải Navbar (có thể thêm sau) */}
              <div className="flex items-center gap-6 text-[#355070]">
                <div className="text-sm text-[#5f7c9c]">Ho Chi Minh City, VN</div>
                {/* Thêm avatar, notification... sau này */}
              </div>
            </header>

            {/* Nội dung chính - Có scroll riêng */}
            <main className="flex-1 overflow-auto bg-[#f3f5f8]">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/recommendation" element={<Recommendation />} />
                <Route path="/clustering" element={<Clustering />} />
                <Route path="/deep-analysis" element={<DeepAnalysis />} />
              </Routes>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </BrowserRouter>
  );
}