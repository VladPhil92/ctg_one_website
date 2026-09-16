import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { NvetCareAppSection } from '@/components/sections/NvetCareAppSection';
import { NvetCareMobileActionBar } from '@/components/nvet/NvetCareMobileActionBar';
import { NvetCareVisualLibrary } from '@/components/nvet/NvetCareVisualLibrary';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function NvetCareAppPage() {
  return (
    <PublicPageShell>
      <div className="nvet-care-landing">
        <NvetCareAppSection />
        <NvetCareVisualLibrary />
        <NvetCareMobileActionBar />
      </div>
    </PublicPageShell>
  );
}
