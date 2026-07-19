'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { RewardsSection } from '@/components/sections/RewardsSection';

export default function RewardsPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="pt-24 sm:pt-28 md:pt-32">
        <RewardsSection />
      </div>
      <Footer />
    </main>
  );
}
