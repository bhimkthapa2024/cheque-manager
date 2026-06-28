"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { AlertTriangle, HelpCircle, AlertCircle, X, Type } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  type?: "warning" | "danger" | "info" | "success";
  confirmText?: string;
  cancelText?: string;
}

interface PromptOptions {
  title?: string;
  placeholder?: string;
  required?: boolean;
}

interface ConfirmContextType {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  prompt: (message: string, options?: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  // Confirm State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    options: ConfirmOptions;
  } | null>(null);

  // Prompt State
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    message: string;
    options: PromptOptions;
    value: string;
  } | null>(null);

  // Resolvers
  const confirmResolver = useRef<((value: boolean) => void) | null>(null);
  const promptResolver = useRef<((value: string | null) => void) | null>(null);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    setConfirmState({
      isOpen: true,
      message,
      options: {
        title: options.title || "Confirm Action",
        type: options.type || "warning",
        confirmText: options.confirmText || "Proceed",
        cancelText: options.cancelText || "Cancel",
      },
    });

    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
    });
  }, []);

  const handleConfirmSelect = (choice: boolean) => {
    if (confirmResolver.current) {
      confirmResolver.current(choice);
    }
    setConfirmState(null);
  };

  const prompt = useCallback((message: string, options: PromptOptions = {}) => {
    setPromptState({
      isOpen: true,
      message,
      options: {
        title: options.title || "Input Required",
        placeholder: options.placeholder || "Type here...",
        required: options.required !== false,
      },
      value: "",
    });

    return new Promise<string | null>((resolve) => {
      promptResolver.current = resolve;
    });
  }, []);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptState) return;

    if (promptState.options.required && !promptState.value.trim()) {
      return;
    }

    if (promptResolver.current) {
      promptResolver.current(promptState.value.trim());
    }
    setPromptState(null);
  };

  const handlePromptCancel = () => {
    if (promptResolver.current) {
      promptResolver.current(null);
    }
    setPromptState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}

      {/* Confirmation Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md p-8 bg-white border border-slate-200 shadow-2xl rounded-[2.5rem] flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {/* Styled Icon */}
            <div className={`p-4 rounded-[1.5rem] mb-6 shadow-sm ${
              confirmState.options.type === 'danger' ? 'bg-red-50 text-red-500 border border-red-100' :
              confirmState.options.type === 'success' ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' :
              confirmState.options.type === 'info' ? 'bg-blue-50 text-blue-500 border border-blue-100' :
              'bg-amber-50 text-amber-500 border border-amber-100'
            }`}>
              {confirmState.options.type === 'danger' && <AlertCircle className="w-8 h-8" />}
              {confirmState.options.type === 'success' && <HelpCircle className="w-8 h-8" />}
              {confirmState.options.type === 'info' && <HelpCircle className="w-8 h-8" />}
              {confirmState.options.type === 'warning' && <AlertTriangle className="w-8 h-8" />}
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-2">
              {confirmState.options.title}
            </h3>
            
            <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8 px-2">
              {confirmState.message}
            </p>

            <div className="flex gap-4 w-full">
              <button
                type="button"
                onClick={() => handleConfirmSelect(false)}
                className="flex-1 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer active:scale-95"
              >
                {confirmState.options.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSelect(true)}
                className={`flex-1 px-6 py-3.5 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer active:scale-95 shadow-lg ${
                  confirmState.options.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10' :
                  confirmState.options.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10' :
                  confirmState.options.type === 'info' ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/10' :
                  'bg-accent hover:bg-accent/90 shadow-accent/10'
                }`}
              >
                {confirmState.options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {promptState && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handlePromptSubmit}
            className="glass-card w-full max-w-md p-8 bg-white border border-slate-200 shadow-2xl rounded-[2.5rem] flex flex-col items-center animate-in zoom-in-95 duration-200"
          >
            {/* Header Icon */}
            <div className="p-4 rounded-[1.5rem] bg-indigo-50 text-accent border border-indigo-100 mb-6 shadow-sm">
              <Type className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-2">
              {promptState.options.title}
            </h3>

            <p className="text-slate-500 font-bold text-sm leading-relaxed mb-6 text-center px-2">
              {promptState.message}
            </p>

            <div className="w-full mb-8">
              <input
                required={promptState.options.required}
                type="text"
                value={promptState.value}
                onChange={(e) =>
                  setPromptState((prev) => (prev ? { ...prev, value: e.target.value } : null))
                }
                placeholder={promptState.options.placeholder}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all placeholder:text-slate-400 text-slate-900"
                autoFocus
              />
            </div>

            <div className="flex gap-4 w-full">
              <button
                type="button"
                onClick={handlePromptCancel}
                className="flex-1 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={promptState.options.required && !promptState.value.trim()}
                className="flex-1 px-6 py-3.5 bg-accent hover:bg-accent/90 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer active:scale-95 shadow-lg shadow-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (context === undefined) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
