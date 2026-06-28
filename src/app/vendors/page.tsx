"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCompany } from "@/contexts/CompanyContext";
import { Plus, Users, Search, MoreVertical, Mail, Phone, MapPin, XCircle, BarChart3, Edit2, FileSpreadsheet } from "lucide-react";
import type { Vendor } from "@/types";
import { storage } from "@/lib/storage";
import { useToast } from "@/contexts/ToastContext";

export default function VendorsPage() {
  const { activeCompany } = useCompany();
  const { showToast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");

  const resetForm = () => {
    setName("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
    setEditingVendor(null);
  };

  useEffect(() => {
    if (!activeCompany) return;
    
    const allVendors = storage.get<Vendor>("vendors").map(v => ({
      ...v,
      createdAt: new Date(v.createdAt)
    }));
    const companyVendors = allVendors.filter(v => v.companyId === activeCompany.id);
    setVendors(companyVendors);
    setIsLoading(false);
  }, [activeCompany]);

  const handleEditClick = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setName(vendor.name);
    setContactEmail(vendor.contactEmail || "");
    setContactPhone(vendor.contactPhone || "");
    setAddress(vendor.address || "");
    setIsAddModalOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;

    try {
      if (editingVendor) {
        // Update existing vendor
        storage.update<Vendor>("vendors", editingVendor.id, {
          name,
          contactEmail,
          contactPhone,
          address,
        });
        storage.log(activeCompany.id, "update_vendor", "vendor", editingVendor.id, { name });
        showToast("Vendor profile updated successfully!");
      } else {
        // Create new vendor
        const newVendor: Vendor = {
          id: `vendor_${Date.now()}`,
          companyId: activeCompany.id,
          name,
          contactEmail,
          contactPhone,
          address,
          createdAt: new Date(),
        };

        storage.add<Vendor>("vendors", newVendor);
        storage.log(activeCompany.id, "register_vendor", "vendor", newVendor.id, { name: newVendor.name });
        showToast("Vendor registered successfully!");
      }
      
      const updatedVendors = storage.get<Vendor>("vendors").map(v => ({
        ...v,
        createdAt: new Date(v.createdAt)
      }));
      setVendors(updatedVendors.filter(v => v.companyId === activeCompany.id));

      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving vendor:", error);
      showToast("An error occurred while saving the vendor.", "error");
    }
  };

  const handleBulkImport = async (file: File) => {
    if (!activeCompany) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n');
      const newVendors: Vendor[] = [];
      
      rows.forEach((row, index) => {
        const columns = row.split(',').map(c => c.trim());
        if (columns[0] && columns[0].toLowerCase() !== 'name') {
          newVendors.push({
            id: `vendor_${Date.now()}_${index}`,
            companyId: activeCompany.id,
            name: columns[0],
            contactEmail: columns[1] || "",
            contactPhone: columns[2] || "",
            address: columns[3] || "",
            createdAt: new Date(),
          });
        }
      });

      if (newVendors.length > 0) {
        newVendors.forEach(v => storage.add<Vendor>("vendors", v));
        storage.log(activeCompany.id, "bulk_import_vendors", "vendor", "multiple", { count: newVendors.length });
        
        const updatedVendors = storage.get<Vendor>("vendors").map(v => ({
          ...v,
          createdAt: new Date(v.createdAt)
        }));
        setVendors(updatedVendors.filter(v => v.companyId === activeCompany.id));
        showToast(`Imported ${newVendors.length} vendors successfully!`);
        setIsBulkModalOpen(false);
      }
    };
    reader.readAsText(file);
  };

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Please select a company to view vendors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Vendor Management</h1>
          <p className="text-slate-500 mt-2">Manage vendor details and contact information for {activeCompany.name}</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Vendor
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-80">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
            Total Vendors: {vendors.length}
          </div>
        </div>

        {isLoading ? (
          <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-6 text-slate-300">
              <Users className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No vendors found</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-10 text-lg italic">
              {searchQuery ? "No vendors match your search criteria." : "You haven't added any vendors for this company yet."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-accent font-black uppercase tracking-widest text-sm hover:text-accent/80 transition-all active:scale-95"
              >
                + Register First Vendor
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="py-4 px-8">Vendor Details</th>
                  <th className="py-4 px-8">Contact Info</th>
                  <th className="py-4 px-8">Address</th>
                  <th className="py-4 px-8 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="reactive-row group">
                    <td className="py-3 px-8">
                      <div className="flex items-center gap-5">
                        <div className="bg-purple-50 h-10 w-10 flex items-center justify-center rounded-2xl text-purple-600 font-black shrink-0 border border-purple-100 group-hover:scale-110 transition-transform shadow-sm text-sm">
                          {vendor.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-base tracking-tight">{vendor.name}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Added {vendor.createdAt.toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-8">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 text-sm text-slate-600 font-black tracking-tight">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {vendor.contactEmail}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono font-bold">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {vendor.contactPhone}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-8">
                      <div className="flex items-start gap-3 text-sm text-slate-500 max-w-xs">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate leading-relaxed font-bold" title={vendor.address}>{vendor.address || "No address provided"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-8 text-right">
                      <div className="flex justify-end gap-2">
                        <Link 
                          href={`/vendors/${vendor.id}/analytics`}
                          className="p-2.5 text-slate-400 hover:text-accent hover:bg-accent/5 rounded-xl transition-all"
                          title="View Reports"
                        >
                          <BarChart3 className="w-5 h-5" />
                        </Link>
                        <button 
                          onClick={() => handleEditClick(vendor)}
                          className="p-2.5 text-slate-400 hover:text-accent hover:bg-accent/5 rounded-xl transition-all"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button className="text-slate-400 hover:text-slate-900 p-2.5 rounded-xl hover:bg-slate-100 transition-all">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Vendor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-2xl overflow-hidden shadow-2xl border-white" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editingVendor ? "Update Vendor Profile" : "Register Vendor"}
                </h3>
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-1">Beneficiary Management</p>
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
            <form onSubmit={handleSaveVendor} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Company / Vendor Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input w-full"
                  placeholder="e.g. Stark Industries"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="glass-input w-full"
                    placeholder="billing@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="glass-input w-full"
                    placeholder="98XXXXXXXX"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Full Address (Optional)</label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="glass-input w-full resize-none"
                  placeholder="Building Name, Street, City"
                />
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
                  className="btn-primary px-10"
                >
                  {editingVendor ? "Update Vendor" : "Save Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-xl overflow-hidden shadow-2xl border-white" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Bulk Vendor Import</h3>
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-1">Batch Operations</p>
              </div>
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-8">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">CSV Format Guide</h4>
                <div className="bg-white p-4 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-600">
                  Name, Email, Phone, Address<br/>
                  Stark Industries, tony@stark.com, 98000000, Malibu CA<br/>
                  Wayne Enterprises, bruce@wayne.com, 98111111, Gotham City
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center gap-4 hover:border-accent hover:bg-accent/5 transition-all relative group">
                <div className="p-5 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-400 group-hover:text-accent transition-colors">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-black text-slate-900 tracking-tight">Select CSV File</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Maximum 500 rows per upload</p>
                </div>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBulkImport(file);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
