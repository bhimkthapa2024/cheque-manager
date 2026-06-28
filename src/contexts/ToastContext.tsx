"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString();
    setToast({ id, message, type });
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      setToast(current => current?.id === id ? null : current);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white border border-slate-200 rounded-[3rem] shadow-[0_48px_96px_-12px_rgba(0,0,0,0.25)] p-8 min-w-[450px] max-w-md flex items-center gap-8 animate-in zoom-in-95 fade-in slide-in-from-top-10 duration-500 pointer-events-auto ring-1 ring-slate-950/5">
            <div className={`p-5 rounded-[1.5rem] shrink-0 shadow-sm ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
              toast.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' :
              toast.type === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
              'bg-blue-50 text-blue-600 border border-blue-100'
            }`}>
              {toast.type === 'success' && <CheckCircle2 className="w-10 h-10" />}
              {toast.type === 'error' && <AlertCircle className="w-10 h-10" />}
              {toast.type === 'warning' && <AlertTriangle className="w-10 h-10" />}
              {toast.type === 'info' && <Info className="w-10 h-10" />}
            </div>
            <div className="flex-1">
              <h4 className="font-black text-slate-900 text-xl uppercase tracking-tighter">
                {toast.type === 'success' ? 'Transaction Success' : 
                 toast.type === 'error' ? 'Operation Failed' : 
                 toast.type === 'warning' ? 'Attention Required' : 'Notification'}
              </h4>
              <p className="text-slate-500 font-bold mt-1 text-base leading-relaxed">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-slate-300 hover:text-slate-900 transition-all p-2 hover:bg-slate-50 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
