"use client";

import { ReactNode, useState } from "react";
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
import { LayoutDashboard, Users, Settings, Bell, Search, Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathSegments = pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Sidebar */}
      <aside 
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } border-r border-slate-200 bg-white/80 backdrop-blur-md hidden md:flex flex-col sticky top-0 h-screen transition-all duration-300 ease-in-out`}
      >
        <div className={`p-6 border-b border-slate-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <Link href="/dashboard" className="flex items-center gap-2 group overflow-hidden">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
              IA
            </div>
            {!isCollapsed && (
              <span className="text-lg font-bold tracking-tight text-slate-800 truncate animate-in fade-in duration-300">
                Interview Assist
              </span>
            )}
          </Link>
          
          {!isCollapsed && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsCollapsed(true)}
              className="text-slate-400 hover:text-slate-600 h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {isCollapsed && (
          <div className="flex justify-center p-4 border-b border-slate-50">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsCollapsed(false)}
              className="text-slate-400 hover:text-slate-600 h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <nav className="flex-1 p-4 space-y-1">
          <SidebarLink 
            href="/dashboard" 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Overview" 
            active={pathname === '/dashboard'} 
            isCollapsed={isCollapsed}
          />
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100">
          <div className={`flex items-center gap-3 p-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 shrink-0 rounded-full bg-slate-200" />
            {!isCollapsed && (
              <div className="flex flex-col truncate animate-in fade-in duration-300">
                <span className="text-sm font-semibold text-slate-700 truncate">Lead Recruiter</span>
                <span className="text-xs text-slate-500 underline truncate">recruiter@company.com</span>
              </div>
            )}
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

function SidebarLink({ 
  href, 
  icon, 
  label, 
  active, 
  isCollapsed 
}: { 
  href: string, 
  icon: React.ReactNode, 
  label: string, 
  active: boolean,
  isCollapsed: boolean
}) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
      } ${isCollapsed ? 'justify-center px-0' : ''}`}
    >
      <div className={`${isCollapsed ? 'scale-110' : ''}`}>
        {icon}
      </div>
      {!isCollapsed && (
        <span className="truncate animate-in fade-in duration-300">
          {label}
        </span>
      )}
    </Link>
  );
}
