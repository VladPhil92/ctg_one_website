'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { HomeIntroSection } from '@/components/sections/HomeIntroSection';
import { EcosystemDirectorySection } from '@/components/sections/EcosystemDirectorySection';
import { WalletProductFeature } from '@/components/sections/WalletProductFeature';
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
        <EcosystemDirectorySection />
        <WalletProductFeature />
        <AccountCtaSection />
      </main>
      <Footer />
    </>
  );
}
