"use client";

import React, { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { ShieldAlert, Activity, CreditCard, Users, Landmark } from "lucide-react";
import type { AuditLog } from "@/types";
import { storage } from "@/lib/storage";

const getIconForEntity = (entityType: string) => {
  switch (entityType) {
    case 'cheque': return CreditCard;
    case 'vendor': return Users;
    case 'bank': return Landmark;
    default: return Activity;
  }
};

const getColorForAction = (action: string) => {
  if (action.includes('create') || action.includes('add')) return 'bg-emerald-100 text-emerald-600';
  if (action.includes('delete') || action.includes('cancel')) return 'bg-red-100 text-red-600';
  if (action.includes('update') || action.includes('edit')) return 'bg-blue-100 text-blue-600';
  return 'bg-gray-100 text-gray-600';
};

export default function AuditPage() {
  const { activeCompany, syncCounter } = useCompany();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeCompany) return;
    
    setIsLoading(true);
    // Fetch logs from storage
    const allLogs = storage.get<AuditLog>("audit_logs");
    setLogs(allLogs.filter((l: AuditLog) => l.companyId === activeCompany.id));
    setIsLoading(false);
  }, [activeCompany, syncCounter]);

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 italic">
        Please select a company to view the audit log.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Audit Log</h1>
          <p className="text-slate-500 mt-2">System-wide activity and compliance tracking for {activeCompany.name}</p>
        </div>
        <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-sm uppercase text-[10px] tracking-widest active:scale-95">
          <ShieldAlert className="w-4 h-4 text-accent" />
          Export Report
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-32 text-center flex flex-col items-center">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-6 text-slate-300">
              <Activity className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No activity recorded</h3>
            <p className="text-slate-500 max-w-sm mx-auto text-lg italic font-bold">
              All system interactions and data modifications will be logged here for security audits.
            </p>
          </div>
        ) : (
          <div className="relative p-10">
            <div className="absolute top-10 bottom-10 left-[63px] w-px bg-slate-200"></div>
            
            <div className="space-y-12">
              {logs.map((log) => {
                const Icon = getIconForEntity(log.entityType);
                const colorClass = getColorForAction(log.action);
                
                return (
                  <div key={log.id} className="relative flex gap-8 items-start group">
                    <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 shadow-sm transition-transform group-hover:scale-110 bg-white ${colorClass.split(' ')[1]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 font-black tracking-tight">{log.userId}</span>
                          <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">performed</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${colorClass} border border-current/10`}>
                            {log.action.replace('_', ' ')}
                          </span>
                        </div>
                        <time className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                          {new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                      
                      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 transition-all group-hover:border-slate-200 group-hover:bg-slate-50 group-hover:shadow-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entity Type</p>
                            <p className="font-black text-slate-700 capitalize text-sm">{log.entityType}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reference ID</p>
                            <p className="font-mono text-slate-500 text-xs truncate font-bold">{log.entityId}</p>
                          </div>
                        </div>
                        
                        {Object.keys(log.metadata).length > 0 && (
                          <div className="mt-6 pt-6 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(log.metadata).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span className="font-black text-slate-700 text-xs">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
