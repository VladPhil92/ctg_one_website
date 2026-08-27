'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { CtgoTokenSection } from '@/components/sections/CtgoTokenSection';

export default function CtgoTokenPage() {
  return (
    <PublicPageShell>
      <CtgoTokenSection />
    </PublicPageShell>
  );
}
