import { AppSidebar } from "./Sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#f3f5f8]">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - Fixed, không di chuyển khi scroll */}
          <header className="h-16 border-b border-[#d8e2ee] bg-white px-6 flex items-center justify-between shrink-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-[#355070] hover:bg-[#e9f1fb] hover:text-[#1d4f8f]" />
              <h1 className="text-xl font-semibold text-[#1f3c5a]">
                Big Data Retail Analytics
              </h1>
            </div>

            {/* Phần bên phải header (có thể thêm sau) */}
            <div className="flex items-center gap-4 text-[#355070]">
              {/* User info, notification, etc. */}
            </div>
          </header>

          {/* Content Area - Có scroll riêng */}
          <main className="flex-1 overflow-auto bg-[#f3f5f8] p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}