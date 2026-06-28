"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { Company } from "@/types";

interface CompanyContextType {
  activeCompany: Company | null;
  setActiveCompany: (company: Company | null) => void;
  companies: Company[];
  addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => void;
  updateCompany: (id: string, data: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);


export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveToStorage = (list: Company[]) => {
    localStorage.setItem('chq_companies', JSON.stringify(list));
    setCompanies(list);
  };

  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true);
      
      const stored = localStorage.getItem('chq_companies');
      let companyList: Company[] = [];
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          companyList = parsed.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt)
          }));
        } catch (e) {
          console.error("Failed to parse companies", e);
        }
      }

      if (companyList.length === 0) {
        companyList = [
          { id: "comp_default", name: "Main Trading Corp", taxId: "TAX-NP-2024", createdAt: new Date() }
        ];
        localStorage.setItem('chq_companies', JSON.stringify(companyList));
      }

      setCompanies(companyList);
      
      const lastActiveId = localStorage.getItem('chq_last_active_comp');
      const lastActive = companyList.find(c => c.id === lastActiveId);
      setActiveCompany(lastActive || companyList[0]);
      
      setIsLoading(false);
    };

    fetchCompanies();
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
      isLoading 
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
