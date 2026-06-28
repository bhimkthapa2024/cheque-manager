"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Landmark, CreditCard, Users, ShieldAlert, Building2, ChevronDown, Book, Settings, BarChart3, TrendingUp } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { useState } from 'react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Cheque Books', href: '/cheque-books', icon: Book },
  { name: 'Cheque Lifecycle', href: '/cheques', icon: CreditCard },
  { name: 'Vendors', href: '/vendors', icon: Users },
  { name: 'Vendor Analysis', href: '/vendors/analytics', icon: BarChart3 },
  { name: 'Treasury Reports', href: '/reports', icon: TrendingUp },
  { name: 'Audit Log', href: '/audit', icon: ShieldAlert },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { activeCompany, setActiveCompany, companies, isLoading } = useCompany();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden" 
          onClick={onClose}
        />
      )}

      <div className={`
        fixed md:relative top-0 left-0 h-screen w-72 flex-col bg-white border-r border-slate-200 text-slate-900 shadow-sm z-40
        transition-transform duration-300 ease-in-out md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        flex
      `}>
      <div className="flex h-24 items-center px-8">
        <h1 className="text-xl font-black tracking-tighter flex items-center gap-3 italic text-slate-900">
          <div className="bg-accent p-2 rounded-xl shadow-lg shadow-accent/20">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          CHEQUE<span className="text-accent not-italic">PRO</span>
        </h1>
      </div>

      <div className="px-4 py-2">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-4">
          Main Menu
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-300 group ${
                  isActive 
                    ? 'bg-accent text-white shadow-lg shadow-accent/25 border border-accent' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                }`}
              >
                <item.icon className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 group-active:scale-90 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6">
        {isLoading ? (
          <div className="animate-pulse flex items-center space-x-3 bg-slate-50 p-4 rounded-3xl">
            <div className="h-10 w-10 bg-slate-100 rounded-2xl"></div>
            <div className="flex-1 space-y-2">
              <div className="h-2 bg-slate-100 rounded w-3/4"></div>
              <div className="h-2 bg-slate-100 rounded w-1/2"></div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-3 w-full bg-slate-50 hover:bg-slate-100 p-3 rounded-2xl transition-all text-left border border-slate-200 group active:scale-95"
            >
              <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-accent to-indigo-700 flex items-center justify-center text-sm font-black shadow-lg text-white">
                {activeCompany?.name.substring(0, 2).toUpperCase() || 'MC'}
              </div>
              <div className="text-sm flex-1 truncate">
                <p className="font-black truncate text-slate-900">{activeCompany?.name || 'Select Company'}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{activeCompany?.taxId || 'No active company'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-3 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden py-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
                <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">
                  Switch Company
                </div>
                {companies.map(company => (
                  <button
                    key={company.id}
                    onClick={() => {
                      setActiveCompany(company);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                      activeCompany?.id === company.id ? 'bg-accent/5 text-accent font-bold' : 'text-slate-600'
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                      activeCompany?.id === company.id ? 'bg-accent text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {company.name.charAt(0)}
                    </div>
                    <span className="truncate">{company.name}</span>
                  </button>
                ))}
                <div className="mt-2 pt-2 border-t border-slate-100 px-2">
                  <Link
                    href="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-[10px] font-black text-slate-400 hover:text-accent hover:bg-accent/5 rounded-xl transition-all uppercase tracking-[0.2em]"
                  >
                    <Settings className="w-3 h-3" />
                    Manage Entities
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
