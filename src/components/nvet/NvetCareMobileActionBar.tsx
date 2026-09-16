'use client';

import Link from 'next/link';
import { ArrowRight, Stethoscope } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function NvetCareMobileActionBar() {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const copy = es
    ? {
        label: 'Acciones rápidas de Nvet Care',
        services: 'Servicios',
        primary: 'Solicitar atención',
      }
    : {
        label: 'Nvet Care quick actions',
        services: 'Services',
        primary: 'Request care',
      };

  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#0D1B2A]/10 bg-white/94 px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2.5 shadow-[0_-14px_34px_rgba(13,27,42,0.10)] backdrop-blur-xl md:hidden"
      aria-label={copy.label}
    >
      <div className="mx-auto grid max-w-lg grid-cols-[0.82fr_1.18fr] gap-2.5">
        <a
          href="#servicios"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#0D1B2A]/10 bg-white px-4 text-xs font-semibold text-[#0D1B2A] transition active:scale-[0.98]"
        >
          <Stethoscope size={16} aria-hidden="true" />
          {copy.services}
        </a>
        <Link
          href="/nvetcareapp/iniciar-sesion"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#34B27A] px-4 text-xs font-semibold text-white shadow-[0_10px_26px_rgba(52,178,122,0.28)] transition active:scale-[0.98]"
        >
          {copy.primary}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
