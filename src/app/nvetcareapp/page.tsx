import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { NvetCareAppSection } from '@/components/sections/NvetCareAppSection';
import { NvetCareMobileActionBar } from '@/components/nvet/NvetCareMobileActionBar';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function NvetCareAppPage() {
  return (
    <PublicPageShell>
      <NvetCareAppSection />
      <NvetCareMobileActionBar />
    </PublicPageShell>
  );
}
