// src/app/dashboard/layout.tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "@/components/ui/loader";
import { Logo } from "@/components/layout/Logo";
import { AuthButton } from "@/components/auth/AuthButton";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Home, Users, Briefcase, FileText, UploadCloud, Settings, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation';


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default open state

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/"); // Redirect to login if not authenticated
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size={48} />
      </div>
    );
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/candidates/new", label: "Add Candidate", icon: UploadCloud },
    { href: "/dashboard/candidates", label: "Candidates", icon: Users },
    { href: "/dashboard/jobs/new", label: "Add Job", icon: Briefcase },
    { href: "/dashboard/jobs", label: "Jobs", icon: FileText },
  ];

  return (
    <SidebarProvider defaultOpen={true} open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4 flex flex-col items-center group-data-[collapsible=icon]:hidden">
           <Logo iconSize={32} textSize="text-3xl" />
        </SidebarHeader>
        <SidebarHeader className="p-0 hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:py-4">
            <Logo iconSize={28} textSize="text-2xl" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    className={cn(pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground")}
                    isActive={pathname === item.href}
                    tooltip={{content: item.label, side: "right", className: "bg-popover text-popover-foreground"}}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border">
           <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip={{content: "Settings", side: "right", className: "bg-popover text-popover-foreground"}}>
                  <Settings /> <span>Settings</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip={{content: "Help", side: "right", className: "bg-popover text-popover-foreground"}}>
                  <LifeBuoy /> <span>Help</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-background/80 backdrop-blur-sm border-b">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" /> {/* Only show on mobile */}
            <span className="text-xl font-semibold text-foreground">
              {navItems.find(item => pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard"))?.label || "TalentFlow AI"}
            </span>
          </div>
          <AuthButton />
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
