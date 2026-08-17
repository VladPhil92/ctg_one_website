'use client';

import React from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type InvestmentRole = 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'PRODUCTION_MANAGER' | 'INVENTORY_MANAGER' | 'SALES_MANAGER' | 'AUDITOR' | 'PARTICIPANT' | null;
type Item = { href: string; label: string; roles?: Exclude<InvestmentRole, null>[] };

const ITEMS: Item[] = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/system-health', label: 'System Health', roles: ['SUPER_ADMIN'] },
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
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[.07] bg-black/85 backdrop-blur-2xl">
      <div className="mx-auto flex h-[72px] max-w-[1540px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <a href="/admin" className="group flex shrink-0 items-center gap-3 pr-2">
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10 shadow-[0_0_28px_rgba(201,169,98,.08)]">
            <Image src="/images/logo/CTGLOGO.jpeg" alt="CTG One Logo" fill className="object-cover" />
          </div>
          <div className="hidden lg:block min-w-[126px]">
            <span className="block text-[12px] font-outfit font-medium tracking-tight text-white">CTG One Admin OS</span>
            <span className="mt-1 flex items-center gap-1.5 text-[7px] uppercase tracking-[.18em] text-accent"><span className="h-1 w-1 rounded-full bg-accent shadow-[0_0_8px_rgba(201,169,98,.8)]" />{investmentRole ?? 'GLOBAL ADMIN'}</span>
          </div>
        </a>

        <div className="hidden min-w-0 flex-1 xl:block">
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/[.055] bg-white/[.018] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleItems.map(item => {
              const isActive = active?.href === item.href;
              return <a key={item.href} href={item.href} className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-[8px] font-medium uppercase tracking-[.12em] transition-all duration-200 ${isActive?'text-white':'text-text-dim hover:bg-white/[.035] hover:text-white'}`} style={isActive?{background:'linear-gradient(180deg,rgba(201,169,98,.13),rgba(201,169,98,.055))',boxShadow:'inset 0 0 0 1px rgba(201,169,98,.18)'}:undefined}>{item.label}{isActive&&<span className="absolute inset-x-3 -bottom-1 h-px bg-accent/70"/>}</a>;
            })}
          </div>
        </div>

        <select className="min-w-0 flex-1 rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-[9px] uppercase tracking-[.1em] text-white outline-none xl:hidden" value={active?.href ?? '/admin'} onChange={e=>{window.location.href=e.target.value}}>{visibleItems.map(i=><option key={i.href} value={i.href}>{i.label}</option>)}</select>

        <div className="ml-auto flex shrink-0 items-center gap-2 border-l border-white/[.07] pl-3 sm:pl-4">
          <a href="/dashboard" className="rounded-lg px-2.5 py-2 text-[8px] uppercase tracking-[.13em] text-accent transition-colors hover:bg-accent/[.07]">Mi cuenta</a>
          <button onClick={signOut} className="hidden rounded-lg px-2.5 py-2 text-[8px] uppercase tracking-[.13em] text-text-dim transition-colors hover:bg-white/[.04] hover:text-white sm:block">Cerrar sesión</button>
        </div>
      </div>
    </nav>
  );
};
