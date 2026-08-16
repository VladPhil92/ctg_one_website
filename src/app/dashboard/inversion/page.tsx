'use client';

import '../dashboard.css';
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
import { Beer, CircleDollarSign, PackageCheck, FileText, Radar, ArrowLeft, Boxes, Activity } from 'lucide-react';

export default function DashboardInvestmentPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { orders, isLoading: ordersLoading } = useInvestmentOrders();
  const { summary, isLoading: summaryLoading } = useInvestmentSummary();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/iniciar-sesion?next=/dashboard/inversion');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) return null;

  const activeLots = new Set(orders.filter(o => o.status === 'ALLOCATED').map(o => o.lot_id)).size;

  return (
    <div className="user-os-shell min-h-screen">
      <div className="os-orbit w-[440px] h-[440px] -right-52 top-24 opacity-50" />
      <section className="py-14 sm:py-20 relative z-10">
        <Container>
          <div className="mb-5">
            <a href="/dashboard" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.18em] text-text-dim hover:text-accent transition-colors"><ArrowLeft size={13} /> User OS</a>
          </div>

          <div className="os-panel os-panel-live rounded-[28px] p-6 sm:p-8 mb-8 relative overflow-hidden">
            <div className="os-scanline absolute top-0 inset-x-0" />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-end">
              <div>
                <div className="flex items-center gap-2 mb-4"><Radar size={14} className="text-accent" /><Badge variant="accent">Investment Control Layer</Badge></div>
                <h1 className="text-3xl sm:text-5xl font-outfit font-semibold text-white leading-tight">CTG Craft Beer<br /><span className="text-accent">Investment Tracking.</span></h1>
                <p className="text-sm text-text-muted mt-4 max-w-2xl leading-relaxed">Selecciona oportunidades, registra tu participación y sigue el movimiento real del lote desde financiación hasta liquidación.</p>
              </div>
              <Button href="/inversion/lotes" variant="primary" size="sm">Explorar lotes</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
            <Metric code="INV-CAP" icon={<CircleDollarSign size={16} />} label="Capital activo" value={summaryLoading ? '—' : formatCents(summary.activeCapitalCents)} />
            <Metric code="INV-ALC" icon={<PackageCheck size={16} />} label="Asignaciones" value={summaryLoading ? '—' : String(summary.allocations.length)} />
            <Metric code="INV-ORD" icon={<FileText size={16} />} label="Órdenes" value={ordersLoading ? '—' : String(orders.length)} />
            <Metric code="INV-TRK" icon={<Beer size={16} />} label="Lotes en tracking" value={ordersLoading ? '—' : String(activeLots)} />
          </div>

          <div className="flex items-center justify-between gap-4 mb-5">
            <div><p className="text-[9px] uppercase tracking-[.22em] text-accent mb-2">Portfolio Stream</p><h2 className="text-2xl font-outfit font-semibold text-white">Órdenes y tracking</h2></div>
            <Activity size={18} className="text-accent" />
          </div>

          {ordersLoading ? (
            <div className="os-panel rounded-2xl p-7"><p className="text-sm text-text-dim">Sincronizando inversiones...</p></div>
          ) : orders.length === 0 ? (
            <div className="os-panel rounded-2xl p-8 sm:p-10 text-center">
              <div className="w-14 h-14 rounded-full border border-accent/20 flex items-center justify-center text-accent mx-auto mb-5"><Boxes size={22} /></div>
              <p className="text-white font-medium">Todavía no tienes órdenes de participación.</p>
              <p className="text-sm text-text-muted mt-2 mb-6">Selecciona un lote publicado y define cuántas cajas deseas financiar.</p>
              <Button href="/inversion/lotes" variant="primary" size="sm">Ver lotes disponibles</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {orders.map((order) => (
                <div key={order.id} className="os-panel os-module rounded-2xl p-5 sm:p-6">
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div>
                        <p className="text-[9px] uppercase tracking-[.18em] text-text-dim mb-2">Lot node</p>
                        <p className="text-xl font-outfit font-semibold text-white">{order.lot?.beer_style ?? 'Lote CTG Craft Beer'}</p>
                        <p className="text-[10px] text-text-dim mt-1 font-mono">{order.lot?.code ?? order.lot_id}</p>
                      </div>
                      <span className="text-[8px] uppercase tracking-[.14em] border border-accent/20 rounded-full px-2.5 py-1 text-accent bg-accent/[.04]">{INVESTMENT_ORDER_STATUS_LABELS[order.status]}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <Mini label="Cajas" value={String(order.case_equivalent_units)} />
                      <Mini label="Capital" value={formatCents(order.capital_required_cents)} />
                    </div>

                    {order.status === 'ALLOCATED' && order.lot ? (
                      <div className="rounded-xl border border-border p-4 sm:p-5 bg-black/20">
                        <div className="flex items-center gap-2 mb-4"><Radar size={14} className="text-accent" /><p className="text-[9px] uppercase tracking-[.18em] text-accent">Live production tracking</p></div>
                        <InvestmentTrackingChart status={order.lot.status} />
                        <Button href={`/inversion/lotes/${order.lot.code.toLowerCase()}`} variant="secondary" size="sm" className="mt-5">Ver detalle del lote</Button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border p-4 bg-white/[.015]">
                        <p className="text-[9px] uppercase tracking-[.16em] text-text-dim mb-2">Order status</p>
                        <p className="text-xs text-text-muted leading-relaxed">
                          {order.status === 'AWAITING_PAYMENT' && 'Tu orden está reservada y pendiente de registrar el pago.'}
                          {order.status === 'PAYMENT_SUBMITTED' && 'Recibimos tu soporte de pago. Está pendiente de validación administrativa.'}
                          {order.status === 'REJECTED' && 'La orden fue rechazada. Revisa las observaciones antes de iniciar una nueva participación.'}
                          {order.status === 'CANCELLED' && 'La orden fue cancelada.'}
                          {order.status === 'EXPIRED' && 'La reserva expiró antes de completar el pago.'}
                          {order.status === 'PAYMENT_VERIFIED' && 'El pago fue verificado y la asignación está siendo consolidada.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}

function Metric({ code, icon, label, value }: { code: string; icon: React.ReactNode; label: string; value: string }) {
  return <div className="os-panel os-metric rounded-xl p-4"><div className="flex items-center justify-between gap-2 text-text-dim mb-4"><div className="flex items-center gap-2">{icon}<span className="text-[9px] uppercase tracking-[.14em]">{label}</span></div><span className="text-[8px] font-mono">{code}</span></div><p className="text-base sm:text-lg text-white font-semibold">{value}</p></div>;
}
function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border p-3 bg-white/[.012]"><p className="text-[8px] uppercase tracking-[.14em] text-text-dim">{label}</p><p className="text-sm text-white mt-1 font-mono">{value}</p></div>;
}
