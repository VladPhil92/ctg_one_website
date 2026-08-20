'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { ServicesSection } from '@/components/sections/ServicesSection';
import { TechnologyProofSection } from '@/components/sections/TechnologyProofSection';

export default function ServicesPage() {
  return (
    <PublicPageShell>
      <ServicesSection />
      <TechnologyProofSection />
    </PublicPageShell>
  );
}
