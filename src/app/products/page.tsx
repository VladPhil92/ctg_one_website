'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProductsCaseStudiesSection } from '@/components/sections/ProductsCaseStudiesSection';

export default function ProductsPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="pt-24 sm:pt-28 md:pt-32">
        <ProductsCaseStudiesSection />
      </div>
      <Footer />
    </main>
  );
}
