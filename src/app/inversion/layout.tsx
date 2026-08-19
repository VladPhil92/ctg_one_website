import React from 'react';
import type { Metadata } from 'next';
import { InvestmentNav } from '@/components/inversion/InvestmentNav';
import { InvestmentFooter } from '@/components/inversion/InvestmentFooter';

// Route-scoped layout (ADR-012): owns its own nav/footer chrome instead of
// reusing the main site's <Navbar/>/<Footer/>, so this initiative never
// needs to touch those shared components.
export const metadata: Metadata = {
  title: {
    default: 'CTG Craft Beer Inversión',
    template: '%s | CTG Craft Beer Inversión',
  },
  description:
    'Participa en la producción real de CTG Craft Beer: financia un equivalente productivo dentro de un lote identificado, sigue la producción y las ventas, y consulta la liquidación.',
  alternates: { canonical: 'https://ctgone.com/inversion' },
};

export default function InversionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <InvestmentNav />
      <div className="flex-1">{children}</div>
      <InvestmentFooter />
    </div>
  );
}
