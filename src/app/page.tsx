'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { HomeIntroSection } from '@/components/sections/HomeIntroSection';
import { WalletProductFeature } from '@/components/sections/WalletProductFeature';
import { HomeProductShowcases } from '@/components/sections/HomeProductShowcases';
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
        <HomeIntroSection />
        <WalletProductFeature />
        <HomeProductShowcases />
        <HomeOverviewSection />
        <AccountCtaSection />
      </main>
      <Footer />
    </>
  );
}