'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Badge } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useInvestmentOrders } from '@/hooks/useInvestmentOrders';
import { useInvestmentSummary } from '@/hooks/useInvestmentSummary';
import { InvestmentTrackingChart } from '@/components/inversion/InvestmentTrackingChart';
import { InvestmentLiquidityPanel } from '@/components/inversion/InvestmentLiquidityPanel';
import { InvestmentReinvestmentPanel } from '@/components/inversion/InvestmentReinvestmentPanel';
import { formatCents } from '@/lib/format';
import {
  INVESTMENT_ORDER_STATUS_LABELS,
  type InvestmentKycStatus,
  type InvestmentOrderStatus,
} from '@/types/investment';
import { Activity, Beer, Boxes, CircleDollarSign, PackageCheck, Radar, ShieldCheck } from 'lucide-react';

const KYC_LABELS: Record<InvestmentKycStatus, string> = {
  NOT_STARTED: 'No iniciado',
  PENDING: 'En revisión',
  VERIFIED: 'Verificado',
  REJECTED: 'Rechazado',
  REQUIRES_REVIEW: 'Requiere revisión',
};

function orderStatusDescription(status: InvestmentOrderStatus): string {
  switch (status) {
    case 'AWAITING_PAYMENT':
      return 'La orden reservó capacidad del lote. Falta realizar la transferencia y registrar el comprobante.';
    case 'PENDING_BANK_VERIFICATION':
      return 'Comprobante recibido. Finanzas debe confirmar el abono directamente en Bancolombia antes de activar la participación.';
    case 'PAYMENT_SUBMITTED':
      return 'Estado legado de evidencia recibida. La participación no se activa hasta completar la conciliación bancaria humana.';
    case 'PAYMENT_VERIFIED':
      return 'El pago fue conciliado y la asignación está siendo consolidada por el sistema.';
    case 'ALLOCATED':
      return 'Participación activa y vinculada al lote.';
    case 'REJECTED':
      return 'La orden fue rechazada. Revisa las observaciones antes de iniciar una nueva participación.';
    case 'CANCELLED':
      return 'La orden fue cancelada y ya no puede continuar por este flujo.';
    case 'EXPIRED':
      return 'La reserva expiró antes de completar la verificación del pago.';
  }
}

