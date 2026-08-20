'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { TokenSection } from '@/components/sections/TokenSection';

export default function TokenPage() {
  return (
    <PublicPageShell>
      <TokenSection />
    </PublicPageShell>
  );
}
