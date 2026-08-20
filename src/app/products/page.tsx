'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { ProductsCaseStudiesSection } from '@/components/sections/ProductsCaseStudiesSection';

export default function ProductsPage() {
  return (
    <PublicPageShell>
      <ProductsCaseStudiesSection />
    </PublicPageShell>
  );
}
