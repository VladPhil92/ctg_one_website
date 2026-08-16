'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Badge } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useInvestmentOrders } from '@/hooks/useInvestmentOrders';
import { useInvestmentSummary } from '@/hooks/useInvestmentSummary';
import { InvestmentTrackingChart } from '@/components/inversion/InvestmentTrackingChart';
import { formatCents } from '@/lib/format';
import { INVESTMENT_ORDER_STATUS_LABELS } from '@/types/investment';
import { Beer, CircleDollarSign, PackageCheck, FileText } from 'lucide-react';

export default function DashboardInvestmentPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { orders, isLoading: ordersLoading } = useInvestmentOrders();
  const { summary, isLoading: summaryLoading } = useInvestmentSummary();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/iniciar-sesion?next=/dashboard/inversion');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <section className="py-14 sm:py-20">
      <Container>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10">
          <div>
            <Badge variant="accent" className="mb-4">Mi inversión</Badge>
            <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white">CTG Craft Beer Inversión</h1>
            <p className="text-sm text-text-muted mt-3 max-w-2xl">Elige oportunidades, registra tu pago y sigue cada lote desde financiación hasta liquidación.</p>
          </div>
          <Button href="/inversion/lotes" variant="primary" size="sm">Explorar lotes</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          <Metric icon={<CircleDollarSign size={16} />} label="Capital activo" value={summaryLoading ? '—' : formatCents(summary.activeCapitalCents)} />
          <Metric icon={<PackageCheck size={16} />} label="Asignaciones" value={summaryLoading ? '—' : String(summary.allocations.length)} />
          <Metric icon={<FileText size={16} />} label="Órdenes" value={ordersLoading ? '—' : String(orders.length)} />
          <Metric icon={<Beer size={16} />} label="Lotes en seguimiento" value={ordersLoading ? '—' : String(new Set(orders.filter(o => o.status === 'ALLOCATED').map(o => o.lot_id)).size)} />
        </div>

        <h2 className="text-sm uppercase tracking-[0.16em] text-text-dim mb-5">Órdenes y tracking</h2>
        {ordersLoading ? (
          <p className="text-sm text-text-dim">Cargando inversiones...</p>
        ) : orders.length === 0 ? (
          <Card variant="bordered" padding="lg">
            <p className="text-white font-medium">Todavía no tienes órdenes de participación.</p>
            <p className="text-sm text-text-muted mt-2 mb-5">Selecciona un lote publicado y define cuántas cajas deseas financiar.</p>
            <Button href="/inversion/lotes" variant="primary" size="sm">Ver lotes disponibles</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {orders.map((order) => (
              <Card key={order.id} variant="bordered" padding="lg">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-lg font-outfit font-semibold text-white">{order.lot?.beer_style ?? 'Lote CTG Craft Beer'}</p>
                    <p className="text-[11px] text-text-dim mt-1">{order.lot?.code ?? order.lot_id}</p>
                  </div>
                  <span className="text-[9px] uppercase tracking-[.14em] border border-border rounded-full px-2.5 py-1 text-accent">{INVESTMENT_ORDER_STATUS_LABELS[order.status]}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Mini label="Cajas" value={String(order.case_equivalent_units)} />
                  <Mini label="Capital" value={formatCents(order.capital_required_cents)} />
                </div>

                {order.status === 'ALLOCATED' && order.lot ? (
                  <>
                    <InvestmentTrackingChart status={order.lot.status} />
                    <Button href={`/inversion/lotes/${order.lot.code.toLowerCase()}`} variant="secondary" size="sm" className="mt-5">Ver detalle del lote</Button>
                  </>
                ) : (
                  <div className="rounded-xl border border-border p-4" style={{ backgroundColor: 'rgba(255,255,255,.018)' }}>
                    <p className="text-xs text-text-muted">
                      {order.status === 'AWAITING_PAYMENT' && 'Tu orden está reservada y pendiente de registrar el pago.'}
                      {order.status === 'PAYMENT_SUBMITTED' && 'Recibimos tu soporte de pago. Está pendiente de validación administrativa.'}
                      {order.status === 'REJECTED' && 'La orden fue rechazada. Revisa las observaciones antes de iniciar una nueva participación.'}
                      {order.status === 'CANCELLED' && 'La orden fue cancelada.'}
                      {order.status === 'EXPIRED' && 'La reserva expiró antes de completar el pago.'}
                      {order.status === 'PAYMENT_VERIFIED' && 'El pago fue verificado y la asignación está siendo consolidada.'}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-border p-4" style={{ backgroundColor: 'var(--bg-card)' }}><div className="flex items-center gap-2 text-text-dim mb-2">{icon}<span className="text-[9px] uppercase tracking-[.14em]">{label}</span></div><p className="text-base sm:text-lg text-white font-semibold">{value}</p></div>;
}
function Mini({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] uppercase tracking-[.14em] text-text-dim">{label}</p><p className="text-sm text-white mt-1">{value}</p></div>;
}
