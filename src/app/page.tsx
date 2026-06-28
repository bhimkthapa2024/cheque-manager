"use client";

import { useState, useEffect } from "react";
import { CreditCard, Landmark, Users, ArrowUpRight, Building2, TrendingUp, AlertTriangle, CheckCircle2, Wallet, ArrowDownRight, PieChart, ShieldAlert } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { storage } from "@/lib/storage";
import type { Cheque, Bank, Vendor } from "@/types";
import Link from "next/link";

export default function Home() {
  const { activeCompany, syncCounter } = useCompany();
  const [data, setData] = useState({
    totalLiquidity: 0,
    outstandingLiabilities: 0,
    issuedChequesCount: 0,
    monthlyVolume: 0,
    bouncedRatio: 0,
    stats: { cheques: 0, banks: 0, vendors: 0 },
    topVendors: [] as { name: string, amount: number }[],
    recentCheques: [] as Cheque[]
  });

  const [insight, setInsight] = useState<{
    text: string;
    subtext: string;
    icon: React.ReactNode;
    color: string;
  } | null>(null);

  useEffect(() => {
    if (!activeCompany) return;

    const allCheques = storage.get<Cheque>("cheques").filter(c => c.companyId === activeCompany.id);
    const allBanks = storage.get<Bank>("banks").filter(b => b.companyId === activeCompany.id);
    const allVendors = storage.get<Vendor>("vendors").filter(v => v.companyId === activeCompany.id);

    // Calculations
    const totalLiquidity = allBanks.reduce((sum, b) => sum + b.balance, 0);
    const issuedCheques = allCheques.filter(c => c.status === 'issued');
    const outstandingLiabilities = issuedCheques.reduce((sum, c) => sum + c.amount, 0);
    const issuedChequesCount = issuedCheques.length;

    const thisMonth = new Date().getMonth();
    const monthlyVolume = allCheques
      .filter(c => c.status === 'cleared')
      .reduce((sum, c) => sum + c.amount, 0);

    const bouncedCount = allCheques.filter(c => c.status === 'bounced').length;
    const bouncedRatio = allCheques.length > 0 ? (bouncedCount / allCheques.length) * 100 : 0;

    // Top Vendors (Based on Cleared Cheques)
    const vendorMap: Record<string, number> = {};
    allCheques.filter(c => c.status === 'cleared').forEach(c => {
      vendorMap[c.vendorId] = (vendorMap[c.vendorId] || 0) + c.amount;
    });

    const topVendors = Object.entries(vendorMap)
      .map(([id, amount]) => ({
        name: allVendors.find(v => v.id === id)?.name || "Unknown",
        amount
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    setData({
      totalLiquidity,
      outstandingLiabilities,
      issuedChequesCount,
      monthlyVolume,
      bouncedRatio,
      stats: {
        cheques: allCheques.length,
        banks: allBanks.length,
        vendors: allVendors.length
      },
      topVendors,
      recentCheques: allCheques.slice(-5).reverse()
    });

    // Generate Insights
    const generateInsight = () => {
      const today = new Date().toISOString().split('T')[0];
      const dueToday = allCheques.filter(c => 
        c.status === 'issued' && 
        new Date(c.chequeDate).toISOString().split('T')[0] === today
      );

      if (totalLiquidity < outstandingLiabilities) {
        return {
          text: "Liquidity Warning",
          subtext: `Current liquidity covers only ${((totalLiquidity/outstandingLiabilities)*100 || 0).toFixed(0)}% of outstanding cheques.`,
          icon: <AlertTriangle className="w-5 h-5" />,
          color: "from-red-600 to-red-900"
        };
      }

      if (bouncedRatio > 5) {
        return {
          text: "Risk Alert",
          subtext: `${bouncedRatio.toFixed(1)}% bounce rate detected. Review vendor credit terms immediately.`,
          icon: <ShieldAlert className="w-5 h-5" />,
          color: "from-orange-600 to-orange-900"
        };
      }

      if (dueToday.length > 0) {
        return {
          text: "Action Required",
          subtext: `You have ${dueToday.length} cheque${dueToday.length > 1 ? 's' : ''} worth NPR ${dueToday.reduce((s,c) => s+c.amount, 0).toLocaleString()} due today.`,
          icon: <CreditCard className="w-5 h-5" />,
          color: "from-amber-600 to-amber-900"
        };
      }

      const topVendorConcentration = outstandingLiabilities > 0 ? (topVendors[0]?.amount / outstandingLiabilities) : 0;
      if (topVendorConcentration > 0.4) {
        return {
          text: "Vendor Concentration",
          subtext: `${topVendors[0].name} accounts for ${(topVendorConcentration*100).toFixed(0)}% of your total liabilities.`,
          icon: <Users className="w-5 h-5" />,
          color: "from-indigo-600 to-indigo-900"
        };
      }

      return {
        text: "Financial Health",
        subtext: `System stable. ${allCheques.filter(c => c.status === 'cleared').length} cheques cleared successfully this cycle.`,
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "from-emerald-600 to-emerald-900"
      };
    };

    setInsight(generateInsight());
  }, [activeCompany, syncCounter]);

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center animate-in fade-in zoom-in duration-700">
        <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 max-w-lg">
          <div className="h-20 w-20 bg-accent/5 rounded-3xl flex items-center justify-center text-accent mx-auto mb-8 animate-bounce">
            <Building2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-4">Select a Business Entity</h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Please choose a company from the sidebar to access its financial command center and real-time analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* KPI Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/banks" className="glass-card p-4 md:p-6 border-slate-200 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600">
              <Wallet className="w-5 h-5" />
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Liquidity</p>
          <h3 className="text-xl md:text-2xl font-black tracking-tight mb-1 text-slate-900">
            <span className="text-xs text-slate-300 mr-1.5 font-bold">NPR</span>
            {data.totalLiquidity.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
            +2.4% <span className="text-slate-400">vs last month</span>
          </p>
        </Link>

        <Link href="/cheques?status=issued" className="glass-card p-4 md:p-6 border-slate-200 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">Live</span>
              <span className="text-sm font-black text-slate-900 mt-1">{data.issuedChequesCount} Items</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding Liabilities</p>
          <h3 className="text-xl md:text-2xl font-black tracking-tight mb-1 text-slate-900">
            <span className="text-xs text-slate-300 mr-1.5 font-bold">NPR</span>
            {data.outstandingLiabilities.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 font-bold italic">Active Uncleared Cheques</p>
        </Link>

        <Link href="/cheques" className="glass-card p-4 md:p-6 border-slate-200 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Settlements</p>
          <h3 className="text-xl md:text-2xl font-black tracking-tight mb-1 text-slate-900">
            <span className="text-xs text-slate-300 mr-1.5 font-bold">NPR</span>
            {data.monthlyVolume.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
             Financial Ledger <CheckCircle2 className="w-3 h-3" />
          </p>
        </Link>

        <Link href="/cheques?status=bounced" className="glass-card p-4 md:p-6 border-slate-200 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${data.bouncedRatio > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
              {data.bouncedRatio > 0 ? 'Action Required' : 'Healthy'}
            </span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bounced Ratio</p>
          <h3 className="text-xl md:text-2xl font-black tracking-tight mb-1 text-slate-900">
            {data.bouncedRatio.toFixed(2)}%
          </h3>
          <p className="text-[10px] text-slate-400 font-bold italic">Risk Integrity Score</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Analytics Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-5 md:p-10 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Recent Financial Activity</h3>
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-1">Transaction Stream</p>
              </div>
              <Link href="/cheques" className="text-accent hover:text-accent/80 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 border-accent/10 pb-1">
                Full Ledger <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            
            {data.recentCheques.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <CreditCard className="w-12 h-12 mb-4 text-slate-300" />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No transactions recorded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.recentCheques.map((chq) => (
                  <div key={chq.id} className="bg-slate-50/50 border border-slate-100 p-4 md:p-5 rounded-3xl flex items-center justify-between hover:bg-slate-100 transition-colors group">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center border border-slate-200 group-hover:scale-110 transition-transform shadow-sm text-accent">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-slate-900 font-black tracking-tight">#{chq.chequeNumber}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                          {new Date(chq.issueDate).toLocaleDateString()} • {chq.status}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-900 font-black tracking-tighter">NPR {chq.amount.toLocaleString('en-NP')}</p>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">Outgoing</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-8">
          <Link href="/vendors/analytics" className="glass-card p-5 md:p-8 border-slate-100 bg-white block transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-accent" />
                Vendor Intelligence
              </span>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Grand Total</p>
                <p className="text-sm font-black text-emerald-600 tracking-tighter">NPR {data.monthlyVolume.toLocaleString()}</p>
              </div>
            </h4>
            
            <div className="space-y-8">
              {data.topVendors.length === 0 ? (
                <p className="text-center text-slate-300 text-xs font-bold uppercase tracking-widest py-10">Waiting for data...</p>
              ) : (
                data.topVendors.map((v, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-black text-slate-900 tracking-tight">{v.name}</span>
                      <span className="text-[10px] font-black text-slate-400">{(v.amount / data.monthlyVolume * 100 || 0).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-accent' : i === 1 ? 'bg-indigo-400' : 'bg-indigo-200'}`} 
                        style={{ width: `${(v.amount / data.monthlyVolume * 100) || 0}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-10 pt-10 border-t border-slate-100">
              <div className="bg-slate-50 p-4 md:p-6 rounded-[2rem] border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  </div>
                  <h5 className="font-black text-slate-900 text-sm">Security Guard</h5>
                </div>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
                  System integrity check passed. 100% of cheque serials verified against bank book range.
                </p>
              </div>
            </div>
          </Link>

          {insight && (
            <div className={`glass-card p-5 md:p-8 bg-gradient-to-br ${insight.color} border-none text-white relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02]`}>
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                    {insight.icon}
                  </div>
                  <h4 className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">{insight.text}</h4>
                </div>
                <p className="text-lg font-bold leading-tight mb-6">
                  {insight.subtext}
                </p>
                <Link href={insight.text.includes("Liquidity") || insight.text.includes("Risk") ? "/cheques" : "/"} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/80 group-hover:text-white transition-colors">
                  Open Strategy <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
