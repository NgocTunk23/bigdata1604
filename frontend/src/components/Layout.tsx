import { AppSidebar } from "./Sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#e8edf3]">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - Fixed, không di chuyển khi scroll */}
          <header className="h-16 border-b border-[#4a6072]/30 bg-[#1f2228] px-6 flex items-center justify-between shrink-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-[#e8edf3] hover:bg-[#353a44]" />
              <h1 className="text-xl font-semibold text-[#e8edf3]">
                Big Data Retail Analytics
              </h1>
            </div>

            {/* Phần bên phải header (có thể thêm sau) */}
            <div className="flex items-center gap-4 text-[#e8edf3]">
              {/* User info, notification, etc. */}
            </div>
          </header>

          {/* Content Area - Có scroll riêng */}
          <main className="flex-1 overflow-auto bg-[#e8edf3] p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}