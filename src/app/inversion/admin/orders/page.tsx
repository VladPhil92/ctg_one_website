'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Badge } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCents } from '@/lib/format';
import { INVESTMENT_ORDER_STATUS_LABELS, type InvestmentOrder } from '@/types/investment';
import { CheckCircle2, Landmark, RefreshCw, ShieldCheck } from 'lucide-react';

type ReconcileDraft = {
  providerCode: string;
  externalReference: string;
  settledAt: string;
  idempotencyKey: string;
};

const nowLocal = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const freshDraft = (): ReconcileDraft => ({
  providerCode: '',
  externalReference: '',
  settledAt: nowLocal(),
  idempotencyKey: crypto.randomUUID(),
});

export default function InvestmentOrdersAdminPage() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<InvestmentOrder[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ReconcileDraft>>({});
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isAdmin = profile?.role === 'admin';

  const load = useCallback(async () => {
    setLoadingOrders(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('investment_orders')
      .select('*, lot:investment_production_lots(*)')
      .in('status', ['AWAITING_PAYMENT', 'PAYMENT_SUBMITTED'])
      .order('created_at', { ascending: true });

    if (queryError) setError(queryError.message);
    else {
      const rows = (data as unknown as InvestmentOrder[]) ?? [];
      setOrders(rows);
      setDrafts((current) => {
        const next = { ...current };
        for (const order of rows) if (!next[order.id]) next[order.id] = freshDraft();
        return next;
      });
    }
    setLoadingOrders(false);
  }, [supabase]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.push('/iniciar-sesion?next=/inversion/admin/orders');
    else if (!isAdmin) router.push('/dashboard');
    else void load();
  }, [isAuthenticated, isLoading, isAdmin, router, load]);

  if (isLoading || !isAuthenticated || !isAdmin) return null;

  const patchDraft = (id: string, patch: Partial<ReconcileDraft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? freshDraft()), ...patch } }));
  };

  const reconcile = async (order: InvestmentOrder) => {
    const draft = drafts[order.id] ?? freshDraft();
    if (!order.payment_method) {
      setError('La orden no tiene un rail de pago reportado.');
      return;
    }
    if (!draft.providerCode.trim() || !draft.externalReference.trim() || !draft.settledAt) {
      setError('Proveedor, referencia externa y fecha de liquidación son obligatorios.');
      return;
    }

    setBusyId(order.id);
    setError(null);
    setMessage(null);
    const settled = new Date(draft.settledAt);
    if (Number.isNaN(settled.getTime())) {
      setError('Fecha de liquidación inválida.');
      setBusyId(null);
      return;
    }

    const { error: rpcError } = await supabase.rpc('reconcile_investment_order_payment', {
      p_order_id: order.id,
      p_payment_rail: order.payment_method,
      p_provider_code: draft.providerCode.trim(),
      p_external_reference: draft.externalReference.trim(),
      p_amount_cents: order.capital_required_cents,
      p_settled_at: settled.toISOString(),
      p_idempotency_key: draft.idempotencyKey,
      p_notes: null,
    });

    if (rpcError) setError(rpcError.message);
    else {
      setMessage(`Pago conciliado: ${formatCents(order.capital_required_cents)} respaldado por receipt externo.`);
      await load();
    }
    setBusyId(null);
  };

  const reject = async (id: string) => {
    const notes = window.prompt('Motivo del rechazo');
    if (!notes?.trim()) return;
    setBusyId(id);
    setError(null);
    setMessage(null);
    const { error: rpcError } = await supabase.rpc('reject_investment_order', {
      p_order_id: id,
      p_admin_notes: notes.trim(),
    });
    if (rpcError) setError(rpcError.message);
    else {
      setMessage('Orden rechazada sin crear hechos monetarios.');
      await load();
    }
    setBusyId(null);
  };

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-9">
          <div>
            <Badge variant="accent" className="mb-4">Inbound Payment Rail</Badge>
            <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white">Conciliación de inversión</h1>
            <p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">
              El soporte enviado por el participante es una declaración de pago. Solo una referencia externa verificada crea el receipt autoritativo, la allocation y los hechos de ledger.
            </p>
          </div>
          <Button onClick={() => void load()} variant="secondary" size="sm"><RefreshCw size={14} /> Actualizar</Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          <RailNote icon={<ShieldCheck size={15} />} label="Evidence claim" text="El comprobante del usuario no mueve ledger." />
          <RailNote icon={<Landmark size={15} />} label="External receipt" text="Proveedor + referencia + settled_at son obligatorios." />
          <RailNote icon={<CheckCircle2 size={15} />} label="Atomic funding" text="Receipt, allocation y ledger se confirman juntos." />
        </div>

        {(error || message) && (
          <div className="rounded-xl border px-4 py-3 text-sm mb-6" style={{
            borderColor: error ? 'rgba(239,68,68,.28)' : 'rgba(201,169,98,.28)',
            background: error ? 'rgba(239,68,68,.05)' : 'rgba(201,169,98,.05)',
            color: error ? '#fca5a5' : 'var(--accent)',
          }}>{error ?? message}</div>
        )}

        {loadingOrders ? (
          <p className="text-sm text-text-dim">Cargando órdenes...</p>
        ) : orders.length === 0 ? (
          <Card variant="bordered" padding="lg"><p className="text-sm text-text-dim">No hay órdenes pendientes de pago o conciliación.</p></Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {orders.map((order) => {
              const draft = drafts[order.id] ?? freshDraft();
              return (
                <Card key={order.id} variant="bordered" padding="lg">
                  <div className="flex justify-between gap-4 mb-5">
                    <div>
                      <p className="text-white font-semibold">{order.lot?.beer_style ?? 'Lote'}</p>
                      <p className="text-[11px] text-text-dim mt-1 font-mono">{order.lot?.code ?? order.lot_id}</p>
                    </div>
                    <span className="text-[9px] uppercase tracking-[.12em] text-accent">{INVESTMENT_ORDER_STATUS_LABELS[order.status]}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                    <Mini label="Cajas" value={String(order.case_equivalent_units)} />
                    <Mini label="Capital exacto" value={formatCents(order.capital_required_cents)} />
                    <Mini label="Rail reportado" value={order.payment_method ?? 'Pendiente'} />
                    <Mini label="Ref. declarada" value={order.payment_reference ?? '—'} />
                  </div>

                  {order.status === 'PAYMENT_SUBMITTED' ? (
                    <div className="space-y-3 border-t border-white/[.07] pt-5">
                      <p className="text-[9px] uppercase tracking-[.16em] text-text-dim">Authoritative receipt</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <label className="text-xs text-text-muted">Proveedor / banco
                          <input className="railInput mt-1.5" value={draft.providerCode} onChange={(e) => patchDraft(order.id, { providerCode: e.target.value })} placeholder="BANCOLOMBIA" />
                        </label>
                        <label className="text-xs text-text-muted">Referencia externa
                          <input className="railInput mt-1.5" value={draft.externalReference} onChange={(e) => patchDraft(order.id, { externalReference: e.target.value })} placeholder="TRX-..." />
                        </label>
                      </div>
                      <label className="block text-xs text-text-muted">Fecha/hora liquidada
                        <input type="datetime-local" className="railInput mt-1.5" value={draft.settledAt} onChange={(e) => patchDraft(order.id, { settledAt: e.target.value })} />
                      </label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button onClick={() => void reconcile(order)} loading={busyId === order.id} variant="primary" size="sm">Conciliar receipt</Button>
                        <Button onClick={() => void reject(order.id)} disabled={busyId === order.id} variant="secondary" size="sm">Rechazar claim</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-dim border-t border-white/[.07] pt-4">Esperando que el participante registre su declaración de pago.</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Container>
      <style jsx global>{`.railInput{width:100%;border-radius:11px;padding:10px 12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}.railInput:focus{border-color:rgba(201,169,98,.38)}`}</style>
    </section>
  );
}

function RailNote({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return <div className="rounded-xl border border-white/[.07] bg-white/[.018] p-4"><div className="text-accent mb-3">{icon}</div><p className="text-[9px] uppercase tracking-[.14em] text-text-dim">{label}</p><p className="text-xs text-text-muted mt-1.5 leading-relaxed">{text}</p></div>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/[.07] bg-white/[.015] p-3"><p className="text-[9px] uppercase tracking-[.12em] text-text-dim">{label}</p><p className="text-xs text-white mt-1.5 break-all">{value}</p></div>;
}