export default function InvestmentAppPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useInvestmentProfile();
  const { orders, isLoading: ordersLoading } = useInvestmentOrders();
  const { summary, isLoading: summaryLoading, refresh: refreshSummary } = useInvestmentSummary();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/iniciar-sesion?next=/inversion/app');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }} />
          <p className="text-text-muted text-sm">Sincronizando tu sesión...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const activeLots = new Set(orders.filter((order) => order.status === 'ALLOCATED').map((order) => order.lot_id)).size;
  const kycStatus = profile?.kyc_status ?? 'NOT_STARTED';
  const kycVerified = kycStatus === 'VERIFIED';

  return (
    <div className="investment-console min-h-screen bg-[#050505] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none investment-grid" />
      <div className="fixed top-[-14rem] right-[-12rem] w-[42rem] h-[42rem] rounded-full pointer-events-none investment-glow" />
      <section className="relative py-12 sm:py-16">
        <Container>
          <div className="investment-panel rounded-[28px] p-6 sm:p-9 mb-5 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
            <div className="absolute right-[-5rem] top-[-6rem] w-72 h-72 rounded-full border border-accent/10" />
            <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-7 items-end">
              <div>
                <div className="flex items-center gap-2 mb-4"><Radar size={14} className="text-accent" /><Badge variant="accent">Investment Control Layer</Badge></div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-outfit font-semibold tracking-[-.04em] leading-[.98]">CTG Craft Beer<br /><span className="text-accent">Investment Tracking.</span></h1>
                <p className="text-sm sm:text-base text-text-muted mt-5 max-w-2xl leading-relaxed">Consulta tus órdenes, asignaciones, tracking productivo y saldo liquidado desde una única superficie del programa de inversión.</p>
              </div>
              <Button href="/inversion/lotes" variant="primary" size="sm">Explorar lotes</Button>
            </div>
          </div>

          <div className={`rounded-2xl border p-4 sm:p-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${kycVerified ? 'border-emerald-400/15 bg-emerald-400/[.025]' : 'border-accent/15 bg-accent/[.035]'}`}>
            <div className="flex items-start gap-3">
              <div className="radar-node shrink-0"><ShieldCheck size={16} /></div>
              <div>
                <p className="micro-label">Identidad de inversión</p>
                <p className="text-sm text-white mt-1">KYC: {profileLoading ? 'Sincronizando…' : KYC_LABELS[kycStatus]}</p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  {kycVerified
                    ? 'Tu identidad de inversión está verificada para los flujos que requieren KYC.'
                    : 'La creación y activación de una participación puede requerir completar o resolver el KYC específico de inversión.'}
                </p>
              </div>
            </div>
            {!profileLoading && !kycVerified && <Button href="/dashboard/kyc" variant="secondary" size="sm">Revisar KYC</Button>}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
            <Metric code="INV-CAP" icon={<CircleDollarSign size={16} />} label="Capital activo" value={summaryLoading ? '—' : formatCents(summary.activeCapitalCents)} />
            <Metric code="INV-LIQ" icon={<CircleDollarSign size={16} />} label="Saldo disponible" value={summaryLoading ? '—' : formatCents(summary.availableBalanceCents)} />
            <Metric code="INV-ALC" icon={<PackageCheck size={16} />} label="Asignaciones" value={summaryLoading ? '—' : String(summary.allocations.length)} />
            <Metric code="INV-TRK" icon={<Beer size={16} />} label="Lotes en tracking" value={ordersLoading ? '—' : String(activeLots)} />
          </div>

          <InvestmentReinvestmentPanel onRefresh={refreshSummary} />

          <InvestmentLiquidityPanel
            availableBalanceCents={summary.availableBalanceCents}
            withdrawals={summary.withdrawalRequests}
            onRefresh={refreshSummary}
          />

          <div className="flex items-center justify-between gap-4 mb-5">
            <div><p className="micro-label">Portfolio Stream</p><h2 className="text-2xl sm:text-3xl font-outfit font-semibold mt-2">Órdenes y tracking</h2></div>
            <div className="radar-node"><Activity size={17} /></div>
          </div>

          {ordersLoading ? (
            <div className="investment-panel rounded-2xl p-7" role="status" aria-live="polite"><p className="text-sm text-text-dim">Sincronizando inversiones...</p></div>
          ) : orders.length === 0 ? (
            <div className="investment-panel rounded-2xl p-8 sm:p-11 text-center">
              <div className="radar-node-lg mx-auto mb-5"><Boxes size={22} /></div>
              <p className="text-white font-medium">Todavía no tienes órdenes de participación.</p>
              <p className="text-sm text-text-muted mt-2 mb-6">Puedes explorar los lotes publicados; cada ficha indicará si la financiación está abierta y cuánta capacidad permanece disponible.</p>
              <Button href="/inversion/lotes" variant="primary" size="sm">Ver lotes</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {orders.map((order) => (
                <article key={order.id} className="investment-panel investment-card rounded-[22px] p-5 sm:p-6 relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-14 w-36 h-36 rounded-full border border-accent/10" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div>
                        <p className="micro-label mb-2">Lot node</p>
                        <p className="text-xl font-outfit font-semibold">{order.lot?.beer_style ?? 'Lote CTG Craft Beer'}</p>
                        <p className="text-[10px] text-text-dim mt-1 font-mono break-all">{order.lot?.code ?? order.lot_id}</p>
                      </div>
                      <span className="text-[8px] uppercase tracking-[.14em] border border-accent/20 rounded-full px-2.5 py-1 text-accent bg-accent/[.04] text-right">{INVESTMENT_ORDER_STATUS_LABELS[order.status]}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <Mini label="Cajas" value={String(order.case_equivalent_units)} />
                      <Mini label="Capital requerido" value={formatCents(order.capital_required_cents)} />
                    </div>

                    {order.status === 'ALLOCATED' && order.lot ? (
                      <div className="rounded-xl border border-white/[.07] p-4 sm:p-5 bg-black/20">
                        <div className="flex items-center gap-2 mb-4"><Radar size={14} className="text-accent" /><p className="micro-label text-accent">Live production tracking</p></div>
                        <InvestmentTrackingChart status={order.lot.status} />
                        <Button href={`/inversion/lotes/${order.lot.code.toLowerCase()}`} variant="secondary" size="sm" className="mt-5">Ver detalle del lote</Button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/[.07] p-4 bg-white/[.015]" role="status">
                        <p className="micro-label mb-2">Estado de la orden</p>
                        <p className="text-xs text-text-muted leading-relaxed">{orderStatusDescription(order.status)}</p>
                        {order.status === 'AWAITING_PAYMENT' && order.lot && (
                          <Button href={`/inversion/app/nueva/${order.lot.code.toLowerCase()}?order=${encodeURIComponent(order.id)}`} variant="secondary" size="sm" className="mt-4">Continuar pago</Button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Container>
      </section>
      <style jsx global>{`
        .investment-grid{background-image:linear-gradient(rgba(201,169,98,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,169,98,.025) 1px,transparent 1px);background-size:52px 52px}.investment-glow{background:radial-gradient(circle,rgba(201,169,98,.09),transparent 68%)}.investment-panel{background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.016));border:1px solid rgba(255,255,255,.085);box-shadow:inset 0 1px 0 rgba(255,255,255,.03),0 24px 65px rgba(0,0,0,.26);backdrop-filter:blur(18px)}.investment-card{transition:transform .28s ease,border-color .28s ease,box-shadow .28s ease}.investment-card:hover{transform:translateY(-4px);border-color:rgba(201,169,98,.24);box-shadow:0 28px 70px rgba(0,0,0,.32)}.micro-label{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-dim);font-weight:600}.radar-node,.radar-node-lg{border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--accent);border:1px solid rgba(201,169,98,.24);background:radial-gradient(circle,rgba(201,169,98,.11),rgba(201,169,98,.02));box-shadow:inset 0 0 20px rgba(201,169,98,.04)}.radar-node{width:38px;height:38px}.radar-node-lg{width:56px;height:56px}@media(prefers-reduced-motion:reduce){.investment-card{transition:none}.investment-card:hover{transform:none}}@media(max-width:640px){.investment-panel{backdrop-filter:blur(10px)}}
      `}</style>
    </div>
  );
}

function Metric({ code, icon, label, value }: { code: string; icon: React.ReactNode; label: string; value: string }) {
  return <div className="investment-panel rounded-2xl p-4 sm:p-5 relative overflow-hidden"><span className="absolute top-3 right-3 text-[8px] font-mono text-white/15">{code}</span><div className="flex items-center gap-2 text-accent mb-5">{icon}<span className="micro-label">{label}</span></div><p className="text-base sm:text-lg text-white font-semibold truncate">{value}</p></div>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/[.07] p-3 bg-white/[.012]"><p className="micro-label">{label}</p><p className="text-sm text-white mt-1 font-mono">{value}</p></div>;
}
