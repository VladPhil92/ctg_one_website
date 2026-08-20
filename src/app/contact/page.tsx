'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { ContactSection } from '@/components/sections/ContactSection';

export default function ContactPage() {
  return (
    <PublicPageShell>
      <ContactSection />
    </PublicPageShell>
  );
}
