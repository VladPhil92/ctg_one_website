'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { InvestmentSpotlightSection } from '@/components/sections/InvestmentSpotlightSection';
import { HomeOverviewSection } from '@/components/sections/HomeOverviewSection';
import { AccountCtaSection } from '@/components/sections/AccountCtaSection';

export default function Home() {
  return (
    <>
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <HeroSection />
        <InvestmentSpotlightSection />
        <HomeOverviewSection />
        <AccountCtaSection />
      </main>
      <Footer />
    </>
  );
}
