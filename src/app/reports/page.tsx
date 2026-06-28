"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { storage } from "@/lib/storage";
import type { Cheque, Bank, Vendor, ChequeBook } from "@/types";
import { 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  Calendar, 
  CreditCard, 
  Download, 
  Printer, 
  CheckCircle2, 
  Activity, 
  Percent, 
  AlertCircle 
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function ReportsPage() {
  const { activeCompany, syncCounter } = useCompany();
  const { showToast } = useToast();

  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [chequeBooks, setChequeBooks] = useState<ChequeBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [selectedBankId, setSelectedBankId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: ""
  });

  useEffect(() => {
    if (!activeCompany) return;
    setIsLoading(true);

    // Fetch data
    const allCheques = storage.get<Cheque>("cheques").map(c => ({
      ...c,
      chequeDate: new Date(c.chequeDate),
      issueDate: new Date(c.issueDate),
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt)
    }));

    const allBanks = storage.get<Bank>("banks");
    const allVendors = storage.get<Vendor>("vendors");
    const allChequeBooks = storage.get<ChequeBook>("chequeBooks");

    setCheques(allCheques.filter(c => c.companyId === activeCompany.id));
    setBanks(allBanks.filter(b => b.companyId === activeCompany.id));
    setVendors(allVendors.filter(v => v.companyId === activeCompany.id));
    setChequeBooks(allChequeBooks.filter(cb => cb.companyId === activeCompany.id));
    
    setIsLoading(false);
  }, [activeCompany, syncCounter]);

  // Total Liquidity
  const totalLiquidity = useMemo(() => {
    return banks.reduce((sum, b) => sum + (b.balance || 0), 0);
  }, [banks]);

  // Filtered Cheques based on selection
  const filteredCheques = useMemo(() => {
    return cheques.filter(c => {
      const matchesBank = selectedBankId === "all" || c.bankId === selectedBankId;
      const chequeTime = c.chequeDate.getTime();
      const matchesStart = !dateRange.start || chequeTime >= new Date(dateRange.start).getTime();
      const matchesEnd = !dateRange.end || chequeTime <= new Date(dateRange.end).getTime();
      return matchesBank && matchesStart && matchesEnd;
    });
  }, [cheques, selectedBankId, dateRange]);

  // Report 1: Cumulative cash Runway calculation
  const runwayData = useMemo(() => {
    // Collect all uncleared issued cheques, sorted by date
    const uncleared = cheques
      .filter(c => c.status === "issued" && (selectedBankId === "all" || c.bankId === selectedBankId))
      .sort((a, b) => a.chequeDate.getTime() - b.chequeDate.getTime());

    let runningOutflow = 0;
    const points: Array<{ date: string; formattedDate: string; outflow: number; balance: number; hasWarning: boolean }> = [];

    // Base point (Today)
    points.push({
      date: new Date().toISOString().split("T")[0],
      formattedDate: "Today",
      outflow: 0,
      balance: totalLiquidity,
      hasWarning: totalLiquidity < 0
    });

    uncleared.forEach(chq => {
      const dateStr = chq.chequeDate.toISOString().split("T")[0];
      runningOutflow += chq.amount;
      const forecastBalance = totalLiquidity - runningOutflow;

      // Group if same date already exists, update cumulative
      const existing = points.find(p => p.date === dateStr);
      if (existing) {
        existing.outflow = runningOutflow;
        existing.balance = forecastBalance;
        existing.hasWarning = forecastBalance < 0;
      } else {
        points.push({
          date: dateStr,
          formattedDate: chq.chequeDate.toLocaleDateString("en-NP", { month: "short", day: "numeric" }),
          outflow: runningOutflow,
          balance: forecastBalance,
          hasWarning: forecastBalance < 0
        });
      }
    });

    return points;
  }, [cheques, totalLiquidity, selectedBankId]);

  // Max Liability projection for SVG scaling
  const maxLiability = useMemo(() => {
    if (runwayData.length === 0) return 100000;
    const maxVal = Math.max(...runwayData.map(p => p.outflow), totalLiquidity);
    return maxVal * 1.15; // 15% padding
  }, [runwayData, totalLiquidity]);

  // Report 2: Cheque Book Burn-Rate Analytics
  const burnRateReports = useMemo(() => {
    return banks.map(bank => {
      // Find leaves registered to this bank
      const bankBooks = chequeBooks.filter(cb => cb.bankId === bank.id);
      const totalLeaves = bankBooks.reduce((sum, cb) => sum + (parseInt(cb.endSerial) - parseInt(cb.startSerial) + 1), 0);
      
      // Count issued cheques from this bank
      const issuedCount = cheques.filter(c => c.bankId === bank.id).length;
      const remainingLeaves = Math.max(0, totalLeaves - issuedCount);

      // Average issuance speed (leaves per day over the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const issuedLast30Days = cheques.filter(c => c.bankId === bank.id && c.createdAt >= thirtyDaysAgo).length;
      
      const burnRatePerDay = parseFloat((issuedLast30Days / 30).toFixed(2));
      const projectedDaysLeft = burnRatePerDay > 0 ? Math.ceil(remainingLeaves / burnRatePerDay) : null;

      return {
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        totalLeaves,
        remainingLeaves,
        burnRatePerDay,
        projectedDaysLeft,
        status: remainingLeaves === 0 ? "Empty" : remainingLeaves < 5 ? "Critical" : remainingLeaves < 15 ? "Warning" : "Healthy"
      };
    });
  }, [banks, chequeBooks, cheques]);

  // Report 3: Vendor Risk Scores & Velocity
  const vendorRiskMatrix = useMemo(() => {
    return vendors.map(vendor => {
      const vendorCheques = cheques.filter(c => c.vendorId === vendor.id);
      const totalCount = vendorCheques.length;
      if (totalCount === 0) {
        return {
          vendorName: vendor.name,
          totalCount: 0,
          bounceCount: 0,
          bounceRate: 0,
          outstandingVal: 0,
          risk: "Low Risk",
          riskColor: "text-emerald-500 bg-emerald-50 border-emerald-100"
        };
      }

      const bounceCount = vendorCheques.filter(c => c.status === "bounced").length;
      const bounceRate = parseFloat(((bounceCount / totalCount) * 100).toFixed(1));
      
      const outstandingVal = vendorCheques
        .filter(c => c.status === "issued")
        .reduce((sum, c) => sum + c.amount, 0);

      // Risk profiling
      let risk = "Low Risk";
      let riskColor = "text-emerald-500 bg-emerald-50 border-emerald-100";
      if (bounceRate > 15) {
        risk = "Critical Risk";
        riskColor = "text-red-500 bg-red-50 border-red-100";
      } else if (bounceRate > 5) {
        risk = "Medium Risk";
        riskColor = "text-amber-500 bg-amber-50 border-amber-100";
      }

      return {
        vendorName: vendor.name,
        totalCount,
        bounceCount,
        bounceRate,
        outstandingVal,
        risk,
        riskColor
      };
    });
  }, [vendors, cheques]);

  // Report 4: Bank Shares Segment (SVG segment angles)
  const bankShares = useMemo(() => {
    const totalIssuedVal = cheques
      .filter(c => c.status === "issued")
      .reduce((sum, c) => sum + c.amount, 0);

    if (totalIssuedVal === 0) return [];

    let accumulatedPercentage = 0;
    return banks.map(b => {
      const bankIssuedVal = cheques
        .filter(c => c.bankId === b.id && c.status === "issued")
        .reduce((sum, c) => sum + c.amount, 0);
      
      const percentage = parseFloat(((bankIssuedVal / totalIssuedVal) * 100).toFixed(1));
      const startAngle = accumulatedPercentage * 3.6;
      accumulatedPercentage += percentage;
      const endAngle = accumulatedPercentage * 3.6;

      return {
        bankName: b.bankName,
        value: bankIssuedVal,
        percentage,
        startAngle,
        endAngle
      };
    }).filter(s => s.percentage > 0);
  }, [banks, cheques]);

  // CSV Exporter
  const handleExportCSV = () => {
    try {
      const headers = ["Forecast Date", "Current Liquidity (NPR)", "Cumulative Future Outflow (NPR)", "Net Cash Runway (NPR)", "Status"];
      const rows = runwayData.map(pt => [
        pt.date,
        totalLiquidity.toFixed(2),
        pt.outflow.toFixed(2),
        pt.balance.toFixed(2),
        pt.balance < 0 ? "OVERDRAFT WARNING" : "SAFE"
      ]);

      const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${activeCompany?.name.replace(/\s+/g, "_")}_cash_runway_report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("CSV report generated successfully!");
    } catch (e) {
      showToast("Failed to export CSV report.", "error");
    }
  };

  // PDF / Print Handler
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compiling Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 print:p-0 print:bg-white print:text-black">
      {/* Header and Control Bar */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-accent shrink-0" />
            Treasury Intelligence
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
            Predictive Liquidity Runway & Audit Analytics
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-accent/10 active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Interactive Filters (Hidden on Print) */}
      <div className="glass-card p-6 flex flex-wrap gap-8 items-center justify-between print:hidden">
        <div className="flex flex-wrap gap-8 items-center">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Debit Bank Filter</label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="glass-input text-xs py-2 px-4 rounded-xl min-w-[200px]"
            >
              <option value="all">All Registered Banks</option>
              {banks.map(b => (
                <option key={b.id} value={b.id}>{b.bankName} ({b.accountNumber})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Cheque Date Range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="glass-input text-xs py-2 px-3 rounded-xl"
              />
              <span className="text-slate-300 font-bold text-xs">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="glass-input text-xs py-2 px-3 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Global Stats Summary */}
        <div className="flex gap-8">
          <div className="text-right border-r border-slate-200 pr-8">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Available Cash</span>
            <span className="text-xl font-black text-slate-900 tracking-tight">NPR {totalLiquidity.toLocaleString("en-NP", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Outstanding Liability</span>
            <span className="text-xl font-black text-accent tracking-tight">
              NPR {cheques.filter(c => c.status === "issued").reduce((sum, c) => sum + c.amount, 0).toLocaleString("en-NP", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Layout 1: Runway Plot & Doughnut Share */}
      <div className="grid grid-cols-3 gap-8">
        
        {/* Left Col: Cash Runway Projection Area Chart */}
        <div className="col-span-2 glass-card p-8 flex flex-col justify-between min-h-[420px] print:col-span-3">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                30-Day Liquidity Runway Forecast
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Aggregate forward-looking Cash Runway charting outstanding cheques
              </p>
            </div>

            {/* Overdraft alert indicator */}
            {runwayData.some(p => p.hasWarning) ? (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-500 px-3 py-1.5 rounded-xl animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-wider">Overdraft Imminent</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-500 px-3 py-1.5 rounded-xl">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-wider">Runway Safe</span>
              </div>
            )}
          </div>

          {/* SVG Area/Line Chart */}
          <div className="relative w-full h-[240px] flex items-end">
            {runwayData.length <= 1 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center gap-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Calendar className="w-8 h-8 text-slate-300" />
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">No future liabilities to forecast</p>
              </div>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  {/* Gradients */}
                  <linearGradient id="liquidityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="overdraftGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="50" x2="600" y2="50" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1="100" x2="600" y2="100" stroke="#E2E8F0" strokeWidth="0.5" />
                <line x1="0" y1="150" x2="600" y2="150" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="3,3" />

                {/* Baseline zero level */}
                <line x1="0" y1="140" x2="600" y2="140" stroke="#EF4444" strokeWidth="1" strokeDasharray="5,5" />
                <text x="5" y="135" fill="#EF4444" className="text-[7px] font-black uppercase tracking-widest font-mono">Overdraft Limit (NPR 0)</text>

                {/* Path Generation */}
                {(() => {
                  const padding = 30;
                  const stepX = (600 - padding * 2) / (runwayData.length - 1);
                  
                  // Coordinate points mapping
                  const points = runwayData.map((pt, i) => {
                    const x = padding + i * stepX;
                    // Scale balance relative to max value: balance / maxLiability * chartHeight
                    const y = 180 - (pt.balance / maxLiability) * 140;
                    return { x, y };
                  });

                  // Build SVG path
                  const d = points.reduce((path, pt, i) => {
                    return i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
                  }, "");

                  // Area closing path
                  const areaD = `${d} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`;

                  return (
                    <>
                      {/* Area Fill */}
                      <path d={areaD} fill="url(#liquidityGrad)" />

                      {/* Main Line */}
                      <path d={d} fill="none" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />

                      {/* Dots & Labels */}
                      {points.map((pt, i) => {
                        const original = runwayData[i];
                        return (
                          <g key={i}>
                            <circle 
                              cx={pt.x} 
                              cy={pt.y} 
                              r="4" 
                              fill={original.hasWarning ? "#EF4444" : "#4F46E5"} 
                              stroke="#FFFFFF" 
                              strokeWidth="1.5" 
                              className="cursor-pointer hover:r-6 transition-all"
                            />
                            {/* Hover tooltip text triggers */}
                            <text 
                              x={pt.x} 
                              y={pt.y - 10} 
                              textAnchor="middle" 
                              fill={original.hasWarning ? "#EF4444" : "#1E293B"} 
                              className="text-[8px] font-mono font-black"
                            >
                              {original.balance < 1000 ? `${(original.balance/1000).toFixed(1)}k` : `${Math.round(original.balance/1000)}k`}
                            </text>
                            
                            {/* X Axis Labels */}
                            <text 
                              x={pt.x} 
                              y="196" 
                              textAnchor="middle" 
                              fill="#94A3B8" 
                              className="text-[7px] font-black uppercase font-mono tracking-tighter"
                            >
                              {original.formattedDate}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            )}
          </div>
        </div>

        {/* Right Col: Bank Payout Share Doughnut */}
        <div className="glass-card p-8 flex flex-col justify-between print:col-span-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Percent className="w-5 h-5 text-accent" />
              Liability Dispersion
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Liability distribution share across registered bank accounts
            </p>
          </div>

          <div className="flex items-center justify-center my-6 relative">
            {bankShares.length === 0 ? (
              <div className="h-32 w-32 rounded-full border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-4">
                <CreditCard className="w-6 h-6 text-slate-300 mb-1" />
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none">No active drafts</span>
              </div>
            ) : (
              <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 42 42">
                {/* Underlay ring */}
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#F1F5F9" strokeWidth="4" />
                
                {/* SVG Segment Rings */}
                {bankShares.map((share, i) => {
                  const dashArray = `${share.percentage} ${100 - share.percentage}`;
                  // Calculating cumulative dash offsets
                  const offset = 100 - bankShares.slice(0, i).reduce((sum, s) => sum + s.percentage, 0);

                  const strokeColors = ["stroke-indigo-600", "stroke-sky-500", "stroke-violet-500", "stroke-emerald-500"];
                  const colorClass = strokeColors[i % strokeColors.length];

                  return (
                    <circle
                      key={i}
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="transparent"
                      className={colorClass}
                      strokeWidth="4.2"
                      strokeDasharray={dashArray}
                      strokeDashoffset={offset}
                    />
                  );
                })}
              </svg>
            )}
            <div className="absolute flex flex-col items-center">
              <span className="text-xs text-slate-400 font-black uppercase tracking-widest leading-none">Total Floating</span>
              <span className="text-base font-black text-slate-900 mt-1">
                NPR {cheques.filter(c => c.status === 'issued').reduce((sum, c) => sum + c.amount, 0).toLocaleString("en-NP", { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Share break list */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            {bankShares.map((share, i) => {
              const bgColors = ["bg-indigo-600", "bg-sky-500", "bg-violet-500", "bg-emerald-500"];
              const colorClass = bgColors[i % bgColors.length];

              return (
                <div key={share.bankName} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <div className={`w-2.5 h-2.5 rounded-full ${colorClass} shrink-0`} />
                    <span className="font-bold text-slate-700 truncate">{share.bankName}</span>
                  </div>
                  <div className="flex gap-4 shrink-0 font-mono font-black text-slate-900">
                    <span>NPR {share.value.toLocaleString("en-NP")}</span>
                    <span className="text-slate-400 font-bold">{share.percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Grid Layout 2: Burn-Rate inventory & Vendor Risk Scoring */}
      <div className="grid grid-cols-2 gap-8 print:grid-cols-1">
        
        {/* Left Side: Cheque Leaf Burn Rate Table */}
        <div className="glass-card p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              Cheque Leaf Burn-Rates
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Days-to-depletion projection calculated from average issuance velocities
            </p>
          </div>

          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="pb-3">Bank Account</th>
                  <th className="pb-3 text-center">Remaining</th>
                  <th className="pb-3 text-center">Burn Speed</th>
                  <th className="pb-3 text-right">Depletion Forecast</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {burnRateReports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 font-bold uppercase tracking-wide">
                      No registered cheque books found
                    </td>
                  </tr>
                ) : (
                  burnRateReports.map(report => (
                    <tr key={report.accountNumber} className="hover:bg-slate-50/50">
                      <td className="py-3">
                        <p className="font-bold text-slate-800 leading-none">{report.bankName}</p>
                        <span className="text-[10px] font-mono text-slate-400">A/C: {report.accountNumber}</span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-lg font-mono font-black text-[10px] ${
                          report.status === 'Critical' ? 'bg-red-50 text-red-500 border border-red-100' :
                          report.status === 'Warning' ? 'bg-amber-50 text-amber-500 border border-amber-100' :
                          'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          {report.remainingLeaves} leaves
                        </span>
                      </td>
                      <td className="py-3 text-center font-mono font-bold text-slate-600">
                        {report.burnRatePerDay} / day
                      </td>
                      <td className="py-3 text-right font-bold text-slate-800">
                        {report.remainingLeaves === 0 ? (
                          <span className="text-red-500 uppercase text-[9px] font-black">Depleted</span>
                        ) : report.projectedDaysLeft === null ? (
                          <span className="text-slate-400 uppercase text-[9px] font-black">No Velocity</span>
                        ) : (
                          <span className={report.projectedDaysLeft < 10 ? "text-amber-500 font-black animate-pulse" : ""}>
                            ~ {report.projectedDaysLeft} Days Left
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Vendor Risk matrix */}
        <div className="glass-card p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Vendor Risk Assessment
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Evaluates bounce rates, settlement volume, and reliability risk score
            </p>
          </div>

          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="pb-3">Vendor</th>
                  <th className="pb-3 text-center">Bounces</th>
                  <th className="pb-3 text-right">Outstanding Value</th>
                  <th className="pb-3 text-right">Security Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {vendorRiskMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 font-bold uppercase tracking-wide">
                      No vendors registered
                    </td>
                  </tr>
                ) : (
                  vendorRiskMatrix.map(risk => (
                    <tr key={risk.vendorName} className="hover:bg-slate-50/50">
                      <td className="py-3 font-bold text-slate-800">
                        {risk.vendorName}
                      </td>
                      <td className="py-3 text-center font-mono font-bold text-slate-600">
                        {risk.bounceCount} / {risk.totalCount} ({risk.bounceRate}%)
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-800">
                        NPR {risk.outstandingVal.toLocaleString("en-NP")}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${risk.riskColor}`}>
                          {risk.risk}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Grid Layout 3: Forward Ledger Detail (Visual report feed) */}
      <div className="glass-card p-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Forward Ledger Forecast
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Chronological ledger detailing future settlement payouts and projected cash pools
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <th className="pb-3">Date</th>
                <th className="pb-3">Description</th>
                <th className="pb-3 text-right">Settlement Outflow</th>
                <th className="pb-3 text-right">Net Cash Runway</th>
                <th className="pb-3 text-right">Status Checks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {runwayData.slice(1).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-bold uppercase tracking-wide">
                    No future scheduled liabilities
                  </td>
                </tr>
              ) : (
                runwayData.slice(1).map((pt, i) => {
                  const chqForDate = cheques.filter(c => c.status === "issued" && c.chequeDate.toISOString().split("T")[0] === pt.date);
                  
                  return (
                    <tr key={pt.date} className="hover:bg-slate-50/50 font-medium">
                      <td className="py-4 font-mono font-bold text-slate-600">
                        {new Date(pt.date).toLocaleDateString("en-NP", { year: "numeric", month: "long", day: "numeric" })}
                      </td>
                      <td className="py-4">
                        <span className="font-bold text-slate-800 block">
                          Payout on {chqForDate.length} Cheque{chqForDate.length > 1 ? "s" : ""}
                        </span>
                        <div className="flex gap-2.5 mt-1 flex-wrap">
                          {chqForDate.map(c => (
                            <span key={c.id} className="text-[9px] bg-slate-100 text-slate-500 font-mono font-bold px-1.5 py-0.5 rounded">
                              #{c.chequeNumber} (NPR {c.amount.toLocaleString("en-NP")})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 text-right font-mono font-black text-slate-900">
                        NPR {chqForDate.reduce((sum, c) => sum + c.amount, 0).toLocaleString("en-NP", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-right font-mono font-black text-slate-900">
                        NPR {pt.balance.toLocaleString("en-NP", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-right">
                        {pt.balance < 0 ? (
                          <span className="px-2.5 py-1 bg-red-50 text-red-500 border border-red-100 text-[9px] font-black uppercase tracking-wider rounded-lg inline-flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Overdraft Warning
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-500 border border-emerald-100 text-[9px] font-black uppercase tracking-wider rounded-lg inline-flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Clear Runway
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
