'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { WalletProductFeature } from '@/components/sections/WalletProductFeature';
import { VerticeProductFeature } from '@/components/sections/VerticeProductFeature';
import { HomeProductShowcases } from '@/components/sections/HomeProductShowcases';

export default function ProductsPage() {
  return (
    <PublicPageShell>
      <WalletProductFeature />
      <VerticeProductFeature />
      <HomeProductShowcases />
    </PublicPageShell>
  );
}
