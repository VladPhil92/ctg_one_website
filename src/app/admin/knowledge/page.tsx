import type { Metadata } from 'next';
import { Container } from '@/components/ui';
import { KnowledgeIngestForm } from '@/components/knowledge/KnowledgeIngestForm';

export const metadata: Metadata = {
  title: 'CTG Knowledge Admin',
  robots: { index: false, follow: false },
};

export default function KnowledgeAdminPage() {
  return (
    <section aria-labelledby="knowledge-admin-title" className="py-4 sm:py-8">
      <Container>
        <div className="mb-10 max-w-3xl">
          <p className="mb-4 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-accent">CTG KNOWLEDGE · ADMIN</p>
          <h1 id="knowledge-admin-title" className="font-outfit text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Curate the knowledge corpus.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-text-muted">
            Ingest only approved, low-risk internal material in v0.1. Sensitive financial, legal, identity, health, or personal data requires a separate access model before ingestion.
          </p>
        </div>
        <KnowledgeIngestForm />
      </Container>
    </section>
  );
}
