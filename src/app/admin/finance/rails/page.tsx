'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';
import type { InvestmentPayoutRail, InvestmentPayoutReconciliation } from '@/types/payment-rails';
import { ArrowDownToLine, CheckCircle2, RefreshCw, Send, ShieldAlert, WalletCards } from 'lucide-react';

type Withdrawal = {
  id: string;
  participant_user_id: string;
  amount_cents: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

type Destination = {
  user_id: string;
  bank_account_masked: string | null;
  payout_destination_fingerprint: string | null;
};

type Draft = {
  payoutRail: InvestmentPayoutRail;
  providerCode: string;
  idempotencyKey: string;
  externalReference: string;
  paidAt: string;
};

type RpcResult = PromiseLike<{ error: { message: string } | null }>;

const localNow = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const freshDraft = (): Draft => ({
  payoutRail: 'bank_transfer',
  providerCode: '',
  idempotencyKey: crypto.randomUUID(),
  externalReference: '',
  paidAt: localNow(),
});

export default function PaymentRailsAdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [destinations, setDestinations] = useState<Record<string, Destination>>({});
  const [reconciliation, setReconciliation] = useState<Record<string, InvestmentPayoutReconciliation>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [{ data: withdrawalData, error: withdrawalError }, { data: railData, error: railError }] = await Promise.all([
      supabase
        .from('investment_withdrawal_requests')
        .select('id,participant_user_id,amount_cents,status,admin_notes,created_at')
        .in('status', ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PAYMENT_PROCESSING', 'PAID'])
        .order('created_at', { ascending: false })
        .limit(60),
      supabase.rpc('get_investment_payout_reconciliation', { p_withdrawal_id: null }),
    ]);

    if (withdrawalError) {
      setError(withdrawalError.message);
      setLoading(false);
      return;
    }
    if (railError) setError(railError.message);

    const rows = (withdrawalData ?? []) as Withdrawal[];
    setWithdrawals(rows);
    setDrafts((current) => {
      const next = { ...current };
      for (const row of rows) if (!next[row.id]) next[row.id] = freshDraft();
      return next;
    });

    const userIds = [...new Set(rows.map((row) => row.participant_user_id))];
    if (userIds.length) {
      const { data: destinationData, error: destinationError } = await supabase
        .from('investment_participant_profiles')
        .select('user_id,bank_account_masked,payout_destination_fingerprint')
        .in('user_id', userIds);
      if (destinationError) setError(destinationError.message);
      else {
        const destinationRows = (destinationData ?? []) as Destination[];
        setDestinations(Object.fromEntries(destinationRows.map((row) => [row.user_id, row])));
      }
    } else {
      setDestinations({});
    }

    const railRows = (railData ?? []) as InvestmentPayoutReconciliation[];
    setReconciliation(Object.fromEntries(railRows.map((row) => [row.withdrawal_request_id, row])));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? freshDraft()), ...patch } }));
  };

  const run = async (id: string, fn: () => RpcResult, success: string) => {
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const result = await fn();
      if (result.error) throw new Error(result.error.message);
      setMessage(success);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la operación');
    } finally {
      setBusyId(null);
    }
  };

  const approve = (withdrawal: Withdrawal) => run(
    withdrawal.id,
    () => supabase.rpc('approve_withdrawal', { p_request_id: withdrawal.id }),
    'Retiro aprobado y reservado. Aún no se ha debitado el ledger.',
  );

  const initiate = (withdrawal: Withdrawal) => {
    const destination = destinations[withdrawal.participant_user_id];
    const draft = drafts[withdrawal.id] ?? freshDraft();
    if (!destination?.bank_account_masked || !destination.payout_destination_fingerprint) {
      setError('El participante no tiene destino de payout registrado.');
      return Promise.resolve();
    }
    if (!draft.providerCode.trim()) {
      setError('Debes indicar el proveedor/banco que procesará el payout.');
      return Promise.resolve();
    }
    return run(
      withdrawal.id,
      () => supabase.rpc('initiate_investment_payout', {
        p_request_id: withdrawal.id,
        p_payout_rail: draft.payoutRail,
        p_provider_code: draft.providerCode.trim(),
        p_destination_masked: destination.bank_account_masked,
        p_destination_fingerprint: destination.payout_destination_fingerprint,
        p_idempotency_key: draft.idempotencyKey,
        p_notes: null,
      }),
      'Payout iniciado. El retiro permanece reservado hasta confirmación externa.',
    );
  };

  const confirm = (withdrawal: Withdrawal) => {
    const rail = reconciliation[withdrawal.id];
    const draft = drafts[withdrawal.id] ?? freshDraft();
    if (!rail?.payout_id) {
      setError('No existe payout autoritativo para este retiro.');
      return Promise.resolve();
    }
    if (!draft.externalReference.trim() || !draft.paidAt) {
      setError('Referencia externa y fecha de pago son obligatorias.');
      return Promise.resolve();
    }
    const paidAt = new Date(draft.paidAt);
    if (Number.isNaN(paidAt.getTime())) {
      setError('Fecha de pago inválida.');
      return Promise.resolve();
    }
    return run(
      withdrawal.id,
      () => supabase.rpc('confirm_investment_payout', {
        p_payout_id: rail.payout_id,
        p_external_reference: draft.externalReference.trim(),
        p_paid_at: paidAt.toISOString(),
        p_notes: null,
      }),
      'Payout confirmado: retiro PAID y WITHDRAWAL_DEBIT registrados atómicamente.',
    );
  };

  const fail = (withdrawal: Withdrawal) => {
    const rail = reconciliation[withdrawal.id];
    if (!rail?.payout_id) return Promise.resolve();
    const reason = window.prompt('Motivo del fallo del payout');
    if (!reason?.trim()) return Promise.resolve();
    return run(
      withdrawal.id,
      () => supabase.rpc('fail_investment_payout', {
        p_payout_id: rail.payout_id,
        p_reason: reason.trim(),
        p_external_reference: null,
      }),
      'Payout fallido registrado sin débito. El retiro vuelve a APPROVED para reintento.',
    );
  };

  return (
    <div className="space-y-7">
      <header className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))' }}>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One · Finance OS</p>
            <h1 className="text-3xl sm:text-5xl font-outfit font-semibold">Payment & Payout Rails</h1>
            <p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">Control del dinero saliente: aprobación, instrucción de payout, confirmación externa y conciliación exacta contra ledger.</p>
          </div>
          <Button onClick={() => void load()} variant="secondary" size="sm"><RefreshCw size={14} /> Actualizar</Button>
        </div>
      </header>

      <section className="grid sm:grid-cols-4 gap-3">
        <Metric icon={<ArrowDownToLine size={15} />} label="Solicitados" value={withdrawals.filter((row) => row.status === 'REQUESTED').length} />
        <Metric icon={<WalletCards size={15} />} label="Aprobados" value={withdrawals.filter((row) => row.status === 'APPROVED').length} />
        <Metric icon={<Send size={15} />} label="Procesando" value={withdrawals.filter((row) => row.status === 'PAYMENT_PROCESSING').length} />
        <Metric icon={<CheckCircle2 size={15} />} label="Pagados" value={withdrawals.filter((row) => row.status === 'PAID').length} />
      </section>

      {(message || error) && (
        <div className="rounded-xl border px-4 py-3 text-sm" style={{
          borderColor: error ? 'rgba(239,68,68,.3)' : 'rgba(201,169,98,.28)',
          background: error ? 'rgba(239,68,68,.06)' : 'rgba(201,169,98,.05)',
          color: error ? '#fca5a5' : 'var(--accent)',
        }}>{error ?? message}</div>
      )}

      {loading ? (
        <p className="text-sm text-text-dim">Sincronizando payout rails...</p>
      ) : withdrawals.length === 0 ? (
        <div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-7"><p className="text-sm text-text-dim">No hay solicitudes de retiro en el rail.</p></div>
      ) : (
        <section className="grid lg:grid-cols-2 gap-5">
          {withdrawals.map((withdrawal) => (
            <WithdrawalCard
              key={withdrawal.id}
              withdrawal={withdrawal}
              destination={destinations[withdrawal.participant_user_id]}
              rail={reconciliation[withdrawal.id]}
              draft={drafts[withdrawal.id] ?? freshDraft()}
              busy={busyId === withdrawal.id}
              patchDraft={(patch) => patchDraft(withdrawal.id, patch)}
              onApprove={() => void approve(withdrawal)}
              onInitiate={() => void initiate(withdrawal)}
              onConfirm={() => void confirm(withdrawal)}
              onFail={() => void fail(withdrawal)}
            />
          ))}
        </section>
      )}
      <style jsx global>{`.railInput{width:100%;border-radius:11px;padding:10px 12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}.railInput:focus{border-color:rgba(201,169,98,.38)}.railLabel{display:block;font-size:10px;color:var(--text-muted)}`}</style>
    </div>
  );
}

