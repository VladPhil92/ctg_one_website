import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicPageShell } from '@/components/PublicPageShell';
import { EcosystemProcessDetail } from '@/components/sections/EcosystemProcessDetail';
import { ECOSYSTEM_PROCESSES, getEcosystemProcess } from '@/data/ecosystem-processes';

type ProcessPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return ECOSYSTEM_PROCESSES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ProcessPageProps): Promise<Metadata> {
  const { slug } = await params;
  const process = getEcosystemProcess(slug);

  if (!process) {
    return {};
  }

  return {
    title: `${process.labelEs} | Ecosistema | CTG One Technology`,
    description: process.descriptionEs,
    alternates: {
      canonical: `/ecosystem/process/${process.slug}`,
    },
  };
}

export default async function EcosystemProcessPage({ params }: ProcessPageProps) {
  const { slug } = await params;
  const process = getEcosystemProcess(slug);

  if (!process) {
    notFound();
  }

  return (
    <PublicPageShell>
      <EcosystemProcessDetail process={process} />
    </PublicPageShell>
  );
}
