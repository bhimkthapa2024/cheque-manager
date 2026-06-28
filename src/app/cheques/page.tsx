"use client";

import { useState, useEffect, Suspense } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { Plus, CreditCard, Search, Filter, MoreVertical, CheckCircle2, Clock, XCircle, AlertCircle, Landmark, Users, Trash2 } from "lucide-react";
import type { Cheque, ChequeStatus, Bank, Vendor, ChequeBook } from "@/types";
import { storage } from "@/lib/storage";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import ChequeCanvas from "@/components/ChequeCanvas";
import { useConfirm } from "@/contexts/ConfirmContext";

const statusColors: Record<ChequeStatus, { bg: string, text: string, icon: React.ElementType }> = {
  available: { bg: 'bg-slate-100', text: 'text-slate-500', icon: Clock },
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
  issued: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CreditCard },
  cleared: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  bounced: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
  cancelled: { bg: 'bg-gray-200', text: 'text-gray-500', icon: XCircle },
  void: { bg: 'bg-zinc-100', text: 'text-zinc-600', icon: Trash2 },
};

function ChequesPageContent() {
  const { activeCompany } = useCompany();
  const { showToast } = useToast();
  const { confirm, prompt } = useConfirm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStatus = searchParams.get('status') as ChequeStatus | 'all' || 'all';

  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChequeStatus | 'all'>(initialStatus);

  // Form State
  const [chequeNumber, setChequeNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [bankId, setBankId] = useState("");
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSerials, setAvailableSerials] = useState<string[]>([]);
  const [formatStyle, setFormatStyle] = useState<'nepalese' | 'international'>('nepalese');

  useEffect(() => {
    if (!activeCompany) return;
    
    setIsLoading(true);

    const allCheques = storage.get<Cheque>("cheques").map(c => ({
      ...c,
      chequeDate: new Date(c.chequeDate),
      issueDate: new Date(c.issueDate),
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt)
    }));
    setCheques(allCheques.filter(c => c.companyId === activeCompany.id));

    const allBanks = storage.get<Bank>("banks");
    setBanks(allBanks.filter(b => b.companyId === activeCompany.id));

    const allVendors = storage.get<Vendor>("vendors");
    setVendors(allVendors.filter(v => v.companyId === activeCompany.id));

    setIsLoading(false);
  }, [activeCompany]);

  // Handle query parameters and pre-fill form
  useEffect(() => {
    const status = searchParams.get('status') as ChequeStatus | 'all';
    if (status) setStatusFilter(status);

    const action = searchParams.get('action');
    if (action === 'issue') {
      const qBankId = searchParams.get('bankId');
      const qChequeNumber = searchParams.get('chequeNumber');
      if (qBankId) setBankId(qBankId);
      if (qChequeNumber) setChequeNumber(qChequeNumber);
      setIsAddModalOpen(true);
    }
  }, [searchParams]);

  // Populate available cheque numbers when bank is selected
  useEffect(() => {
    if (bankId && activeCompany) {
      const allBooks = storage.get<ChequeBook>("chequeBooks");
      const activeBook = allBooks.find(b => b.bankId === bankId && b.companyId === activeCompany.id);
      
      if (activeBook) {
        const allCheques = storage.get<Cheque>("cheques");
        // Exclude cheques with status 'available' from existingSerials so they count as available
        const existingSerials = new Set(
          allCheques
            .filter(c => c.bankId === bankId && c.status !== 'available')
            .map(c => c.chequeNumber)
        );

        const start = parseInt(activeBook.startSerial); // Loop from start of book range
        const end = parseInt(activeBook.endSerial);
        const serials: string[] = [];
        
        // Show next 20 available serials, skipping those already in the system
        for (let i = start; i <= end; i++) {
          const serialStr = i.toString().padStart(activeBook.startSerial.length, '0');
          const fullSerial = `${activeBook.prefix || ''}${serialStr}`;
          
          if (!existingSerials.has(fullSerial)) {
            serials.push(fullSerial);
          }
          
          if (serials.length >= 20) break;
        }

        // If the query parameter specifies a chequeNumber, ensure it is in the options list if valid
        const qChequeNumber = searchParams.get('chequeNumber');
        if (
          qChequeNumber &&
          qChequeNumber !== chequeNumber &&
          !serials.includes(qChequeNumber) &&
          !existingSerials.has(qChequeNumber)
        ) {
          serials.unshift(qChequeNumber);
        }
        
        setAvailableSerials(serials);

        // Pre-fill query cheque number if valid, otherwise fallback
        if (qChequeNumber && !existingSerials.has(qChequeNumber)) {
          setChequeNumber(qChequeNumber);
        } else if (serials.length > 0 && !serials.includes(chequeNumber)) {
          setChequeNumber(serials[0]);
        }
      } else {
        setAvailableSerials([]);
        setChequeNumber("");
      }
    } else {
      setAvailableSerials([]);
      setChequeNumber("");
    }
  }, [bankId, activeCompany, searchParams]);

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (params.get('action') === 'issue') {
      params.delete('action');
      params.delete('bankId');
      params.delete('chequeNumber');
      const newQuery = params.toString();
      router.replace(newQuery ? `/cheques?${newQuery}` : `/cheques`);
    }
  };

  const handleAddCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;

    const confirmed = await confirm(
      `Are you sure you want to issue cheque #${chequeNumber} for NPR ${parseFloat(amount).toLocaleString()}? This will deduct the serial from the bank book and record the liability.`,
      { title: "Issue Cheque Confirmation", confirmText: "Issue Cheque", type: "warning" }
    );
    if (!confirmed) return;

    try {
      const newCheque: Cheque = {
        id: `chq_${Date.now()}`,
        companyId: activeCompany.id,
        bankId,
        vendorId,
        amount: parseFloat(amount),
        chequeNumber,
        chequeDate: new Date(chequeDate),
        issueDate: new Date(issueDate),
        status: 'issued',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      storage.add<Cheque>("cheques", newCheque);
      storage.log(activeCompany.id, "issue_cheque", "cheque", newCheque.id, { chequeNumber: newCheque.chequeNumber, amount: newCheque.amount });

      // Update Cheque Book currentSerial
      const allBooks = storage.get<ChequeBook>("chequeBooks");
      const activeBook = allBooks.find(b => b.bankId === bankId && b.companyId === activeCompany.id);
      
      if (activeBook) {
        const currentVal = parseInt(activeBook.currentSerial);
        const endVal = parseInt(activeBook.endSerial);
        
        if (currentVal < endVal) {
          const nextSerial = (currentVal + 1).toString().padStart(activeBook.startSerial.length, '0');
          storage.update<ChequeBook>("chequeBooks", activeBook.id, { currentSerial: nextSerial });
        }
      }
      
      // Refresh list with proper date parsing
      const updatedCheques = storage.get<Cheque>("cheques").map(c => ({
        ...c,
        chequeDate: new Date(c.chequeDate),
        issueDate: new Date(c.issueDate),
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt)
      }));
      setCheques(updatedCheques.filter(c => c.companyId === activeCompany.id));

      handleCloseModal();
      showToast("Cheque issued successfully!");
      
      // Reset
      setChequeNumber("");
      setAmount("");
      setVendorId("");
      setBankId("");
      setIssueDate("");
    } catch (error) {
      console.error("Error adding cheque:", error);
      showToast("Failed to issue cheque. Please check details.", "error");
    }
  };

  const handleStatusUpdate = async (chequeId: string, newStatus: ChequeStatus) => {
    if (!activeCompany) return;

    try {
      const cheque = cheques.find(c => c.id === chequeId);
      if (!cheque) return;

      let reason = "";
      if (newStatus === 'cleared') {
        const confirmed = await confirm(
          `Confirm settlement for cheque #${cheque.chequeNumber}? This will mark the transaction as finalized.`,
          {
            title: "Settle Cheque",
            type: "success",
            confirmText: "Settle",
          }
        );
        if (!confirmed) return;
      } else {
        const promptMessage = newStatus === 'void'
          ? `Are you sure you want to VOID cheque #${cheque.chequeNumber}? This leaf will be permanently invalidated. Please enter the reason for voiding:`
          : `Mark cheque #${cheque.chequeNumber} as BOUNCED? This will record a risk event for this vendor in the system. Please enter the reason for bouncing:`;

        const userInput = await prompt(promptMessage, {
          title: newStatus === 'void' ? "Void Cheque" : "Bounce Cheque",
          placeholder: newStatus === 'void' ? "Void reason (mandatory)..." : "Bounce reason (mandatory)...",
          required: true,
        });
        if (userInput === null) return; // User cancelled
        reason = userInput;
      }

      storage.update<Cheque>("cheques", chequeId, { 
        status: newStatus,
        notes: reason ? (cheque.notes ? `${cheque.notes}\nReason: ${reason}` : `Reason: ${reason}`) : cheque.notes,
        updatedAt: new Date()
      });

      storage.log(activeCompany.id, `mark_cheque_${newStatus}`, "cheque", chequeId, { 
        chequeNumber: cheque.chequeNumber,
        amount: cheque.amount,
        reason: reason
      });

      // Refresh data
      const updatedCheques = storage.get<Cheque>("cheques").map(c => ({
        ...c,
        chequeDate: new Date(c.chequeDate),
        issueDate: new Date(c.issueDate),
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt)
      }));
      setCheques(updatedCheques.filter(c => c.companyId === activeCompany.id));

      showToast(`Cheque marked as ${newStatus} successfully!`);
    } catch (error) {
      console.error("Error updating cheque status:", error);
      showToast("Failed to update status.", "error");
    }
  };

  const filteredCheques = cheques.filter(c => {
    const matchesSearch = c.chequeNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Please select a company to view cheques.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Cheque Lifecycle</h1>
          <p className="text-slate-500 mt-2">Track and manage issued cheques for {activeCompany.name}</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Issue Cheque
        </button>
      </div>

      <div className="glass-card overflow-hidden flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center gap-6 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search cheque number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="cleared">Cleared</option>
              <option value="bounced">Bounced</option>
              <option value="cancelled">Cancelled</option>
              <option value="void">Void</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
          </div>
        ) : filteredCheques.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-6 text-slate-300">
              <CreditCard className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No cheques found</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-10 text-lg italic">
              {searchQuery || statusFilter !== 'all' 
                ? "No cheques match your filters." 
                : "You haven't issued any cheques yet for this company."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="py-4 px-8">Serial Reference</th>
                  <th className="py-4 px-8">Timeline</th>
                  <th className="py-4 px-8">Settlement (NPR)</th>
                  <th className="py-4 px-8">Status</th>
                  <th className="py-4 px-8 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCheques.map((cheque) => {
                  const StatusIcon = statusColors[cheque.status].icon;
                  const bank = banks.find(b => b.id === cheque.bankId);
                  
                  return (
                    <tr key={cheque.id} className="reactive-row group">
                      <td className="py-3 px-8">
                        <div className="flex items-center gap-5">
                          <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600 border border-emerald-100 group-hover:scale-105 transition-transform shadow-sm">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-mono font-black text-slate-900 text-base tracking-tighter">{cheque.chequeNumber}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{bank?.bankName || 'Unknown Bank'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-8">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest w-14">Leaf:</span>
                            <span className="text-xs font-bold text-slate-700">
                              {cheque.chequeDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest w-14">Issued:</span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {cheque.issueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-8">
                        <p className="font-black text-slate-900 text-lg tracking-tighter">
                          {cheque.amount.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="py-3 px-8">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${statusColors[cheque.status].bg} ${statusColors[cheque.status].text} border-transparent`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {cheque.status}
                        </span>
                      </td>
                      <td className="py-4 px-8 text-right">
                      <div className="flex justify-end gap-2">
                        {cheque.status === 'issued' && (
                          <>
                            <button 
                              onClick={() => handleStatusUpdate(cheque.id, 'cleared')}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all border border-emerald-100"
                              title="Mark as Cleared"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleStatusUpdate(cheque.id, 'bounced')}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all border border-red-100"
                              title="Mark as Bounced"
                            >
                              <AlertCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleStatusUpdate(cheque.id, 'void')}
                              className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-slate-100"
                              title="Mark as Void"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-all">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Cheque Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-4xl overflow-hidden shadow-2xl border-white" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Issue New Cheque</h3>
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-1">Lifecycle Transaction</p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddCheque} className="p-8 space-y-8">
              {banks.length === 0 || vendors.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-600">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-bold leading-tight uppercase tracking-tight">
                    You need to register at least one bank and one vendor before issuing cheques.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6 space-y-4">
                    <ChequeCanvas
                      bankName={banks.find(b => b.id === bankId)?.bankName}
                      accountNumber={banks.find(b => b.id === bankId)?.accountNumber}
                      chequeNumber={chequeNumber}
                      vendorName={vendors.find(v => v.id === vendorId)?.name}
                      amount={parseFloat(amount) || 0}
                      chequeDate={chequeDate}
                      formatStyle={formatStyle}
                      companyName={activeCompany?.name}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setFormatStyle(formatStyle === 'nepalese' ? 'international' : 'nepalese')}
                        className="text-xs font-black text-accent uppercase tracking-widest hover:text-accent/80 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        Wording Style: {formatStyle === 'nepalese' ? 'South Asian (Lakh/Crore)' : 'International (Million)'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Debit from Bank</label>
                      <div className="relative">
                        <select
                          required
                          value={bankId}
                          onChange={(e) => setBankId(e.target.value)}
                          className="glass-input w-full appearance-none cursor-pointer"
                        >
                          <option value="">Select source bank...</option>
                          {banks.map(b => (
                            <option key={b.id} value={b.id}>{b.bankName} ({b.accountNumber})</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Landmark className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Cheque Number</label>
                      {availableSerials.length > 0 ? (
                        <div className="relative">
                          <select
                            required
                            value={chequeNumber}
                            onChange={(e) => setChequeNumber(e.target.value)}
                            className="glass-input w-full appearance-none cursor-pointer font-mono"
                          >
                            {availableSerials.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <CreditCard className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      ) : (
                        <input
                          required
                          type="text"
                          value={chequeNumber}
                          onChange={(e) => setChequeNumber(e.target.value)}
                          className="glass-input w-full font-mono placeholder:text-slate-300"
                          placeholder={bankId ? "No book found - type manually" : "Select bank first"}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Payable to Vendor</label>
                      <div className="relative">
                        <select
                          required
                          value={vendorId}
                          onChange={(e) => setVendorId(e.target.value)}
                          className="glass-input w-full appearance-none cursor-pointer"
                        >
                          <option value="">Select recipient...</option>
                          {vendors.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Users className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-8 pt-4">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Settlement Amount (NPR)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="glass-input w-full placeholder:text-slate-300 font-black text-lg text-accent"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Cheque Date</label>
                      <input
                        required
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        className="glass-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Issue Date</label>
                      <input
                        required
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="glass-input w-full"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-6 flex justify-end gap-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={banks.length === 0 || vendors.length === 0}
                  className="btn-primary px-10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Issue Cheque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChequesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compiling Integrity...</p>
        </div>
      </div>
    }>
      <ChequesPageContent />
    </Suspense>
  );
}
