'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { HomeOverviewSection } from '@/components/sections/HomeOverviewSection';
import { AccountCtaSection } from '@/components/sections/AccountCtaSection';

export default function Home() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <HeroSection />

      {/* Quick links to every other page */}
      <HomeOverviewSection />

      {/* Account creation CTA */}
      <AccountCtaSection />

      {/* Footer */}
      <Footer />
    </main>
  );
}
