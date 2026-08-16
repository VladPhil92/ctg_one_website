'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { AIArchitectureSection } from '@/components/sections/AIArchitectureSection';

export default function AIPage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <Navbar />
      <div className="pt-24 sm:pt-28 md:pt-32">
        <AIArchitectureSection />
      </div>
      <Footer />
    </main>
  );
}
