import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Activity,
  Users,
  Clock,
  Laptop,
  GraduationCap,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    icon: Activity,
    path: "/",
  },
  {
    title: "Retention and Turnover",
    icon: Users,
    path: "/retention-turnover",
  },
  {
    title: "Monthly OT and Leave Claims",
    icon: Clock,
    path: "/ot-leave-claims",
  },
  {
    title: "Laptop Inventory",
    icon: Laptop,
    path: "/laptop-inventory",
  },
  {
    title: "Certification and Training",
    icon: GraduationCap,
    path: "/certification-training",
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Activity className="h-6 w-6" />
            <span className="text-xl font-bold">CLAIRO</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.path}
                >
                  <Link to={item.path}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-sidebar-border mx-2" />
          <h1 className="text-lg font-semibold">
            {menuItems.find(item => item.path === location.pathname)?.title || "Dashboard"}
          </h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
