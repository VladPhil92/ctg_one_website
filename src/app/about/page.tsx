'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { AboutSection } from '@/components/sections/AboutSection';

export default function AboutPage() {
  return (
    <PublicPageShell>
      <AboutSection />
    </PublicPageShell>
  );
}
