'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ServicesSection } from '@/components/sections/ServicesSection';

export default function ServicesPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="pt-24 sm:pt-28 md:pt-32">
        <ServicesSection />
      </div>
      <Footer />
    </main>
  );
}
