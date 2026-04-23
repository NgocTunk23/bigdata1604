import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Recommendation from "./pages/Recommendation";
import Clustering from "./pages/Clustering";

export default function App() {
  return (
    <BrowserRouter>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden bg-[#e8edf3]">
          
          {/* Sidebar */}
          <AppSidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Navbar/Header cố định */}
            <header className="h-16 border-b border-[#4a6072]/30 bg-[#1a1b1f] px-6 flex items-center justify-between shrink-0 z-50">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-[#e8edf3] hover:bg-[#353a44] hover:text-white" />
                <h1 className="text-xl font-semibold text-[#e8edf3]">
                  Big Data Retail Analytics
                </h1>
              </div>

              {/* Phần bên phải Navbar (có thể thêm sau) */}
              <div className="flex items-center gap-6 text-[#e8edf3]">
                <div className="text-sm text-[#7b9bb8]">Ho Chi Minh City, VN</div>
                {/* Thêm avatar, notification... sau này */}
              </div>
            </header>

            {/* Nội dung chính - Có scroll riêng */}
            <main className="flex-1 overflow-auto bg-[#e8edf3]">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/recommendation" element={<Recommendation />} />
                <Route path="/clustering" element={<Clustering />} />
              </Routes>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </BrowserRouter>
  );
}