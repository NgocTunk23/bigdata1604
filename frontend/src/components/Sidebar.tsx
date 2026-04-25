import { LayoutDashboard, ShoppingBag, Users, Activity } from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem 
} from "@/components/ui/sidebar";

import { Link, useLocation } from "react-router-dom";

const items = [
  { title: "Bảng điều khiển", url: "/", icon: LayoutDashboard },
  { title: "Phân tích sâu", url: "/deep-analysis", icon: Activity },
  { title: "Luật sinh", url: "/recommendation", icon: ShoppingBag },
  { title: "Phân cụm", url: "/clustering", icon: Users },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <SidebarGroup>

          {/* Title */}
          <div className="px-4 py-5">
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              Retail Analytics
            </h1>
          </div>

          {/* Divider */}
          <div className="mx-8 mb-6 h-px bg-border" />

          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-2">
              {items.map((item) => {
                const isActive = location.pathname === item.url;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      className={`
                        h-12 rounded-xl transition-all
                        ${isActive 
                          ? "bg-blue-400 text-white shadow-md scale-[1.02]" 
                          : "hover:bg-muted hover:scale-[1.01]"
                        }
                      `}
                    >
                      <Link 
                        to={item.url} 
                        className="flex items-center gap-4 px-4 text-base font-medium"
                      >
                        <item.icon 
                          className={`
                            h-5 w-5 
                            ${isActive ? "text-primary-foreground" : "text-muted-foreground"}
                          `} 
                        />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>

        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}