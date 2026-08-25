'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { HomeProductShowcases } from '@/components/sections/HomeProductShowcases';

export default function ProductsPage() {
  return (
    <PublicPageShell>
      <HomeProductShowcases />
    </PublicPageShell>
  );
}
