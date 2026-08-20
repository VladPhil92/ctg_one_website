'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { EcosystemSection } from '@/components/sections/EcosystemSection';

export default function EcosystemPage() {
  return (
    <PublicPageShell>
      <EcosystemSection />
    </PublicPageShell>
  );
}
