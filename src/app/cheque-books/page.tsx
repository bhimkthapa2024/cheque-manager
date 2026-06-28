"use client";

import Link from 'next/link';
import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { Plus, Book, MoreVertical, XCircle, ChevronRight } from "lucide-react";
import type { ChequeBook, Bank } from "@/types";
import { storage } from "@/lib/storage";
import { useToast } from "@/contexts/ToastContext";

export default function ChequeBooksPage() {
  const { activeCompany } = useCompany();
  const { showToast } = useToast();
  const [chequeBooks, setChequeBooks] = useState<ChequeBook[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [bankId, setBankId] = useState("");
  const [startSerial, setStartSerial] = useState("");
  const [endSerial, setEndSerial] = useState("");
  const [prefix, setPrefix] = useState("");

  useEffect(() => {
    if (!activeCompany) return;
    
    setIsLoading(true);

    const allBooks = storage.get<ChequeBook>("chequeBooks");
    setChequeBooks(allBooks.filter(b => b.companyId === activeCompany.id));

    const allBanks = storage.get<Bank>("banks");
    setBanks(allBanks.filter(b => b.companyId === activeCompany.id));

    setIsLoading(false);
  }, [activeCompany]);

  const handleRegisterBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;

    try {
      const newBook: ChequeBook = {
        id: `cb_${Date.now()}`,
        bankId,
        companyId: activeCompany.id,
        startSerial,
        endSerial,
        currentSerial: startSerial,
        prefix,
        createdAt: new Date(),
      };

      storage.add<ChequeBook>("chequeBooks", newBook);
      storage.log(activeCompany.id, "register_cheque_book", "cheque_book", newBook.id, { 
        range: `${startSerial}-${endSerial}`,
        prefix 
      });
      
      const allBooks = storage.get<ChequeBook>("chequeBooks");
      setChequeBooks(allBooks.filter(b => b.companyId === activeCompany.id));

      showToast("Cheque book registered successfully!");
      setIsAddModalOpen(false);
      setBankId("");
      setStartSerial("");
      setEndSerial("");
      setPrefix("");
    } catch (error) {
      console.error("Error registering book:", error);
      showToast("Failed to register cheque book.", "error");
    }
  };

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Please select a company to manage cheque books.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Cheque Book Registry
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Register and track cheque serial ranges issued by banks.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Register Book
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-slate-100 rounded-3xl animate-pulse border border-slate-200" />
          ))
        ) : chequeBooks.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border border-slate-200">
            <Book className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900 mb-2">No cheque books registered</h3>
            <p className="text-slate-500 mb-8">Register a range of cheque numbers provided by your bank.</p>
            <button onClick={() => setIsAddModalOpen(true)} className="text-accent font-black hover:text-accent/80 uppercase tracking-widest text-sm transition-all">
              + Register your first book
            </button>
          </div>
        ) : (
          chequeBooks.map(book => {
            const bank = banks.find(b => b.id === book.bankId);
            const total = parseInt(book.endSerial) - parseInt(book.startSerial) + 1;
            const used = parseInt(book.currentSerial) - parseInt(book.startSerial);
            const progress = (used / total) * 100;

            return (
              <Link key={book.id} href={`/cheque-books/details?id=${book.id}`} className="block group">
                <div className="glass-card p-8 group-hover:shadow-lg group-hover:-translate-y-1 transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-accent/5 p-4 rounded-2xl text-accent border border-accent/10 group-hover:bg-accent/10 transition-all group-hover:scale-105">
                      <Book className="w-7 h-7" />
                    </div>
                    <button className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-50 transition-all" onClick={(e) => e.preventDefault()}>
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-1 mb-6">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {book.prefix ? `${book.prefix} ` : ''}{book.startSerial} - {book.endSerial}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{bank?.bankName || 'Unknown Bank'}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Inventory Status</span>
                      <span className="text-accent">{used} / {total} used</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden p-[1px] border border-slate-200">
                      <div 
                        className="h-full bg-accent rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Next Leaf</span>
                      <span className="text-slate-900 font-mono font-black">{book.prefix}{book.currentSerial}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg group-hover:bg-accent group-hover:text-white transition-all text-slate-400">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-2xl overflow-hidden shadow-2xl border-white" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Register Cheque Book</h3>
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-1">Inventory Setup</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleRegisterBook} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Select Bank</label>
                <div className="relative">
                  <select
                    required
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="glass-input w-full appearance-none cursor-pointer"
                  >
                    <option value="">Choose a bank...</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} ({b.accountNumber})</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Plus className="w-4 h-4 text-slate-400 rotate-45" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Prefix</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="glass-input w-full"
                    placeholder="e.g. CHQ"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Start Serial</label>
                  <input
                    required
                    type="text"
                    value={startSerial}
                    onChange={(e) => setStartSerial(e.target.value)}
                    className="glass-input w-full font-mono"
                    placeholder="10001"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">End Serial</label>
                  <input
                    required
                    type="text"
                    value={endSerial}
                    onChange={(e) => setEndSerial(e.target.value)}
                    className="glass-input w-full font-mono"
                    placeholder="10050"
                  />
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-8"
                >
                  Register Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
