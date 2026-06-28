"use client";

import { useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { TopHeader } from "@/components/TopHeader";
import { AuthScreen } from "@/components/AuthScreen";
import { Loader2, CreditCard } from "lucide-react";

export function AppContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white gap-6">
        <div className="relative flex items-center justify-center">
          <div className="h-20 w-20 rounded-[2rem] bg-accent flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.4)] animate-pulse z-10">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <div className="absolute h-28 w-28 rounded-[2.5rem] border border-accent/20 animate-spin duration-1000" />
          <div className="absolute h-36 w-36 rounded-[3rem] border border-indigo-500/10 animate-spin duration-[3000ms] reverse" />
        </div>
        <div className="flex flex-col items-center gap-1.5 mt-4">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Securing Gateway
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <Loader2 className="w-3 h-3 animate-spin" /> Verifying Credentials
          </div>
        </div>
      </div>
    );
  }


  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      <div className="flex-1 flex flex-col h-screen w-full overflow-hidden">
        <TopHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-12 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