function WithdrawalCard({ withdrawal, destination, rail, draft, busy, patchDraft, onApprove, onInitiate, onConfirm, onFail }: {
  withdrawal: Withdrawal;
  destination?: Destination;
  rail?: InvestmentPayoutReconciliation;
  draft: Draft;
  busy: boolean;
  patchDraft: (patch: Partial<Draft>) => void;
  onApprove: () => void;
  onInitiate: () => void;
  onConfirm: () => void;
  onFail: () => void;
}) {
  const destinationReady = !!destination?.bank_account_masked && !!destination?.payout_destination_fingerprint;

  return (
    <article className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[9px] uppercase tracking-[.16em] text-text-dim">Withdrawal</p>
          <p className="text-xl text-white font-semibold mt-1">{formatCents(withdrawal.amount_cents)}</p>
          <p className="text-[9px] font-mono text-text-dim mt-1">{withdrawal.id}</p>
        </div>
        <span className="rounded-full border border-accent/20 bg-accent/[.04] px-2.5 py-1 text-[8px] uppercase tracking-[.12em] text-accent">{withdrawal.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Mini label="Participante" value={withdrawal.participant_user_id.slice(0, 12)} />
        <Mini label="Destino" value={destination?.bank_account_masked ?? 'No registrado'} alert={!destinationReady} />
        <Mini label="Rail state" value={rail?.payout_state ?? 'NOT_INITIATED'} />
        <Mini label="Ref. externa" value={rail?.external_reference ?? '—'} />
      </div>

      {withdrawal.status === 'REQUESTED' && (
        <div className="border-t border-white/[.07] pt-4">
          <Button onClick={onApprove} disabled={!destinationReady} loading={busy} variant="primary" size="sm">Aprobar retiro</Button>
          {!destinationReady && <p className="text-[11px] text-amber-300/80 mt-2">El participante debe registrar primero un destino de payout.</p>}
        </div>
      )}

      {withdrawal.status === 'APPROVED' && (
        <div className="space-y-3 border-t border-white/[.07] pt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="railLabel">Rail
              <select className="railInput mt-1.5" value={draft.payoutRail} onChange={(event) => patchDraft({ payoutRail: event.target.value as InvestmentPayoutRail })}>
                <option value="bank_transfer">Bank transfer</option><option value="bre_b">Bre-B</option><option value="crypto">Crypto</option><option value="other">Other</option>
              </select>
            </label>
            <label className="railLabel">Proveedor / banco
              <input className="railInput mt-1.5" value={draft.providerCode} onChange={(event) => patchDraft({ providerCode: event.target.value })} placeholder="BANCOLOMBIA" />
            </label>
          </div>
          <Button onClick={onInitiate} disabled={!destinationReady} loading={busy} variant="primary" size="sm"><Send size={13} /> Iniciar payout</Button>
        </div>
      )}

      {withdrawal.status === 'PAYMENT_PROCESSING' && (
        <div className="space-y-3 border-t border-white/[.07] pt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="railLabel">Referencia confirmada
              <input className="railInput mt-1.5" value={draft.externalReference} onChange={(event) => patchDraft({ externalReference: event.target.value })} placeholder="PAYOUT-..." />
            </label>
            <label className="railLabel">Fecha/hora pagada
              <input type="datetime-local" className="railInput mt-1.5" value={draft.paidAt} onChange={(event) => patchDraft({ paidAt: event.target.value })} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onConfirm} loading={busy} variant="primary" size="sm"><CheckCircle2 size={13} /> Confirmar payout</Button>
            <Button onClick={onFail} disabled={busy} variant="secondary" size="sm"><ShieldAlert size={13} /> Registrar fallo</Button>
          </div>
        </div>
      )}

      {withdrawal.status === 'PAID' && (
        <div className="border-t border-white/[.07] pt-4 text-xs text-text-muted">Payout conciliado: {rail?.is_reconciled ? 'documento, confirmación y ledger coinciden.' : 'revisar mismatch de conciliación.'}</div>
      )}
    </article>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-xl border border-white/[.07] bg-white/[.018] p-4"><div className="text-accent mb-3">{icon}</div><p className="text-[9px] uppercase tracking-[.13em] text-text-dim">{label}</p><p className="text-xl font-semibold text-white mt-1">{value}</p></div>;
}

function Mini({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <div className="rounded-lg border border-white/[.06] p-3"><p className="text-[8px] uppercase tracking-[.12em] text-text-dim">{label}</p><p className={`text-xs mt-1.5 break-all ${alert ? 'text-amber-300/80' : 'text-white'}`}>{value}</p></div>;
}
