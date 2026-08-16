'use client';

import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { Container } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';

export function KnowledgePilotCTA() {
  const { locale } = useLanguage();
  const es = locale === 'es';

  return (
    <section className="border-t border-white/[0.035] bg-bg-secondary py-16 sm:py-20">
      <Container>
        <div className="rounded-3xl border border-accent/15 bg-accent/[0.025] p-7 sm:p-9 lg:p-11">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-4 flex items-center gap-3"><BookOpen size={17} className="text-accent" /><span className="text-[9px] uppercase tracking-[0.2em] text-accent">CTG KNOWLEDGE · v0.1 PILOT</span></div>
              <h2 className="max-w-3xl font-outfit text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">{es ? 'El primer RAG funcional de CTG One ya tiene una superficie operativa.' : 'CTG One’s first functional RAG now has an operating surface.'}</h2>
              <p className="mt-4 max-w-3xl text-xs leading-relaxed text-text-muted sm:text-sm">{es ? 'Usuarios autenticados pueden consultar un corpus interno curado; los administradores controlan qué documentos entran al sistema. El piloto permanece PARTIAL hasta validar migración, corpus y evaluación en producción.' : 'Authenticated users can query a curated internal corpus while admins control what enters the system. The pilot remains PARTIAL until production migration, corpus, and evaluation are verified.'}</p>
            </div>
            <Link href="/knowledge" className="inline-flex items-center justify-center gap-2 rounded-full border border-accent/25 px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-accent transition hover:bg-accent/[0.06] hover:text-white">
              {es ? 'Abrir CTG Knowledge' : 'Open CTG Knowledge'} <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
