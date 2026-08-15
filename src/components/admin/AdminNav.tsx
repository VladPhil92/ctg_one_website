'use client';

import React from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const ITEMS = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/kyc', label: 'KYC' },
  { href: '/admin/depositos', label: 'Depósitos' },
];

export const AdminNav: React.FC = () => {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 py-4"
      style={{
        backgroundColor: 'rgba(5, 5, 5, 0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-full overflow-hidden">
              <Image src="/images/logo/CTGLOGO.jpeg" alt="CTG One Logo" fill className="object-cover" />
            </div>
            <span className="text-sm font-outfit font-medium text-white">Admin</span>
          </a>
          <div className="hidden sm:flex items-center gap-6">
            {ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[11px] uppercase tracking-[0.15em] font-medium transition-colors duration-300"
                style={{ color: pathname === item.href ? '#fff' : 'var(--text-dim)' }}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <button
          onClick={signOut}
          className="text-[11px] uppercase tracking-[0.15em] font-medium"
          style={{ color: 'var(--text-dim)' }}
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
};
