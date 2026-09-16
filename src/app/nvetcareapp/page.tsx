import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { NvetCareHomepageV2 } from '@/components/nvet/NvetCareHomepageV2';
import { NvetCareMobileActionBar } from '@/components/nvet/NvetCareMobileActionBar';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function NvetCareAppPage() {
  return (
    <PublicPageShell>
      <div className="nvet-care-landing">
        <NvetCareHomepageV2 />
        <NvetCareMobileActionBar />
      </div>
    </PublicPageShell>
  );
}
