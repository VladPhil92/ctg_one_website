'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { WorldMakersFeaturedSection } from '@/components/sections/WorldMakersFeaturedSection';
import { HomeProductShowcases } from '@/components/sections/HomeProductShowcases';
import { EcosystemDirectorySection } from '@/components/sections/EcosystemDirectorySection';
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
        <WorldMakersFeaturedSection />
        <HomeProductShowcases />
        <EcosystemDirectorySection />
        <AccountCtaSection />
      </main>
      <Footer />
    </>
  );
}
