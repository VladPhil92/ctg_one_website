'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { EcosystemSection } from '@/components/sections/EcosystemSection';

export default function EcosystemPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="pt-24 sm:pt-28 md:pt-32">
        <EcosystemSection />
      </div>
      <Footer />
    </main>
  );
}
