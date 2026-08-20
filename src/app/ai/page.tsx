'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { AIPlatformSection } from '@/components/sections/AIPlatformSection';
import { KnowledgePilotCTA } from '@/components/knowledge/KnowledgePilotCTA';

export default function AIPage() {
  return (
    <PublicPageShell>
      <AIPlatformSection />
      <KnowledgePilotCTA />
    </PublicPageShell>
  );
}
