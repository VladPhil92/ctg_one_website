'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { WalletProductFeature } from '@/components/sections/WalletProductFeature';
import { HomeProductShowcases } from '@/components/sections/HomeProductShowcases';

export default function ProductsPage() {
  return (
    <PublicPageShell>
      <WalletProductFeature />
      <HomeProductShowcases />
    </PublicPageShell>
  );
}