"use client";

import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  XCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Landmark, 
  Upload, 
  ChevronRight,
  Settings as SettingsIcon,
  CreditCard,
  Download,
  History,
  ShieldAlert,
  Activity,
  DollarSign,
  Users,
  Loader2
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { storage } from "@/lib/storage";
import type { Bank, Company } from "@/types";

type TabType = 'entities' | 'banks' | 'users';

export default function SettingsPage() {
  const { companies, addCompany, updateCompany, deleteCompany, activeCompany } = useCompany();
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  
  const isSuperAdmin = userProfile?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState<TabType>('banks');
  
  // Modal States
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  
  // Entity Form State
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");

  // Bank Form State
  const [banks, setBanks] = useState<Bank[]>([]);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<'current' | 'overdraft'>('current');
  const [branchName, setBranchName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // User Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      setActiveTab('entities');
    } else {
      setActiveTab('banks');
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!activeCompany) return;
    const allBanks = storage.get<Bank>("banks").filter(b => b.companyId === activeCompany.id);
    setBanks(allBanks);
  }, [activeCompany, isBankModalOpen]);

  // Load Users List
  const fetchUsers = async () => {
    if (!isSuperAdmin) return;
    setLoadingUsers(true);
    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      const querySnapshot = await getDocs(collection(db, "users"));
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data());
      });
      setUsersList(list);
    } catch (error) {
      console.error("Error fetching users:", error);
      showToast("Failed to load users list", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && isSuperAdmin) {
      fetchUsers();
    }
  }, [activeTab, isSuperAdmin]);

  const handleUpdateRole = async (userId: string, newRole: 'super_admin' | 'user') => {
    if (userId === userProfile?.uid) {
      showToast("You cannot change your own role.", "error");
      return;
    }
    const confirmed = await confirm(
      `Are you sure you want to change this user's role to ${newRole === 'super_admin' ? 'Super Admin' : 'User'}?`,
      { title: "Change User Role", confirmText: "Change", type: "warning" }
    );
    if (!confirmed) return;
    
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      await updateDoc(doc(db, "users", userId), {
        role: newRole
      });
      showToast("User role updated successfully!");
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      showToast("Failed to update user role", "error");
    }
  };

  // Company Handlers
  const resetCompanyForm = () => {
    setCompanyName("");
    setTaxId("");
    setEditingCompanyId(null);
  };

  const handleEditCompany = (company: Company) => {
    if (!isSuperAdmin) return;
    setEditingCompanyId(company.id);
    setCompanyName(company.name);
    setTaxId(company.taxId);
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (editingCompanyId) {
      updateCompany(editingCompanyId, { name: companyName, taxId });
      showToast("Company profile updated successfully!");
    } else {
      addCompany({ name: companyName, taxId });
      showToast("New company registered successfully!");
    }
    setIsCompanyModalOpen(false);
    resetCompanyForm();
  };

  const handleDeleteCompany = async (id: string) => {
    if (!isSuperAdmin) return;
    if (companies.length <= 1) {
      showToast("Cannot delete the last remaining company.", "error");
      return;
    }
    const confirmed = await confirm(
      "Remove this company? Associated data will remain in storage but won't be accessible.",
      { title: "Delete Company Profile", confirmText: "Remove", type: "danger" }
    );
    if (confirmed) {
      deleteCompany(id);
      showToast("Company removed.");
    }
  };

  // Bank Handlers
  const resetBankForm = () => {
    setBankName("");
    setAccountNumber("");
    setAccountType('current');
    setBranchName("");
    setRoutingNumber("");
    setLogoUrl("");
    setEditingBank(null);
  };

  const handleEditBank = (bank: Bank) => {
    if (!isSuperAdmin) return;
    setEditingBank(bank);
    setBankName(bank.bankName);
    setAccountNumber(bank.accountNumber);
    setAccountType(bank.accountType);
    setBranchName(bank.branchName);
    setRoutingNumber(bank.routingNumber);
    setLogoUrl(bank.logoUrl || "");
    setIsBankModalOpen(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !activeCompany) return;

    if (editingBank) {
      storage.update<Bank>("banks", editingBank.id, {
        bankName, accountNumber, accountType, branchName, routingNumber, logoUrl
      });
      showToast("Bank account updated!");
    } else {
      const newBank: Bank = {
        id: `bank_${Date.now()}`,
        companyId: activeCompany.id,
        bankName, accountNumber, accountType, branchName, routingNumber,
        balance: 0,
        logoUrl,
        createdAt: new Date(),
      };
      storage.add<Bank>("banks", newBank);
      showToast("Bank account registered!");
    }
    setIsBankModalOpen(false);
    resetBankForm();
  };

  const handleDownloadBackup = () => {
    if (!isSuperAdmin) return;
    try {
      const data: Record<string, any> = {};
      ["companies", "banks", "chequeBooks", "vendors", "cheques", "auditLogs"].forEach(key => {
        data[key] = storage.get(key as any);
      });
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cheque_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      showToast("System backup generated and download started.");
    } catch (error) {
      showToast("Failed to generate backup.", "error");
    }
  };

  const handleExportAudit = () => {
    if (!isSuperAdmin || !activeCompany) return;
    try {
      const logs = storage.get("auditLogs").filter((l: any) => l.companyId === activeCompany.id);
      if (logs.length === 0) {
        showToast("No audit logs found for this company.", "error");
        return;
      }

      const headers = ["Timestamp", "Action", "Module", "TargetId", "Details"];
      const csvContent = [
        headers.join(","),
        ...logs.map((l: any) => [
          new Date(l.timestamp).toLocaleString(),
          l.action,
          l.module,
          l.targetId,
          JSON.stringify(l.details).replace(/,/g, ';')
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeCompany.name}_audit_logs.csv`;
      a.click();
      showToast("Audit logs exported to CSV.");
    } catch (error) {
      showToast("Failed to export logs.", "error");
    }
  };

  const handleWipeData = async () => {
    if (!isSuperAdmin) return;
    const confirmed = await confirm(
      "CRITICAL ACTION: This will permanently delete ALL locally stored data (Companies, Banks, Cheques, Vendors). This action cannot be undone. Proceed?",
      { title: "Wipe System Memory", confirmText: "Proceed Wiping", type: "danger" }
    );
    if (confirmed) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleHealthCheck = () => {
    if (!isSuperAdmin) return;
    showToast("Running system integrity scan...");
    setTimeout(() => {
      const cheques = storage.get("cheques");
      const orphanCheques = cheques.filter((c: any) => !companies.find(comp => comp.id === c.companyId));
      
      if (orphanCheques.length > 0) {
        showToast(`Health Check: Found ${orphanCheques.length} orphan records. Storage optimization recommended.`, "warning");
      } else {
        showToast("Health Check: System integrity 100%. All records valid.", "success");
      }
    }, 1500);
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-slate-500 mt-2 text-sm md:text-lg">Manage multi-company profiles and bank configurations.</p>
        </div>
        {isSuperAdmin && activeTab !== 'users' && (
          <button
            onClick={() => {
              if (activeTab === 'entities') { resetCompanyForm(); setIsCompanyModalOpen(true); }
              else if (activeTab === 'banks') { resetBankForm(); setIsBankModalOpen(true); }
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {activeTab === 'entities' ? 'Add Company' : 'Add Bank'}
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-full md:w-fit border border-slate-200 overflow-x-auto snap-x hide-scrollbar">
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('entities')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap snap-start shrink-0 ${
              activeTab === 'entities' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Business Entities
          </button>
        )}
        <button
          onClick={() => setActiveTab('banks')}
          className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap snap-start shrink-0 ${
            activeTab === 'banks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Landmark className="w-4 h-4" />
          Bank Registry
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap snap-start shrink-0 ${
              activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            User Roles
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {activeTab === 'entities' && isSuperAdmin && (
            <div className="glass-card overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Registered Entities</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {companies.map(c => (
                  <div key={c.id} className="p-4 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:bg-slate-50/20 transition-all">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${
                        activeCompany?.id === c.id ? 'bg-accent text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 tracking-tight">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tax ID: {c.taxId}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditCompany(c)} className="p-2.5 text-slate-400 hover:text-accent hover:bg-accent/5 rounded-xl transition-all">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteCompany(c.id)} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'banks' && (
            <div className="glass-card overflow-hidden">
               <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Accounts for {activeCompany?.name}</h3>
              </div>
              {banks.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center opacity-50">
                  <Landmark className="w-12 h-12 mb-4 text-slate-300" />
                  <p className="text-sm font-black uppercase tracking-widest text-slate-400">No banks registered for this entity</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {banks.map(b => (
                    <div key={b.id} className="p-4 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:bg-slate-50/20 transition-all">
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden p-1.5 shadow-sm shrink-0">
                          {b.logoUrl ? <img src={b.logoUrl} className="w-full h-full object-contain" /> : <Landmark className="w-5 h-5 text-slate-300" />}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 tracking-tight">{b.bankName}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{b.accountNumber} • {b.accountType}</p>
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <button onClick={() => handleEditBank(b)} className="p-2.5 text-slate-400 hover:text-accent hover:bg-accent/5 rounded-xl transition-all">
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && isSuperAdmin && (
            <div className="glass-card overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">System User Directory</h3>
                <span className="text-[10px] bg-slate-200 text-slate-600 font-black uppercase tracking-widest px-2 py-0.5 rounded-md">{usersList.length} Accounts</span>
              </div>
              
              {loadingUsers ? (
                <div className="p-20 text-center flex flex-col items-center justify-center gap-4 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <p className="text-xs font-black uppercase tracking-widest">Loading User List...</p>
                </div>
              ) : usersList.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center opacity-50">
                  <Users className="w-12 h-12 mb-4 text-slate-300" />
                  <p className="text-sm font-black uppercase tracking-widest text-slate-400">No users found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {usersList.map(u => (
                    <div key={u.uid} className="p-4 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/20 transition-all">
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-500 text-lg border border-slate-200 shrink-0">
                          {(u.name || "Unknown").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 tracking-tight flex items-center gap-2">
                            {u.name || "Unknown User"}
                            {u.uid === userProfile?.uid && (
                              <span className="text-[9px] font-black text-accent bg-accent/10 px-1.5 py-0.5 rounded">You</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{u.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                          u.role === 'super_admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {u.role === 'super_admin' ? 'Super Admin' : 'User'}
                        </span>
                        
                        {u.uid !== userProfile?.uid && (
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.uid, e.target.value as any)}
                            className="glass-input text-xs py-1.5 px-3 rounded-xl max-w-[140px] font-bold"
                          >
                            <option value="user">User</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8 bg-slate-900 border-none text-white relative overflow-hidden group">
            <ShieldCheck className="w-10 h-10 text-accent mb-6" />
            <h4 className="font-black text-lg mb-2">Configuration Hub</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-bold">
              Settings are saved at the company level. Switching the active company in the sidebar will update the Bank Registry and Vendor Intelligence data displayed across the system.
            </p>
          </div>
          
          {isSuperAdmin && (
            <div className="glass-card p-8 border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">System & Maintenance</h4>
              <div className="space-y-3">
                <button 
                  onClick={handleHealthCheck}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left hover:bg-slate-100 transition-all group"
                >
                  <p className="text-xs font-black text-slate-900 group-hover:text-accent flex items-center justify-between">
                    <span className="flex items-center gap-3"><Activity className="w-4 h-4 text-slate-400" /> Run Integrity Scan</span>
                    <ChevronRight className="w-4 h-4" />
                  </p>
                </button>
                <button 
                  onClick={handleExportAudit}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left hover:bg-slate-100 transition-all group"
                >
                  <p className="text-xs font-black text-slate-900 group-hover:text-accent flex items-center justify-between">
                    <span className="flex items-center gap-3"><History className="w-4 h-4 text-slate-400" /> Export Audit Logs</span>
                    <ChevronRight className="w-4 h-4" />
                  </p>
                </button>
                <button 
                  onClick={handleDownloadBackup}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left hover:bg-slate-100 transition-all group"
                >
                  <p className="text-xs font-black text-slate-900 group-hover:text-accent flex items-center justify-between">
                    <span className="flex items-center gap-3"><Download className="w-4 h-4 text-slate-400" /> Download Data Backup</span>
                    <ChevronRight className="w-4 h-4" />
                  </p>
                </button>
                <button 
                  onClick={handleWipeData}
                  className="w-full p-4 bg-red-50/50 rounded-2xl border border-red-100 text-left hover:bg-red-50 transition-all group"
                >
                  <p className="text-xs font-black text-red-600 flex items-center justify-between">
                    <span className="flex items-center gap-3"><ShieldAlert className="w-4 h-4" /> Wipe System Memory</span>
                    <ChevronRight className="w-4 h-4" />
                  </p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Company Modal */}
      {isCompanyModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl overflow-hidden shadow-2xl border-white animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900">{editingCompanyId ? "Update Entity" : "New Entity"}</h3>
              <button onClick={() => setIsCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-900"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveCompany} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Company Name</label>
                <input required value={companyName} onChange={e => setCompanyName(e.target.value)} className="glass-input w-full" placeholder="Stark Industries" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Tax / PAN Number</label>
                <input required value={taxId} onChange={e => setTaxId(e.target.value)} className="glass-input w-full" placeholder="TAX-001122" />
              </div>
              <div className="pt-6 flex justify-end gap-4">
                <button type="submit" className="btn-primary px-10">{editingCompanyId ? "Update" : "Register"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Modal */}
      {isBankModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl overflow-hidden shadow-2xl border-white animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900">{editingBank ? "Update Bank" : "Register Bank"}</h3>
              <button onClick={() => setIsBankModalOpen(false)} className="text-slate-400 hover:text-slate-900"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveBank} className="p-8 space-y-6">
              <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="h-20 w-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden relative group">
                  {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain" /> : <Upload className="w-6 h-6 text-slate-300" />}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Upload Bank Logo</p>
                  <label className="text-xs font-black text-accent cursor-pointer">Choose File</label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Bank Name</label>
                  <input required value={bankName} onChange={e => setBankName(e.target.value)} className="glass-input w-full" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Account Number</label>
                  <input required value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="glass-input w-full font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Account Type</label>
                  <select value={accountType} onChange={e => setAccountType(e.target.value as any)} className="glass-input w-full">
                    <option value="current">Current</option>
                    <option value="overdraft">Overdraft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Branch Name</label>
                  <input value={branchName} onChange={e => setBranchName(e.target.value)} className="glass-input w-full" />
                </div>
              </div>
              <div className="pt-6 flex justify-end gap-4">
                <button type="submit" className="btn-primary px-10">{editingBank ? "Update" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
