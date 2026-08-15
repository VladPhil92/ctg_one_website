'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { TokenSection } from '@/components/sections/TokenSection';

export default function TokenPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="pt-24 sm:pt-28 md:pt-32">
        <TokenSection />
      </div>
      <Footer />
    </main>
  );
}
