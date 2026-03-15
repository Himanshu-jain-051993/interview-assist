"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { LayoutDashboard, Users, Settings, Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white/80 backdrop-blur-md hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
              IA
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-800">Interview Assist</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <SidebarLink 
            href="/dashboard" 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Overview" 
            active={pathname === '/dashboard'} 
          />
          <SidebarLink 
            href="/dashboard/candidates" 
            icon={<Users className="w-4 h-4" />} 
            label="All Candidates" 
            active={pathname.includes('/candidates')} 
          />
          <SidebarLink 
            href="/dashboard/settings" 
            icon={<Settings className="w-4 h-4" />} 
            label="Settings" 
            active={pathname.includes('/settings')} 
          />
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100">
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 rounded-full bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-700">Lead Recruiter</span>
              <span className="text-xs text-slate-500 underline">recruiter@company.com</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
            
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                {pathSegments.includes('role') && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Role Details</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search candidates..." 
                className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <Button variant="ghost" size="icon" className="text-slate-500">
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
