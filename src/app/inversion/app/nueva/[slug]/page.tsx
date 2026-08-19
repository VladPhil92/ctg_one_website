import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { Container } from '@/components/ui';
import { getLotByCode, getLotFundingSummary } from '@/lib/investment/queries';
import { createClient } from '@/lib/supabase/server';
import { InvestmentCheckoutClient } from '@/components/inversion/InvestmentCheckoutClient';
import { InvestmentResumePaymentClient } from '@/components/inversion/InvestmentResumePaymentClient';
import { ArrowLeft, RadioTower, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

type InvestmentOrderRouteParams = Promise<{ slug: string }>;
type InvestmentOrderSearchParams = Promise<{ order?: string | string[] }>;

type ExistingOrder = {
  id: string;
  case_equivalent_units: number;
  capital_required_cents: number;
  status: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function NewInvestmentOrderPage({
  params,
  searchParams,
}: {
  params: InvestmentOrderRouteParams;
  searchParams: InvestmentOrderSearchParams;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const rawOrderId = Array.isArray(query.order) ? query.order[0] : query.order;
  const resumeOrderId = rawOrderId?.trim() || null;

  const lot = await getLotByCode(slug);
  if (!lot) notFound();

  let existingOrder: ExistingOrder | null = null;
  if (resumeOrderId) {
    if (!UUID_PATTERN.test(resumeOrderId)) notFound();

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      const next = `/inversion/app/nueva/${lot.code.toLowerCase()}?order=${encodeURIComponent(resumeOrderId)}`;
      redirect(`/iniciar-sesion?next=${encodeURIComponent(next)}`);
    }

    const { data, error } = await supabase
      .from('investment_orders')
      .select('id,case_equivalent_units,capital_required_cents,status')
      .eq('id', resumeOrderId)
      .eq('lot_id', lot.id)
      .eq('participant_user_id', authData.user.id)
      .maybeSingle();

    if (error) throw new Error(`No se pudo recuperar la orden reservada: ${error.message}`);
    if (!data) notFound();

    existingOrder = data as ExistingOrder;
    if (existingOrder.status !== 'AWAITING_PAYMENT') {
      redirect('/inversion/app');
    }
  }

  const funding = existingOrder ? null : await getLotFundingSummary(lot);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{backgroundImage:'linear-gradient(rgba(201,169,98,.022) 1px, transparent 1px),linear-gradient(90deg,rgba(201,169,98,.022) 1px,transparent 1px)',backgroundSize:'48px 48px'}} />
      <div className="fixed -top-64 -right-64 w-[44rem] h-[44rem] rounded-full pointer-events-none" style={{background:'radial-gradient(circle,rgba(201,169,98,.08),transparent 68%)'}} />
      <section className="relative z-10 py-14 sm:py-20">
        <Container>
          <a href="/inversion/app" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.18em] text-text-dim hover:text-accent transition-colors mb-6"><ArrowLeft size={13}/> Volver a mis inversiones</a>

          <div className="rounded-[28px] border border-white/10 p-6 sm:p-8 mb-7 relative overflow-hidden" style={{background:'linear-gradient(135deg,rgba(20,20,20,.96),rgba(8,8,8,.92))',boxShadow:'0 30px 80px rgba(0,0,0,.32)'}}>
            <div className="absolute right-[-3rem] top-[-5rem] w-56 h-56 rounded-full border border-accent/10" />
            <div className="absolute right-[1rem] top-[-2rem] w-36 h-36 rounded-full border border-accent/20" />
            <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-7 items-end">
              <div>
                <div className="flex items-center gap-2 mb-4"><RadioTower size={14} className="text-accent"/><p className="text-[9px] uppercase tracking-[.28em] text-accent">Investment Terminal · {existingOrder ? 'Payment Resume' : 'Order Composer'}</p></div>
                <h1 className="text-3xl sm:text-5xl font-outfit font-semibold tracking-[-.035em]">{lot.beer_style}</h1>
                <p className="text-sm text-text-muted mt-3">{lot.code} · {lot.destination}</p>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[.025] px-4 py-2.5 text-[10px] uppercase tracking-[.14em] text-text-muted">
                <ShieldCheck size={14} className="text-accent"/> {existingOrder ? `${existingOrder.case_equivalent_units} cajas reservadas` : `${funding?.availableCasesEquivalent ?? 0} cajas disponibles`}
              </div>
            </div>
          </div>

          {existingOrder ? (
            <InvestmentResumePaymentClient lot={lot} order={existingOrder} />
          ) : funding ? (
            <InvestmentCheckoutClient lot={lot} funding={funding} />
          ) : null}
        </Container>
      </section>
    </div>
  );
}
