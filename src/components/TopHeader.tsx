"use client";

import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, ShieldCheck, Calendar, Bell, LogOut, Menu } from "lucide-react";
import { usePathname } from "next/navigation";

interface TopHeaderProps {
  onMenuClick?: () => void;
}

export function TopHeader({ onMenuClick }: TopHeaderProps) {
  const { activeCompany } = useCompany();
  const { userProfile, signOutUser } = useAuth();
  const pathname = usePathname();

  // Convert pathname to a readable breadcrumb
  const getPageTitle = () => {
    const segment = pathname.split('/')[1] || 'dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
  };

  if (!activeCompany) return null;

  const userName = userProfile?.name || "User";
  const userRole = userProfile?.role === "super_admin" ? "Super Admin" : "User";
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "US";
  };

  return (
    <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 px-4 md:px-12 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4 md:gap-8">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-900 md:hidden transition-colors rounded-lg hover:bg-slate-100 shrink-0"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Entity</span>
            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-accent flex items-center justify-center text-white text-xs font-black shadow-lg shadow-accent/20 shrink-0">
              {activeCompany.name.charAt(0)}
            </div>
            <h2 className="text-base md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 md:gap-2">
              <span className="truncate max-w-[100px] md:max-w-[300px]">{activeCompany.name}</span>
              <span className="text-slate-300 font-normal px-1 md:px-2">/</span>
              <span className="text-slate-400 font-bold text-sm tracking-normal hidden md:inline">{getPageTitle()}</span>
            </h2>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-4 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Company PAN/Tax ID</span>
            <span className="text-sm font-black text-slate-900 leading-none">{activeCompany.taxId}</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 md:p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 md:top-3 md:right-3 w-2 h-2 bg-accent rounded-full border-2 border-white" />
          </button>
          
          <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-slate-200">
            <div className="flex-col items-end hidden md:flex">
              <span className="text-xs font-black text-slate-900">{userName}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{userRole}</span>
            </div>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xs border-2 border-white shadow-xl shadow-slate-900/10 shrink-0">
              {getInitials(userName)}
            </div>
            
            <button
              onClick={() => signOutUser()}
              className="p-2 md:p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all ml-0 md:ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
