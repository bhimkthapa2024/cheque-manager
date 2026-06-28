"use client";

import { useState, useEffect, useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { storage } from "@/lib/storage";
import type { Cheque, Vendor, Bank } from "@/types";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  ArrowUpRight, 
  Search,
  PieChart,
  Filter,
  CheckCircle2,
  Calendar
} from "lucide-react";
import Link from "next/link";

export default function VendorAnalysisHub() {
  const { activeCompany } = useCompany();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!activeCompany) return;

    setIsLoading(true);
    const allVendors = storage.get<Vendor>("vendors").filter(v => v.companyId === activeCompany.id);
    const allCheques = storage.get<Cheque>("cheques").filter(c => c.companyId === activeCompany.id);

    setVendors(allVendors);
    setCheques(allCheques);
    setIsLoading(false);
  }, [activeCompany]);

  const vendorStats = useMemo(() => {
    return vendors.map(v => {
      const vCheques = cheques.filter(c => c.vendorId === v.id);
      const validCheques = vCheques.filter(c => c.status !== 'void' && c.status !== 'cancelled');
      const clearedCheques = vCheques.filter(c => c.status === 'cleared');
      const totalAmount = clearedCheques.reduce((sum, c) => sum + c.amount, 0);
      const bouncedCount = vCheques.filter(c => c.status === 'bounced').length;
      const clearedCount = clearedCheques.length;
      const lastCheque = vCheques.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];
      
      return {
        ...v,
        totalAmount,
        chequeCount: validCheques.length,
        bouncedCount,
        clearedCount,
        lastDate: lastCheque ? new Date(lastCheque.issueDate) : null,
        riskScore: validCheques.length > 0 ? (bouncedCount / validCheques.length) * 100 : 0
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [vendors, cheques]);

  const globalStats = useMemo(() => {
    const clearedCheques = cheques.filter(c => c.status === 'cleared');
    const totalDisbursed = clearedCheques.reduce((sum, c) => sum + c.amount, 0);
    const topVendor = vendorStats[0];
    const totalBounces = cheques.filter(c => c.status === 'bounced').length;
    const validChequesCount = cheques.filter(c => c.status !== 'void' && c.status !== 'cancelled').length;
    
    return {
      totalDisbursed,
      topVendor,
      totalBounces,
      validChequesCount,
      avgPerVendor: vendors.length > 0 ? totalDisbursed / vendors.length : 0
    };
  }, [vendorStats, cheques, vendors.length]);

  const filteredStats = vendorStats.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!activeCompany) return null;

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Area */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Treasury Intelligence</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Vendor Intelligence Hub</h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">Comparative financial analysis and risk profiling of all business partners.</p>
        </div>
      </div>

      {/* Global Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-slate-200 group hover:border-accent/20 transition-all">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Settlements</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">
            <span className="text-xs text-slate-300 mr-1 font-bold">NPR</span>
            {globalStats.totalDisbursed.toLocaleString()}
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
            <TrendingUp className="w-3 h-3" />
            Across {vendors.length} Vendors
          </div>
        </div>

        <div className="glass-card p-6 border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Top Beneficiary</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 truncate">
            {globalStats.topVendor?.name || "None"}
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest">
            <PieChart className="w-3 h-3" />
            {globalStats.topVendor ? ((globalStats.topVendor.totalAmount / globalStats.totalDisbursed) * 100).toFixed(1) : 0}% Share
          </div>
        </div>

        <div className="glass-card p-6 border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Average per Vendor</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">
            <span className="text-xs text-slate-300 mr-1 font-bold">NPR</span>
            {globalStats.avgPerVendor.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <Users className="w-3 h-3" />
            Distributed Volume
          </div>
        </div>

        <div className="glass-card p-6 border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Bounced Ratio</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">
            {globalStats.validChequesCount > 0 ? (globalStats.totalBounces / globalStats.validChequesCount * 100).toFixed(1) : 0}%
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-widest">
            <AlertTriangle className="w-3 h-3" />
            System-Wide Risk
          </div>
        </div>
      </div>

      {/* Comparative Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Filter by vendor name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full pl-12"
            />
          </div>
          <div className="flex items-center gap-4">
             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase tracking-widest hover:shadow-sm transition-all">
                <Filter className="w-4 h-4" />
                Sort By Amount
             </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="py-5 px-8">Vendor Profile</th>
                <th className="py-5 px-8">Settlement Metrics</th>
                <th className="py-5 px-8">Status Breakdown</th>
                <th className="py-5 px-8">Last Activity</th>
                <th className="py-5 px-8 text-right">Insight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStats.map((v) => (
                <tr key={v.id} className="reactive-row group">
                  <td className="py-4 px-8">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-sm border border-indigo-100 group-hover:scale-110 transition-transform">
                        {v.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 tracking-tight">{v.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{v.contactPhone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-8">
                    <div className="space-y-1">
                      <p className="text-base font-black text-slate-900 tracking-tighter">NPR {v.totalAmount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{v.clearedCount} Cleared</p>
                    </div>
                  </td>
                  <td className="py-4 px-8">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Cleared</span>
                        <span className="text-sm font-black text-slate-700">{v.clearedCount}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Bounced</span>
                        <span className="text-sm font-black text-slate-700">{v.bouncedCount}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-8">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-slate-300" />
                      <span className="text-xs font-bold text-slate-500">{v.lastDate ? v.lastDate.toLocaleDateString() : 'No Activity'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-8 text-right">
                    <Link 
                      href={`/vendors/detail-analytics?id=${v.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all group-hover:scale-105"
                    >
                      Deep Dive <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
