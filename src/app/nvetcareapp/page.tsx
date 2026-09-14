'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { NvetCareAppSection } from '@/components/sections/NvetCareAppSection';

export default function NvetCareAppPage() {
  return (
    <PublicPageShell>
      <NvetCareAppSection />
    </PublicPageShell>
  );
}
