'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { EcosystemSection } from '@/components/sections/EcosystemSection';
import { EcosystemDirectorySection } from '@/components/sections/EcosystemDirectorySection';

export default function EcosystemPage() {
  return (
    <PublicPageShell>
      <EcosystemSection />
      <EcosystemDirectorySection />
    </PublicPageShell>
  );
}
