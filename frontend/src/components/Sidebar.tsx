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
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="p-4 font-bold text-2xl text-primary">
            Retail Analytics
          </div>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location.pathname === item.url;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      isActive={isActive}
                      onClick={() => {}} // nếu cần
                    >
                      <Link 
                        to={item.url} 
                        className="flex w-full items-center gap-3"
                      >
                        <item.icon className="h-4 w-4" />
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