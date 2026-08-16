import React from 'react';
import { notFound } from 'next/navigation';
import { Container, Badge } from '@/components/ui';
import { getLotByCode, getLotFundingSummary } from '@/lib/investment/queries';
import { InvestmentCheckoutClient } from '@/components/inversion/InvestmentCheckoutClient';

export const dynamic = 'force-dynamic';

export default async function NewInvestmentOrderPage({ params }: { params: { slug: string } }) {
  const lot = await getLotByCode(params.slug);
  if (!lot) notFound();
  const funding = await getLotFundingSummary(lot);

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <Badge variant="accent" className="mb-5">CTG Craft Beer Inversión</Badge>
        <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white mb-2">{lot.beer_style}</h1>
        <p className="text-sm text-text-muted mb-10">{lot.code} · {lot.destination} · {funding.availableCasesEquivalent} cajas disponibles</p>
        <InvestmentCheckoutClient lot={lot} funding={funding} />
      </Container>
    </section>
  );
}
