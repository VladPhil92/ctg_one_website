'use client';

import React from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type InvestmentRole = 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'PRODUCTION_MANAGER' | 'INVENTORY_MANAGER' | 'SALES_MANAGER' | 'AUDITOR' | 'PARTICIPANT' | null;

type Item = { href: string; label: string; roles?: Exclude<InvestmentRole, null>[] };

const ITEMS: Item[] = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/operations', label: 'Producción OS', roles: ['SUPER_ADMIN','PRODUCTION_MANAGER'] },
  { href: '/admin/operations/overview', label: 'Ops Intelligence', roles: ['SUPER_ADMIN','FINANCE_ADMIN','PRODUCTION_MANAGER','INVENTORY_MANAGER','SALES_MANAGER','AUDITOR'] },
  { href: '/admin/operations/scanner', label: 'Scanner', roles: ['SUPER_ADMIN','PRODUCTION_MANAGER','INVENTORY_MANAGER','SALES_MANAGER'] },
  { href: '/admin/operations/labels', label: 'QR & Labels', roles: ['SUPER_ADMIN','PRODUCTION_MANAGER','INVENTORY_MANAGER'] },
  { href: '/admin/operations/settlement', label: 'Settlement', roles: ['SUPER_ADMIN','FINANCE_ADMIN'] },
  { href: '/inversion/admin/orders', label: 'Inversiones', roles: ['SUPER_ADMIN','FINANCE_ADMIN'] },
  { href: '/admin/roles', label: 'Roles', roles: ['SUPER_ADMIN'] },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/kyc', label: 'KYC' },
  { href: '/admin/depositos', label: 'Depósitos' },
  { href: '/admin/knowledge', label: 'Knowledge' },
];

export const AdminNav: React.FC<{ investmentRole: InvestmentRole }> = ({ investmentRole }) => {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const visibleItems = ITEMS.filter(item => !item.roles || (investmentRole && item.roles.includes(investmentRole)));
  const active = visibleItems.slice().sort((a,b)=>b.href.length-a.href.length).find(i=>pathname===i.href||pathname.startsWith(i.href+'/'));

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 py-3" style={{backgroundColor:'rgba(5,5,5,.92)',backdropFilter:'blur(20px)',borderBottom:'1px solid var(--border)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-5">
        <div className="flex items-center gap-5 min-w-0">
          <a href="/admin" className="flex items-center gap-3 shrink-0">
            <div className="relative w-8 h-8 rounded-full overflow-hidden"><Image src="/images/logo/CTGLOGO.jpeg" alt="CTG One Logo" fill className="object-cover" /></div>
            <div className="hidden md:block"><span className="block text-xs font-outfit font-medium text-white">CTG One Admin OS</span><span className="block text-[8px] uppercase tracking-[.18em] text-accent mt-0.5">{investmentRole ?? 'GLOBAL ADMIN'}</span></div>
          </a>
          <div className="hidden xl:flex items-center gap-4 overflow-x-auto">
            {visibleItems.map(item => <a key={item.href} href={item.href} className="text-[9px] uppercase tracking-[.13em] font-medium whitespace-nowrap transition-colors" style={{color:active?.href===item.href?'#fff':'var(--text-dim)'}}>{item.label}</a>)}
          </div>
          <select className="xl:hidden rounded-lg px-3 py-2 text-[10px] uppercase tracking-[.1em] text-white" style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.09)'}} value={active?.href ?? '/admin'} onChange={e=>{window.location.href=e.target.value}}>{visibleItems.map(i=><option key={i.href} value={i.href}>{i.label}</option>)}</select>
        </div>
        <div className="flex items-center gap-3 shrink-0"><a href="/dashboard" className="text-[9px] uppercase tracking-[.13em] text-accent">Mi cuenta</a><button onClick={signOut} className="text-[9px] uppercase tracking-[.13em] font-medium" style={{color:'var(--text-dim)'}}>Cerrar sesión</button></div>
      </div>
    </nav>
  );
};
