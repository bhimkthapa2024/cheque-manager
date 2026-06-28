"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCompany } from "@/contexts/CompanyContext";
import { storage } from "@/lib/storage";
import type { Cheque, Vendor, Bank } from "@/types";
import { 
  Users, 
  ArrowLeft, 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowUpRight,
  Landmark,
  PieChart,
  BarChart3
} from "lucide-react";
import Link from "next/link";

export default function VendorAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { activeCompany } = useCompany();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeCompany || !params.id) return;

    setIsLoading(true);
    const allVendors = storage.get<Vendor>("vendors");
    const foundVendor = allVendors.find(v => v.id === params.id && v.companyId === activeCompany.id);
    
    if (!foundVendor) {
      router.push('/vendors');
      return;
    }

    setVendor(foundVendor);

    const allCheques = storage.get<Cheque>("cheques")
      .filter(c => c.vendorId === params.id && c.companyId === activeCompany.id)
      .map(c => ({
        ...c,
        chequeDate: new Date(c.chequeDate),
        issueDate: new Date(c.issueDate)
      }))
      .sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime());

    setCheques(allCheques);

    const allBanks = storage.get<Bank>("banks").filter(b => b.companyId === activeCompany.id);
    setBanks(allBanks);

    setIsLoading(false);
  }, [activeCompany, params.id, router]);

  const metrics = useMemo(() => {
    if (cheques.length === 0) return null;

    const validCheques = cheques.filter(c => c.status !== 'void' && c.status !== 'cancelled');
    const cleared = cheques.filter(c => c.status === 'cleared');
    const bounced = cheques.filter(c => c.status === 'bounced');
    const lastCheque = cheques[0];

    const totalAmount = cleared.reduce((sum, c) => sum + c.amount, 0);
    const avgAmount = validCheques.length > 0 
      ? validCheques.reduce((sum, c) => sum + c.amount, 0) / validCheques.length 
      : 0;
    
    // Monthly trend (last 6 months - only count cleared successful cash outflows)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trend = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const monthIdx = d.getMonth();
      const monthYear = d.getFullYear();
      
      const amount = cleared
        .filter(c => c.issueDate.getMonth() === monthIdx && c.issueDate.getFullYear() === monthYear)
        .reduce((sum, c) => sum + c.amount, 0);
        
      return { label: months[monthIdx], amount };
    });

    const maxTrendAmount = Math.max(...trend.map(t => t.amount)) || 1;

    return {
      totalAmount,
      avgAmount,
      clearedCount: cleared.length,
      bouncedCount: bounced.length,
      lastCheque,
      trend,
      maxTrendAmount,
      validChequesCount: validCheques.length
    };
  }, [cheques]);

  if (isLoading || !vendor) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-6">
          <Link href="/vendors" className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 transition-all hover:shadow-md">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vendor Intelligence</span>
              <div className="h-1 w-1 rounded-full bg-accent animate-pulse" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{vendor.name}</h1>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-black text-slate-900">Registered {new Date(vendor.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-accent/5 rounded-2xl text-accent border border-accent/10">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Lifetime</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Settlement</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
            <span className="text-xs text-slate-300 mr-1.5 font-bold">NPR</span>
            {metrics?.totalAmount.toLocaleString('en-NP') || "0.00"}
          </h3>
        </div>

        <div className="glass-card p-6 border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{metrics?.validChequesCount || 0} Cheques</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Average Payment</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
            <span className="text-xs text-slate-300 mr-1.5 font-bold">NPR</span>
            {metrics?.avgAmount.toLocaleString('en-NP', { maximumFractionDigits: 0 }) || "0.00"}
          </h3>
        </div>

        <div className="glass-card p-6 border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{metrics?.clearedCount || 0} Cleared</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clearance Ratio</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
            {metrics?.validChequesCount && metrics.validChequesCount > 0 
              ? ((metrics?.clearedCount || 0) / metrics.validChequesCount * 100).toFixed(1) 
              : "0.0"}%
          </h3>
        </div>

        <div className="glass-card p-6 border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-2xl text-red-600 border border-red-100">
              <XCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{metrics?.bouncedCount || 0} Issues</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bounced Ratio</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
            {metrics?.validChequesCount && metrics.validChequesCount > 0 
              ? ((metrics?.bouncedCount || 0) / metrics.validChequesCount * 100).toFixed(1) 
              : "0.0"}%
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend & Last Transaction */}
        <div className="lg:col-span-2 space-y-8">
          {/* Monthly Trend Chart (Visual) */}
          <div className="glass-card p-10">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Payment Velocity</h3>
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-1">Last 6 Months Trend</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 border border-slate-100">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
            
            <div className="flex items-end justify-between h-48 gap-4 px-4">
              {metrics?.trend.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                  <div className="w-full relative flex flex-col justify-end h-full">
                    <div 
                      className="w-full bg-accent/10 rounded-t-xl group-hover:bg-accent/20 transition-all cursor-default relative"
                      style={{ height: `${(t.amount / metrics.maxTrendAmount * 100) || 5}%` }}
                    >
                      {t.amount > 0 && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          NPR {t.amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Transaction History */}
          <div className="glass-card overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Financial Ledger</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing {cheques.length} Records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-4 px-8">Cheque #</th>
                    <th className="py-4 px-8">Issue Date</th>
                    <th className="py-4 px-8">Bank</th>
                    <th className="py-4 px-8">Amount</th>
                    <th className="py-4 px-8">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cheques.map((c) => {
                    const bank = banks.find(b => b.id === c.bankId);
                    return (
                      <tr key={c.id} className="reactive-row group">
                        <td className="py-3 px-8 font-mono font-black text-slate-900">{c.chequeNumber}</td>
                        <td className="py-3 px-8 text-sm font-bold text-slate-500">{c.issueDate.toLocaleDateString()}</td>
                        <td className="py-3 px-8">
                          <div className="flex items-center gap-2">
                            <Landmark className="w-3.5 h-3.5 text-slate-300" />
                            <span className="text-xs font-black text-slate-600">{bank?.bankName || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-8 font-black text-slate-900 tracking-tighter text-base">NPR {c.amount.toLocaleString()}</td>
                        <td className="py-3 px-8">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                            c.status === 'cleared' ? 'bg-emerald-50 text-emerald-600' :
                            c.status === 'bounced' ? 'bg-red-50 text-red-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Reports */}
        <div className="space-y-8">
          {/* Last Transaction Card */}
          {metrics?.lastCheque && (
            <div className="glass-card p-8 bg-slate-900 border-none text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Clock className="w-20 h-20" />
              </div>
              <div className="relative z-10">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Last Transaction</h4>
                <div className="space-y-1 mb-6">
                  <p className="text-3xl font-black tracking-tighter">NPR {metrics.lastCheque.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-accent font-black uppercase tracking-widest">#{metrics.lastCheque.chequeNumber}</p>
                </div>
                <div className="pt-6 border-t border-white/10 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Issued Date</span>
                  <span className="text-white">{metrics.lastCheque.issueDate.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Analysis */}
          <div className="glass-card p-8">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-accent" />
              Operational Insight
            </h4>
            <div className="space-y-6">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                  {cheques.length > 5 
                    ? `This vendor has a stable payment history with a ${((metrics?.clearedCount || 0) / cheques.length * 100).toFixed(0)}% clearance rate. Most frequent settlements occur through ${banks[0]?.bankName || "registered banks"}.`
                    : "Insufficient transaction volume for a detailed operational risk profile. Continue issuing cheques to build analytic depth."}
                </p>
              </div>
              
              <button className="w-full py-4 bg-accent text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                Export Analysis Report <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
