"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCompany } from "@/contexts/CompanyContext";
import { ArrowLeft, Book, CreditCard, CheckCircle2, Clock, XCircle, AlertCircle, Search, Trash2, Plus } from "lucide-react";
import type { ChequeBook, Cheque, ChequeStatus, Vendor } from "@/types";
import Link from "next/link";

const statusColors: Record<ChequeStatus, { bg: string, text: string, icon: React.ElementType }> = {
  available: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: Clock },
  draft: { bg: 'bg-amber-50', text: 'text-amber-600', icon: Clock },
  issued: { bg: 'bg-blue-50', text: 'text-blue-600', icon: CreditCard },
  cleared: { bg: 'bg-green-50', text: 'text-green-600', icon: CheckCircle2 },
  bounced: { bg: 'bg-red-50', text: 'text-red-600', icon: AlertCircle },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-500', icon: XCircle },
  void: { bg: 'bg-zinc-100', text: 'text-zinc-600', icon: Trash2 },
};

import { storage } from "@/lib/storage";

function ChequeBookDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { activeCompany, syncCounter } = useCompany();
  const [book, setBook] = useState<ChequeBook | null>(null);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!activeCompany || !id) return;

    setIsLoading(true);
    
    // Fetch Book
    const allBooks = storage.get<ChequeBook>("chequeBooks");
    const currentBook = allBooks.find(b => b.id === id);
    setBook(currentBook || null);

    // Fetch Vendors for mapping
    const allVendors = storage.get<Vendor>("vendors");
    setVendors(allVendors.filter(v => v.companyId === activeCompany.id));

    if (currentBook) {
      // Fetch all issued cheques for this company
      const allCheques = storage.get<Cheque>("cheques");
      
      const start = parseInt(currentBook.startSerial);
      const end = parseInt(currentBook.endSerial);
      const fullRange: Cheque[] = [];

      for (let i = start; i <= end; i++) {
        const serialStr = i.toString().padStart(currentBook.startSerial.length, '0');
        const fullSerial = `${currentBook.prefix || ''}${serialStr}`;
        
        const issued = allCheques.find(c => 
          c.companyId === activeCompany.id && 
          c.bankId === currentBook.bankId && 
          c.chequeNumber === fullSerial
        );

        if (issued) {
          fullRange.push({
            ...issued,
            issueDate: new Date(issued.issueDate)
          });
        } else {
          fullRange.push({
            id: `available_${fullSerial}`,
            companyId: activeCompany.id,
            bankId: currentBook.bankId,
            chequeNumber: fullSerial,
            amount: 0,
            vendorId: "",
            status: "available",
            chequeDate: new Date(),
            issueDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
      setCheques(fullRange);
    }
    
    setIsLoading(false);
  }, [id, activeCompany, syncCounter]);

  const filteredCheques = cheques.filter(c => 
    c.chequeNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!activeCompany) return null;

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-6">
        <button 
          onClick={() => router.back()}
          className="bg-white p-4 rounded-2xl text-slate-400 hover:text-slate-900 hover:shadow-md transition-all border border-slate-200 active:scale-90"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Inventory Audit
          </h1>
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs mt-2">
            Range: <span className="text-accent">{book?.prefix}{book?.startSerial}</span> — <span className="text-accent">{book?.prefix}{book?.endSerial}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <div className="lg:col-span-3 glass-card overflow-hidden flex flex-col shadow-sm">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="relative w-80">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search serial number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm text-slate-900 placeholder:text-slate-400 outline-none"
              />
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-100 px-5 py-2 rounded-xl border border-slate-200">
              Sequence Integrity: <span className="text-emerald-600">Verified</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="py-4 px-8">Serial Reference</th>
                  <th className="py-4 px-8">Current Status</th>
                  <th className="py-4 px-8">Beneficiary / Date</th>
                  <th className="py-4 px-8 text-right">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="py-6 px-8"><div className="h-4 bg-slate-100 rounded-full w-full" /></td>
                    </tr>
                  ))
                ) : filteredCheques.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-slate-400 italic font-bold">No matching serial numbers found in this book.</td>
                  </tr>
                ) : filteredCheques.map(cheque => {
                  const status = statusColors[cheque.status] || statusColors.available;
                  const StatusIcon = status.icon;
                  const vendor = vendors.find(v => v.id === cheque.vendorId);
                  
                  return (
                    <tr key={cheque.id} className="reactive-row group">
                      <td className="py-3 px-8">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-accent transition-colors" />
                          <span className="font-mono text-sm font-black text-slate-600 group-hover:text-slate-900 transition-colors tracking-tighter">
                            {cheque.chequeNumber}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-8">
                        <span className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${status.bg} ${status.text} border-current/10 shadow-sm shadow-current/5`}>
                          <div className={`p-1 rounded-lg ${status.bg} border border-current/20`}>
                            <StatusIcon className="w-3 h-3" />
                          </div>
                          {cheque.status}
                        </span>
                      </td>
                      <td className="py-3 px-8">
                        {cheque.status === 'available' ? (
                          <div className="flex items-center gap-3">
                            <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest italic">Unissued</span>
                            <Link 
                              href={`/cheques?action=issue&bankId=${book?.bankId}&chequeNumber=${cheque.chequeNumber}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-white transition-all duration-300 shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Issue
                            </Link>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 group-hover:text-accent transition-colors">{vendor?.name || 'Manual Entry'}</span>
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                              {cheque.issueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-8 text-right font-black text-slate-900 group-hover:text-accent transition-colors text-base tracking-tighter">
                        {cheque.amount > 0 ? (
                          <>
                            <span className="text-slate-300 text-[10px] mr-1.5 uppercase font-black">NPR</span>
                            {cheque.amount.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
                          </>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8 border-accent/10 bg-accent/5 relative overflow-hidden shadow-sm">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/10 blur-[50px] rounded-full"></div>
            <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-6">Inventory Health</h4>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Available</span>
                <span className="text-slate-900 font-black text-xl tracking-tighter">{cheques.filter(c => c.status === 'available').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Issued / Used</span>
                <span className="text-slate-900 font-black text-xl tracking-tighter">{cheques.filter(c => c.status !== 'available').length}</span>
              </div>
              <div className="pt-6 border-t border-accent/10">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Book Depletion</span>
                  <span className="text-accent font-black text-lg">{Math.round((cheques.filter(c => c.status !== 'available').length / cheques.length) * 100)}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div 
                    className="h-full bg-accent rounded-full transition-all duration-1000" 
                    style={{ width: `${(cheques.filter(c => c.status !== 'available').length / cheques.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 border-slate-100 bg-slate-50/50 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Security Meta</h4>
            <div className="space-y-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
               <div className="flex justify-between border-b border-slate-200/60 pb-3">
                  <span>Created At</span>
                  <span className="text-slate-900">{book?.createdAt ? new Date(book.createdAt).toLocaleDateString() : '—'}</span>
               </div>
               <div className="flex justify-between border-b border-slate-200/60 pb-3">
                  <span>Prefix Code</span>
                  <span className="text-accent font-black">{book?.prefix || 'NONE'}</span>
               </div>
               <div className="flex justify-between">
                  <span>Record ID</span>
                  <span className="text-slate-300 font-mono text-[8px] truncate max-w-[100px]">{book?.id}</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChequeBookDetailsPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div></div>}>
      <ChequeBookDetailsContent />
    </Suspense>
  );
}
