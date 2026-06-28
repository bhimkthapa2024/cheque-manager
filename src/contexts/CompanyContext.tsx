"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { Company } from "@/types";
import { storage, startFirestoreSync } from "@/lib/storage";

interface CompanyContextType {
  activeCompany: Company | null;
  setActiveCompany: (company: Company | null) => void;
  companies: Company[];
  addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => void;
  updateCompany: (id: string, data: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  isLoading: boolean;
  syncCounter: number;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncCounter, setSyncCounter] = useState(0);

  const saveToStorage = (list: Company[]) => {
    storage.set("companies", list);
    setCompanies(list);
  };

  // Start Firestore real-time sync and listen for updates
  useEffect(() => {
    // 1. Initialize Firestore sync
    startFirestoreSync();

    // 2. Initial load of companies
    setIsLoading(true);
    let companyList = storage.get<Company>("companies").map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt)
    }));

    // If no companies exist, seed a default one
    if (companyList.length === 0) {
      const defaultCompany = { 
        id: "comp_default", 
        name: "Main Trading Corp", 
        taxId: "TAX-NP-2024", 
        createdAt: new Date() 
      };
      storage.add("companies", defaultCompany);
      companyList = [defaultCompany];
    }

    setCompanies(companyList);

    const lastActiveId = localStorage.getItem('chq_last_active_comp');
    const lastActive = companyList.find(c => c.id === lastActiveId);
    setActiveCompany(lastActive || companyList[0]);
    setIsLoading(false);

    // 3. Register storage_sync event listener
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      
      // If companies sync from Firestore, update the context state
      if (customEvent.detail?.key === "companies") {
        const list = storage.get<Company>("companies").map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt)
        }));
        setCompanies(list);
        
        // Ensure active company still points to a valid entry or update its fields
        setActiveCompany(prev => {
          if (!prev) return list[0] || null;
          const matched = list.find(c => c.id === prev.id);
          return matched || list[0] || null;
        });
      }
      
      // Increment syncCounter to notify pages
      setSyncCounter(prev => prev + 1);
    };

    window.addEventListener("storage_sync", handleSync);
    return () => window.removeEventListener("storage_sync", handleSync);
  }, []);

  const handleSetActiveCompany = (company: Company | null) => {
    setActiveCompany(company);
    if (company) {
      localStorage.setItem('chq_last_active_comp', company.id);
    }
  };

  const addCompany = (data: Omit<Company, 'id' | 'createdAt'>) => {
    const newCompany: Company = {
      ...data,
      id: `comp_${Date.now()}`,
      createdAt: new Date(),
    };
    const newList = [...companies, newCompany];
    saveToStorage(newList);
    if (!activeCompany) setActiveCompany(newCompany);
  };

  const updateCompany = (id: string, data: Partial<Company>) => {
    const newList = companies.map(c => c.id === id ? { ...c, ...data } : c);
    saveToStorage(newList);
    if (activeCompany?.id === id) {
      setActiveCompany({ ...activeCompany, ...data });
    }
  };

  const deleteCompany = (id: string) => {
    if (companies.length <= 1) return; // Prevent deleting the last company
    const newList = companies.filter(c => c.id !== id);
    saveToStorage(newList);
    if (activeCompany?.id === id) {
      setActiveCompany(newList[0]);
    }
  };

  return (
    <CompanyContext.Provider value={{ 
      activeCompany, 
      setActiveCompany: handleSetActiveCompany, 
      companies, 
      addCompany, 
      updateCompany, 
      deleteCompany, 
      isLoading,
      syncCounter
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
