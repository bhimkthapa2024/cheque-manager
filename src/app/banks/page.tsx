"use client";

import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { Plus, Landmark, MoreVertical, XCircle, Upload, Image as ImageIcon, Edit2 } from "lucide-react";
import type { Bank } from "@/types";
import { storage } from "@/lib/storage";
import { useToast } from "@/contexts/ToastContext";

export default function BanksPage() {
  const { activeCompany, syncCounter } = useCompany();
  const { showToast } = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<'current' | 'overdraft'>('current');
  const [branchName, setBranchName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const resetForm = () => {
    setBankName("");
    setAccountNumber("");
    setAccountType('current');
    setBranchName("");
    setRoutingNumber("");
    setLogoUrl("");
    setEditingBank(null);
  };

  useEffect(() => {
    if (!activeCompany) return;
    
    setIsLoading(true);
    // Load from local storage
    const allBanks = storage.get<Bank>("banks").map(b => ({
      ...b,
      createdAt: new Date(b.createdAt)
    }));
    const companyBanks = allBanks.filter(b => b.companyId === activeCompany.id);
    setBanks(companyBanks);
    setIsLoading(false);
  }, [activeCompany, syncCounter]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditClick = (bank: Bank) => {
    setEditingBank(bank);
    setBankName(bank.bankName);
    setAccountNumber(bank.accountNumber);
    setAccountType(bank.accountType);
    setBranchName(bank.branchName);
    setRoutingNumber(bank.routingNumber);
    setLogoUrl(bank.logoUrl || "");
    setIsAddModalOpen(true);
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;

    try {
      if (editingBank) {
        // Update existing bank
        storage.update<Bank>("banks", editingBank.id, {
          bankName,
          accountNumber,
          accountType,
          branchName,
          routingNumber,
          logoUrl,
        });
        storage.log(activeCompany.id, "update_bank", "bank", editingBank.id, { bankName });
        showToast("Bank account updated successfully!");
      } else {
        // Create new bank
        const newBank: Bank = {
          id: `bank_${Date.now()}`,
          companyId: activeCompany.id,
          bankName,
          accountNumber,
          accountType,
          branchName,
          routingNumber,
          balance: 0,
          logoUrl,
          createdAt: new Date(),
        };

        storage.add<Bank>("banks", newBank);
        storage.log(activeCompany.id, "register_bank", "bank", newBank.id, { bankName: newBank.bankName, accountType: newBank.accountType });
        showToast("Bank account registered successfully!");
      }
      
      // Refresh list
      const updatedBanks = storage.get<Bank>("banks").map(b => ({
        ...b,
        createdAt: new Date(b.createdAt)
      }));
      setBanks(updatedBanks.filter(b => b.companyId === activeCompany.id));

      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving bank:", error);
      showToast("An error occurred while saving the bank account.", "error");
    }
  };

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500 text-lg font-medium">Please select a company to view banks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Bank Registry</h1>
          <p className="text-slate-500 mt-2">Manage bank accounts for {activeCompany.name}</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Bank
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
          </div>
        ) : banks.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center">
            <div className="bg-slate-50 p-6 rounded-[2rem] mb-6 border border-slate-100 text-slate-400">
              <Landmark className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No banks registered</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-10 text-lg">
              Add your first corporate bank account to start managing cheques and tracking balances.
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="text-accent font-black uppercase tracking-widest text-sm hover:text-accent/80 transition-all active:scale-95"
            >
              + Register New Bank
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="py-4 px-8">Bank Details</th>
                  <th className="py-4 px-8">Account Number</th>
                  <th className="py-4 px-8 text-right">Balance</th>
                  <th className="py-4 px-8 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {banks.map((bank) => (
                  <tr key={bank.id} className="reactive-row group">
                    <td className="py-3 px-8">
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl overflow-hidden border border-slate-100 bg-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                          {bank.logoUrl ? (
                            <img src={bank.logoUrl} alt={bank.bankName} className="w-full h-full object-contain p-1" />
                          ) : (
                            <Landmark className="w-5 h-5 text-accent" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-slate-900 text-base tracking-tight">{bank.bankName}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider ${bank.accountType === 'overdraft' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-accent/5 text-accent border border-accent/10'}`}>
                              {bank.accountType}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-black tracking-widest">{bank.branchName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-8 text-slate-500 font-mono text-sm tracking-tighter">{bank.accountNumber}</td>
                    <td className="py-3 px-8 text-right font-black text-slate-900 text-lg tracking-tighter">
                      NPR {bank.balance.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-8 text-right">
                      <button 
                        onClick={() => handleEditClick(bank)}
                        className="text-slate-400 hover:text-accent p-2 rounded-xl hover:bg-accent/5 transition-all group/edit"
                      >
                        <Edit2 className="w-5 h-5 group-hover/edit:scale-110" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-2xl overflow-hidden shadow-2xl border-white" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editingBank ? "Update Bank Profile" : "Register Bank Account"}
                </h3>
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-1">Corporate Treasury Setup</p>
              </div>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveBank} className="p-8 space-y-6">
              <div className="flex items-center gap-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="h-24 w-24 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 relative overflow-hidden group">
                  {logoUrl ? (
                    <img src={logoUrl} className="w-full h-full object-contain p-2" alt="Preview" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mb-2 group-hover:text-accent transition-colors" />
                      <span className="text-[10px] font-black uppercase">Logo</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-900 mb-1">Bank Branding</h4>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-4">Upload official logo (JPEG/PNG)</p>
                  <label className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-black text-slate-600 cursor-pointer hover:bg-slate-100 transition-all">
                    Choose File
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Bank Name</label>
                <input
                  required
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="glass-input w-full"
                  placeholder="e.g. Nepal Investment Bank"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Account Number</label>
                  <input
                    required
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="glass-input w-full font-mono"
                    placeholder="001002003004"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Routing Number</label>
                  <input
                    required
                    type="text"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    className="glass-input w-full font-mono"
                    placeholder="122000248"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="glass-input w-full appearance-none cursor-pointer"
                  >
                    <option value="current">Current Account</option>
                    <option value="overdraft">Overdraft (OD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Branch Name</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="glass-input w-full"
                    placeholder="e.g. Kathmandu Main"
                  />
                </div>
              </div>
              <div className="pt-6 flex justify-end gap-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-8"
                >
                  {editingBank ? "Update Account" : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
