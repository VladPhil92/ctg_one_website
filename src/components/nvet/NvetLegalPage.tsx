import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export function NvetLegalPage({
  eyebrow,
  title,
  version,
  children,
}: {
  eyebrow: string;
  title: string;
  version: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F7FAF8] px-4 py-10 text-[#0D1B2A] sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/nvetcareapp"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#44505B] hover:text-[#237754]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a Nvet Care
        </Link>

        <header className="mt-6 rounded-[2rem] border border-[#0D1B2A]/10 bg-white p-6 shadow-sm sm:p-9">
          <div className="flex items-center gap-2 text-[#237754]">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">{eyebrow}</p>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#5B6670]">
            Versión: {version}. Esta publicación documenta la operación web actual de Nvet Care y debe mantenerse
            alineada con los proveedores, finalidades y funciones realmente habilitados.
          </p>
        </header>

        <article className="mt-6 space-y-8 rounded-[2rem] border border-[#0D1B2A]/10 bg-white p-6 text-sm leading-7 text-[#44505B] shadow-sm sm:p-9 [&_a]:font-semibold [&_a]:text-[#237754] [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-[-0.02em] [&_h2]:text-[#0D1B2A] [&_h3]:font-bold [&_h3]:text-[#0D1B2A] [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[#0D1B2A]">
          {children}
        </article>

        <nav aria-label="Documentos legales de Nvet Care" className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link className="rounded-xl border border-[#0D1B2A]/10 bg-white px-4 py-3 font-semibold" href="/nvetcareapp/privacidad">
            Privacidad
          </Link>
          <Link className="rounded-xl border border-[#0D1B2A]/10 bg-white px-4 py-3 font-semibold" href="/nvetcareapp/terminos">
            Términos
          </Link>
          <Link className="rounded-xl border border-[#0D1B2A]/10 bg-white px-4 py-3 font-semibold" href="/nvetcareapp/cookies">
            Cookies
          </Link>
        </nav>
      </div>
    </main>
  );
}
