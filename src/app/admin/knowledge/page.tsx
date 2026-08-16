import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Container } from '@/components/ui';
import { KnowledgeIngestForm } from '@/components/knowledge/KnowledgeIngestForm';

export const metadata: Metadata = {
  title: 'CTG Knowledge Admin',
  robots: { index: false, follow: false },
};

export default function KnowledgeAdminPage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <Navbar />
      <section className="pt-32 pb-20 sm:pt-36 sm:pb-28">
        <Container>
          <div className="mb-10 max-w-3xl">
            <p className="mb-4 text-[9px] uppercase tracking-[0.22em] text-accent">CTG KNOWLEDGE · ADMIN</p>
            <h1 className="font-outfit text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Curate the knowledge corpus.</h1>
            <p className="mt-5 text-sm leading-relaxed text-text-muted">Ingest only approved, low-risk internal material in v0.1. Sensitive financial, legal, identity, health, or personal data requires a separate access model before ingestion.</p>
          </div>
          <KnowledgeIngestForm />
        </Container>
      </section>
      <Footer />
    </main>
  );
}
