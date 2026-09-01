import type { Metadata } from 'next';
import { EducationCheckoutClient } from '@/components/jpvalderrama/EducationCheckoutClient';
import { JPValderramaFooter, JPValderramaHeader } from '@/components/jpvalderrama/JPValderramaShell';

export const metadata: Metadata = {
  title: 'Checkout educativo | JP Valderrama | CTG One',
  description: 'Orden autenticada para productos educativos de JP Valderrama dentro de CTG One.',
  robots: { index: false, follow: false },
};

export default async function EducationCheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-[#f7f0e7] text-[#19130f] selection:bg-[#6f0d12] selection:text-[#fffaf2]">
      <a href="#contenido" className="sr-only z-[100] rounded bg-[#6f0d12] px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>
      <JPValderramaHeader active="campus" />
      <div id="contenido">
        <EducationCheckoutClient slug={slug} />
      </div>
      <JPValderramaFooter />
    </main>
  );
}
