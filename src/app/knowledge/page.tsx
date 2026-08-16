import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Container } from '@/components/ui';
import { KnowledgeConsole } from '@/components/knowledge/KnowledgeConsole';

export const metadata: Metadata = {
  title: 'CTG Knowledge v0.1',
  description: 'Internal source-grounded knowledge workspace for authenticated CTG One users.',
  robots: { index: false, follow: false },
};

export default function KnowledgePage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <Navbar />
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-36 sm:pb-28">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(212,162,89,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.05) 1px, transparent 1px)', backgroundSize: '76px 76px' }} />
        <Container className="relative">
          <div className="mb-10 max-w-4xl">
            <p className="mb-4 text-[9px] uppercase tracking-[0.22em] text-accent">CTG KNOWLEDGE · v0.1 PILOT</p>
            <h1 className="font-outfit text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl md:text-6xl">Evidence before answers.</h1>
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-text-muted sm:text-base">Authenticated retrieval over a curated, low-risk internal corpus. CTG Knowledge answers from retrieved sources and should refuse when the available evidence is insufficient.</p>
          </div>
          <KnowledgeConsole />
        </Container>
      </section>
      <Footer />
    </main>
  );
}
