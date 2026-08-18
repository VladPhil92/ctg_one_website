'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Badge } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCents } from '@/lib/format';
import { INVESTMENT_ORDER_STATUS_LABELS, type InvestmentOrder } from '@/types/investment';
import { CheckCircle2, ExternalLink, Landmark, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';

type VerificationDraft = {
  bankReference: string;
  receivedAmountCop: string;
  bankReceivedAt: string;
  notes: string;
};

const nowLocal = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const freshDraft = (amountCents = 0): VerificationDraft => ({
  bankReference: '',
  receivedAmountCop: String(Math.round(amountCents / 100)),
  bankReceivedAt: nowLocal(),
  notes: '',
});

export default function InvestmentOrdersAdminPage() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<InvestmentOrder[]>([]);
  const [drafts, setDrafts] = useState<Record<string, VerificationDraft>>({});
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isAdmin = profile?.role === 'admin';

  const load = useCallback(async () => {
    setLoadingOrders(true); setError(null);
    const supabase = createClient();
    const { data, error: queryError } = await supabase
      .from('investment_orders')
      .select('*, lot:investment_production_lots(*)')
      .in('status', ['AWAITING_PAYMENT', 'PENDING_BANK_VERIFICATION'])
      .order('created_at', { ascending: true });

    if (queryError) setError(queryError.message);
    else {
      const rows = (data as unknown as InvestmentOrder[]) ?? [];
      setOrders(rows);
      setDrafts((current) => {
        const next = { ...current };
        for (const order of rows) if (!next[order.id]) next[order.id] = freshDraft(order.capital_required_cents);
        return next;
      });
    }
    setLoadingOrders(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.push('/iniciar-sesion?next=/inversion/admin/orders');
    else if (!isAdmin) router.push('/dashboard');
    else void load();
  }, [isAuthenticated, isLoading, isAdmin, router, load]);

  if (isLoading || !isAuthenticated || !isAdmin) return null;

  const patchDraft = (id: string, patch: Partial<VerificationDraft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? freshDraft()), ...patch } }));
  };

  const openProof = async (order: InvestmentOrder) => {
    if (!order.payment_proof_storage_path) return setError('La orden no tiene comprobante almacenado.');
    setError(null);
    const supabase = createClient();
    const { data, error: signedError } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(order.payment_proof_storage_path, 300);
    if (signedError || !data?.signedUrl) return setError(signedError?.message ?? 'No se pudo abrir el comprobante');
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const verify = async (order: InvestmentOrder) => {
    const draft = drafts[order.id] ?? freshDraft(order.capital_required_cents);
    if (!draft.bankReference.trim() || !draft.receivedAmountCop.trim() || !draft.bankReceivedAt) {
      return setError('Referencia Bancolombia, monto recibido y fecha/hora del abono son obligatorios.');
    }
    const amountCop = Number(draft.receivedAmountCop);
    if (!Number.isFinite(amountCop) || amountCop <= 0) return setError('Monto recibido inválido.');
    const receivedAt = new Date(draft.bankReceivedAt);
    if (Number.isNaN(receivedAt.getTime())) return setError('Fecha/hora de abono inválida.');

    setBusyId(order.id); setError(null); setMessage(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('verify_investment_bancolombia_transfer', {
      p_order_id: order.id,
      p_bank_reference: draft.bankReference.trim(),
      p_received_amount_cents: Math.round(amountCop * 100),
      p_bank_received_at: receivedAt.toISOString(),
      p_notes: draft.notes.trim() || null,
    });

    if (rpcError) setError(rpcError.message);
    else {
      setMessage(`Dinero confirmado en Bancolombia. Se activaron receipt, allocation, ledger y contrato para ${formatCents(order.capital_required_cents)}.`);
      await load();
    }
    setBusyId(null);
  };

  const rejectProof = async (order: InvestmentOrder) => {
    const reason = window.prompt('Motivo del rechazo del comprobante / pago');
    if (!reason?.trim()) return;
    setBusyId(order.id); setError(null); setMessage(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('reject_investment_bank_proof', {
      p_order_id: order.id,
      p_reason: reason.trim(),
    });
    if (rpcError) setError(rpcError.message);
    else { setMessage('Comprobante rechazado. No se creó receipt, allocation, contrato ni movimiento de ledger.'); await load(); }
    setBusyId(null);
  };

  const rejectUnpaid = async (order: InvestmentOrder) => {
    const reason = window.prompt('Motivo del rechazo de la orden sin pago');
    if (!reason?.trim()) return;
    setBusyId(order.id); setError(null); setMessage(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('reject_investment_order', { p_order_id: order.id, p_admin_notes: reason.trim() });
    if (rpcError) setError(rpcError.message);
    else { setMessage('Orden sin pago rechazada.'); await load(); }
    setBusyId(null);
  };

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-9">
          <div>
            <Badge variant="accent" className="mb-4">Human Bank Verification</Badge>
            <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white">Verificación Bancolombia</h1>
            <p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">El comprobante es evidencia presentada por el participante. La inversión solo se activa cuando Finance verifica de forma independiente el abono real en la cuenta Bancolombia e ingresa aquí la referencia observada.</p>
          </div>
          <Button onClick={() => void load()} variant="secondary" size="sm"><RefreshCw size={14}/> Actualizar</Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          <RailNote icon={<ShieldCheck size={15}/>} label="Comprobante ≠ pago" text="OCR o IA nunca puede aprobar una inversión." />
          <RailNote icon={<Landmark size={15}/>} label="Fuente de verdad" text="El movimiento visto realmente en Bancolombia." />
          <RailNote icon={<CheckCircle2 size={15}/>} label="Activación atómica" text="Confirmación humana → receipt → allocation → ledger → contrato." />
        </div>

        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[.04] p-4 mb-7 flex gap-3 text-xs text-amber-100/80 leading-relaxed">
          <TriangleAlert size={17} className="shrink-0 text-amber-300"/>
          <span><strong className="text-amber-200">No confirmes por apariencia del comprobante.</strong> Abre Bancolombia por un canal independiente, ubica el abono real y copia la referencia bancaria desde el movimiento recibido.</span>
        </div>

        {(error || message) && <div className="rounded-xl border px-4 py-3 text-sm mb-6" style={{borderColor:error?'rgba(239,68,68,.28)':'rgba(201,169,98,.28)',background:error?'rgba(239,68,68,.05)':'rgba(201,169,98,.05)',color:error?'#fca5a5':'var(--accent)'}}>{error ?? message}</div>}

        {loadingOrders ? <p className="text-sm text-text-dim">Cargando órdenes...</p> : orders.length === 0 ? <Card variant="bordered" padding="lg"><p className="text-sm text-text-dim">No hay órdenes pendientes de transferencia o verificación bancaria.</p></Card> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">{orders.map((order) => {
          const draft = drafts[order.id] ?? freshDraft(order.capital_required_cents);
          const awaitingVerification = order.status === 'PENDING_BANK_VERIFICATION';
          return <Card key={order.id} variant="bordered" padding="lg">
            <div className="flex justify-between gap-4 mb-5"><div><p className="text-white font-semibold">{order.lot?.beer_style ?? 'Lote'}</p><p className="text-[11px] text-text-dim mt-1 font-mono">{order.lot?.code ?? order.lot_id}</p></div><span className="text-[9px] uppercase tracking-[.12em] text-accent">{INVESTMENT_ORDER_STATUS_LABELS[order.status]}</span></div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-5">
              <Mini label="Cajas" value={String(order.case_equivalent_units)}/><Mini label="Capital exacto" value={formatCents(order.capital_required_cents)}/><Mini label="Método" value={order.payment_method ?? 'Pendiente'}/><Mini label="Proof SHA-256" value={order.payment_proof_sha256 ? `${order.payment_proof_sha256.slice(0,16)}…` : '—'}/>
            </div>

            {awaitingVerification ? <div className="space-y-4 border-t border-white/[.07] pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.16em] text-text-dim">Evidencia del participante</p><p className="text-xs text-text-muted mt-1">{order.payment_proof_original_name ?? 'Comprobante almacenado'}</p></div><Button onClick={() => void openProof(order)} variant="secondary" size="sm"><ExternalLink size={13}/> Ver comprobante</Button></div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs text-text-muted">Referencia observada en Bancolombia<input className="railInput mt-1.5" value={draft.bankReference} onChange={(event)=>patchDraft(order.id,{bankReference:event.target.value})} placeholder="Referencia del movimiento recibido"/></label>
                <label className="text-xs text-text-muted">Monto realmente recibido (COP)<input type="number" min="1" step="1" className="railInput mt-1.5" value={draft.receivedAmountCop} onChange={(event)=>patchDraft(order.id,{receivedAmountCop:event.target.value})}/></label>
              </div>
              <label className="block text-xs text-text-muted">Fecha/hora del abono en Bancolombia<input type="datetime-local" className="railInput mt-1.5" value={draft.bankReceivedAt} onChange={(event)=>patchDraft(order.id,{bankReceivedAt:event.target.value})}/></label>
              <label className="block text-xs text-text-muted">Notas de verificación<textarea className="railInput mt-1.5 min-h-20" value={draft.notes} onChange={(event)=>patchDraft(order.id,{notes:event.target.value})} placeholder="Opcional: detalle observado en el movimiento bancario"/></label>
              <div className="rounded-xl border border-white/[.06] p-3 text-[11px] text-text-dim leading-relaxed">Al confirmar declaras que verificaste el abono real por un canal independiente. El backend rechazará montos diferentes y referencias bancarias reutilizadas.</div>
              <div className="flex flex-wrap gap-2"><Button onClick={() => void verify(order)} loading={busyId===order.id} variant="primary" size="sm">Confirmar dinero recibido</Button><Button onClick={() => void rejectProof(order)} disabled={busyId===order.id} variant="secondary" size="sm">Rechazar comprobante</Button></div>
            </div> : <div className="border-t border-white/[.07] pt-4"><p className="text-xs text-text-dim mb-3">Esperando que el participante realice la transferencia Bancolombia y suba el comprobante.</p><Button onClick={() => void rejectUnpaid(order)} disabled={busyId===order.id} variant="secondary" size="sm">Rechazar orden</Button></div>}
          </Card>;
        })}</div>}
      </Container>
      <style jsx global>{`.railInput{width:100%;border-radius:11px;padding:10px 12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}.railInput:focus{border-color:rgba(201,169,98,.38)}`}</style>
    </section>
  );
}

function RailNote({icon,label,text}:{icon:React.ReactNode;label:string;text:string}){return <div className="rounded-xl border border-white/[.07] bg-white/[.018] p-4"><div className="text-accent mb-3">{icon}</div><p className="text-[9px] uppercase tracking-[.14em] text-text-dim">{label}</p><p className="text-xs text-text-muted mt-1.5 leading-relaxed">{text}</p></div>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-lg border border-white/[.07] bg-white/[.015] p-3"><p className="text-[9px] uppercase tracking-[.12em] text-text-dim">{label}</p><p className="text-xs text-white mt-1.5 break-all">{value}</p></div>}
