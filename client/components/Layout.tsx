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
  SidebarMenuSub,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Users,
  Clock,
  Laptop,
  GraduationCap,
} from "lucide-react";

const menuItems = [
  {
    title: "Engagement Dashboard",
    icon: Activity,
    path: "/",
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
  {
    title: "Retention and Turnover",
    icon: Users,
    path: "/retention-turnover",
  },
  {
    title: "Monthly OT and Leave Claims",
    icon: Clock,
    path: "/ot-leave-claims",
    children: [
      { title: "OT Reports", path: "/ot-leave-claims/ot" },
      { title: "Leave Reports", path: "/ot-leave-claims/leave" },
    ],
  },
] as const;

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const activeTitle = (() => {
    const found = menuItems.find((item) =>
      location.pathname === item.path || location.pathname.startsWith(String(item.path) + "/"),
    );
    if (!found) return "Dashboard";
    if (found.children) {
      const child = found.children.find((c) => c.path === location.pathname);
      return child?.title || found.title;
    }
    return found.title;
  })();

  return (
    <div className="space-y-6">
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2">
              <img src="/favicon.ico" alt="CLAIRO" className="h-6 w-6" />
              <span className="text-xl font-bold">CLAIRO</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path || location.pathname.startsWith(String(item.path) + "/")}
                  >
                    <Link to={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {"children" in item && item.children?.length ? (
                    <SidebarMenuSub>
                      {item.children.map((c) => (
                        <li key={c.path}>
                          <SidebarMenuSubButton asChild isActive={location.pathname === c.path}>
                            <Link to={c.path}><span>{c.title}</span></Link>
                          </SidebarMenuSubButton>
                        </li>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-sidebar-border mx-2" />
            <h1 className="text-lg font-semibold flex-1">{activeTitle}</h1>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
