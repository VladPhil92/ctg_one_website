'use client';

import React from 'react';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { NvetCareAppSection } from '@/components/sections/NvetCareAppSection';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NvetCareAppPage() {
  const { locale } = useLanguage();
  const es = locale === 'es';

  return (
    <PublicPageShell>
      <div className="border-b border-[#0D1B2A]/10 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-[#0D1B2A]">
            {es ? '¿Ya tienes una cuenta Nvet Care?' : 'Already have a Nvet Care account?'}
          </p>
          <Link
            href="/nvetcareapp/iniciar-sesion"
            aria-label={es ? 'Iniciar sesión en Nvet Care' : 'Sign in to Nvet Care'}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#34B27A] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-[0_8px_20px_rgba(52,178,122,0.24)] transition hover:-translate-y-0.5 hover:bg-[#289463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34B27A] focus-visible:ring-offset-2"
          >
            <LogIn size={15} aria-hidden="true" />
            {es ? 'Iniciar sesión' : 'User login'}
          </Link>
        </div>
      </div>
      <NvetCareAppSection />
    </PublicPageShell>
  );
}
