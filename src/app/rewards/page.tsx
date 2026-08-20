'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { RewardsSection } from '@/components/sections/RewardsSection';

export default function RewardsPage() {
  return (
    <PublicPageShell>
      <RewardsSection />
    </PublicPageShell>
  );
}
