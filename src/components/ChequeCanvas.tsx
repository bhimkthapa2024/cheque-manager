"use client";

import React, { useMemo } from "react";
import { Landmark, ShieldCheck } from "lucide-react";
import { numberToWordsNepalese, numberToWordsInternational } from "@/lib/numberToWords";

interface ChequeCanvasProps {
  bankName?: string;
  accountNumber?: string;
  chequeNumber?: string;
  vendorName?: string;
  amount: number;
  chequeDate: string; // e.g. "2026-05-21"
  formatStyle?: "nepalese" | "international";
  companyName?: string;
}

export default function ChequeCanvas({
  bankName = "Select a Bank",
  accountNumber = "000000000000",
  chequeNumber = "000000",
  vendorName = "Select a Vendor",
  amount,
  chequeDate,
  formatStyle = "nepalese",
  companyName = "Active Company",
}: ChequeCanvasProps) {
  // Convert amount to words
  const amountInWords = useMemo(() => {
    if (!amount || amount <= 0) return "Zero Rupees Only";
    return formatStyle === "nepalese"
      ? numberToWordsNepalese(amount)
      : numberToWordsInternational(amount);
  }, [amount, formatStyle]);

  // Format date to DDMMYYYY character array for individual box grids
  const dateDigits = useMemo(() => {
    if (!chequeDate) return Array(8).fill("");
    try {
      const parts = chequeDate.split("-"); // YYYY-MM-DD
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        const combined = `${day}${month}${year}`;
        return combined.split("").slice(0, 8);
      }
    } catch (e) {
      // fallback
    }
    return Array(8).fill("");
  }, [chequeDate]);

  // Format amount with commas (Nepalese or International style)
  const formattedAmount = useMemo(() => {
    if (!amount || amount <= 0) return "0.00";
    try {
      if (formatStyle === "nepalese") {
        return amount.toLocaleString("en-NP", { minimumFractionDigits: 2 });
      }
      return amount.toLocaleString("en-US", { minimumFractionDigits: 2 });
    } catch (e) {
      return amount.toFixed(2);
    }
  }, [amount, formatStyle]);

  // Generate fake MICR number for real cheque feeling
  const micrCode = useMemo(() => {
    const cleanSerial = chequeNumber.replace(/\D/g, "").padStart(6, "0");
    const cleanAccount = accountNumber.replace(/\D/g, "").slice(0, 9).padStart(9, "0");
    return `⑈ ${cleanSerial} ⑈ 012345678⑆ ${cleanAccount} ⑈ 10`;
  }, [chequeNumber, accountNumber]);

  return (
    <div className="relative w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-tr from-slate-900 to-indigo-950 p-6 text-white shadow-2xl border border-white/10 select-none max-w-3xl mx-auto">
      {/* Background safety watermark print patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/safety-paper.png')] opacity-10 pointer-events-none" />
      
      {/* Microline grid overlay for high-fidelity look */}
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      {/* Main Cheque Container */}
      <div className="relative flex flex-col justify-between h-[300px] bg-slate-50 text-slate-800 rounded-3xl p-6 border-4 border-slate-200/80 overflow-hidden shadow-inner">
        {/* Security Watermark inside the cheque */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
          <ShieldCheck className="w-56 h-56 text-accent" />
        </div>

        {/* Top Section: Bank Header and Date */}
        <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent border border-accent/10">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 leading-tight uppercase tracking-tight text-sm">
                {bankName}
              </h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                Branch: Authorized Location
              </p>
            </div>
          </div>

          {/* Individual DD-MM-YYYY Boxes */}
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</span>
            <div className="flex gap-[2px]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-6 bg-white border border-slate-300 rounded flex items-center justify-center font-mono font-black text-xs text-slate-800 shadow-sm relative"
                >
                  {dateDigits[i]}
                  {/* Visual separation indicators for DD MM YYYY */}
                  {(i === 1 || i === 3) && (
                    <div className="absolute -right-[2px] top-1 bottom-1 w-[1px] bg-slate-200 pointer-events-none" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Section: Payable & Amount in Words */}
        <div className="space-y-4 z-10 mt-2">
          {/* Payable Line */}
          <div className="flex items-end gap-3 w-full">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
              Pay Against This Cheque To
            </span>
            <div className="flex-1 border-b border-dashed border-slate-300 pb-1 px-2">
              <span className="text-sm font-black text-slate-900 tracking-tight">
                {vendorName}
              </span>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
              Or Bearer
            </span>
          </div>

          {/* Amount In Words Line */}
          <div className="flex items-end gap-3 w-full">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
              Sum Of Rupees
            </span>
            <div className="flex-1 border-b border-dashed border-slate-300 pb-1 px-2 min-h-[28px] flex items-center">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {amountInWords}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Account Info, Numeric Amount, Signatory, and MICR */}
        <div className="flex justify-between items-end z-10 mt-2">
          {/* Left: Account number and MICR label */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 bg-slate-200/50 px-2.5 py-1 rounded-lg border border-slate-300/40 w-fit">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">A/C No:</span>
              <span className="text-xs font-mono font-black text-slate-800">{accountNumber}</span>
            </div>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
              Cheque not valid after 3 months from date of issue
            </p>
          </div>

          {/* Right: Numeric Amount Box and Signatory */}
          <div className="flex items-end gap-8">
            {/* Amount Box */}
            <div className="bg-slate-200/80 px-4 py-2 border-2 border-slate-300 rounded-xl shadow-inner min-w-[150px] text-center flex items-center justify-center gap-1.5 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1 bg-accent" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">NPR</span>
              <span className="text-base font-black text-slate-900 tracking-tighter">
                {formattedAmount}
              </span>
            </div>

            {/* Signature Area */}
            <div className="flex flex-col items-center min-w-[140px] text-center relative">
              {/* Dynamic Simulated Signature */}
              {amount > 0 && (
                <div className="absolute -top-10 font-mono italic text-accent opacity-75 select-none animate-in fade-in slide-in-from-bottom-2 duration-700 text-lg">
                  {companyName}
                </div>
              )}
              <div className="w-full border-t border-slate-300 pt-1 mt-6">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  Authorized Signatory
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom MICR Bar */}
        <div className="w-full text-center mt-3 pt-2 border-t border-slate-100 flex justify-center items-center">
          <span className="font-mono text-sm tracking-[0.25em] text-slate-400 select-all font-black select-none pointer-events-none">
            {micrCode}
          </span>
        </div>
      </div>
    </div>
  );
}
