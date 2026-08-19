import { redirect } from 'next/navigation';

type InvestmentOrderRouteParams = Promise<{ slug: string }>;

export default async function LegacyInvestmentOrderPage({ params }: { params: InvestmentOrderRouteParams }) {
  const { slug } = await params;
  redirect(`/inversion/app/nueva/${encodeURIComponent(slug)}`);
}
