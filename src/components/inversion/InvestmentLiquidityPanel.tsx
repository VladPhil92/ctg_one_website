'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';
import type { InvestmentWithdrawalRequest } from '@/types/investment';
import type { InvestmentPayoutReconciliation } from '@/types/payment-rails';
import { Landmark, LockKeyhole, RefreshCw, WalletCards } from 'lucide-react';

type Props = {
  availableBalanceCents: number;
  withdrawals: InvestmentWithdrawalRequest[];
  onRefresh: () => Promise<void>;
};

type Destination = {
  bank_account_masked: string | null;
  payout_destination_fingerprint: string | null;
};

async function fingerprintFor(userId: string, masked: string) {
  const bytes = new TextEncoder().encode(`${userId}|${masked.trim().toUpperCase()}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function InvestmentLiquidityPanel({ availableBalanceCents, withdrawals, onRefresh }: Props) {
  const { userId } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [destination, setDestination] = useState<Destination>({ bank_account_masked: null, payout_destination_fingerprint: null });
  const [maskedDraft, setMaskedDraft] = useState('');
  const [amountCop, setAmountCop] = useState('');
  const [rails, setRails] = useState<Record<string, InvestmentPayoutReconciliation>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRailData = async () => {
    if (!userId) return;
    const [{ data: profile }, { data: reconciliation }] = await Promise.all([
      supabase
        .from('investment_participant_profiles')
        .select('bank_account_masked,payout_destination_fingerprint')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.rpc('get_investment_payout_reconciliation', { p_withdrawal_id: null }),
    ]);
    const next = (profile as Destination | null) ?? { bank_account_masked: null, payout_destination_fingerprint: null };
    setDestination(next);
    setMaskedDraft(next.bank_account_masked ?? '');
    const rows = (reconciliation ?? []) as InvestmentPayoutReconciliation[];
    setRails(Object.fromEntries(rows.map((row) => [row.withdrawal_request_id, row])));
  };

  useEffect(() => { void loadRailData(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDestination = async () => {
    if (!userId || maskedDraft.trim().length < 4) {
      setError('Escribe un destino enmascarado, por ejemplo Bancolombia ****1234.');
      return;
    }
    setBusy(true); setError(null); setMessage(null);
    const fingerprint = await fingerprintFor(userId, maskedDraft);
    const { error: rpcError } = await supabase.rpc('set_investment_payout_destination', {
      p_destination_masked: maskedDraft.trim(),
      p_destination_fingerprint: fingerprint,
    });
    if (rpcError) setError(rpcError.message);
    else {
      setMessage('Destino de payout registrado. CTG One conserva solo la referencia enmascarada.');
      await loadRailData();
    }
    setBusy(false);
  };

  const requestWithdrawal = async () => {
    const amount = Number(amountCop.replace(/[^0-9.]/g, ''));
    const cents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amount <= 0 || cents <= 0) {
      setError('Ingresa un monto de retiro válido.');
      return;
    }
    if (cents > availableBalanceCents) {
      setError('El monto supera tu saldo disponible para retirar.');
      return;
    }
    setBusy(true); setError(null); setMessage(null);
    const { error: rpcError } = await supabase.rpc('request_withdrawal', { p_amount_cents: cents });
    if (rpcError) setError(rpcError.message);
    else {
      setMessage('Solicitud de retiro creada. El saldo queda reservado hasta pago, rechazo o cancelación.');
      setAmountCop('');
      await Promise.all([onRefresh(), loadRailData()]);
    }
    setBusy(false);
  };

  const hasActiveWithdrawal = withdrawals.some((item) => ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PAYMENT_PROCESSING'].includes(item.status));
  const destinationReady = !!destination.bank_account_masked && !!destination.payout_destination_fingerprint;

  return (
    <section className="investment-panel rounded-[22px] p-5 sm:p-6 mb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-accent mb-2"><WalletCards size={15} /><p className="micro-label text-accent">Liquidity & Payout Rail</p></div>
          <h2 className="text-2xl font-outfit font-semibold">Saldo liquidado y retiros</h2>
          <p className="text-xs text-text-muted mt-2 max-w-2xl leading-relaxed">Los retiros se debitan únicamente cuando el payout queda confirmado por una referencia externa. Un payout fallido no reduce tu ledger.</p>
        </div>
        <div className="rounded-xl border border-accent/15 bg-accent/[.035] px-4 py-3 min-w-[190px]"><p className="micro-label">Disponible</p><p className="text-xl font-semibold text-accent mt-1">{formatCents(availableBalanceCents)}</p></div>
      </div>

      {(error || message) && <div className="rounded-lg border px-3 py-2 text-xs mb-5" style={{ borderColor: error ? 'rgba(239,68,68,.25)' : 'rgba(201,169,98,.25)', color: error ? '#fca5a5' : 'var(--accent)' }}>{error ?? message}</div>}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-white/[.07] p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4"><Landmark size={14} className="text-accent" /><p className="micro-label">Destino registrado</p></div>
          <label className="block text-xs text-text-muted">Referencia enmascarada
            <input className="railInput mt-1.5" value={maskedDraft} onChange={(e) => setMaskedDraft(e.target.value)} disabled={hasActiveWithdrawal} placeholder="Bancolombia ****1234" />
          </label>
          <p className="text-[10px] text-text-dim mt-2 leading-relaxed">No escribas el número completo de cuenta. El dato operativo real permanece en el proveedor financiero.</p>
          <Button onClick={() => void saveDestination()} disabled={hasActiveWithdrawal} loading={busy} variant="secondary" size="sm" className="mt-4"><LockKeyhole size={13} /> Guardar destino</Button>
          {hasActiveWithdrawal && <p className="text-[10px] text-amber-300/75 mt-2">El destino queda congelado mientras exista un retiro activo.</p>}
        </div>

        <div className="rounded-xl border border-white/[.07] p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4"><RefreshCw size={14} className="text-accent" /><p className="micro-label">Nueva solicitud</p></div>
          <label className="block text-xs text-text-muted">Monto COP
            <input className="railInput mt-1.5" inputMode="decimal" value={amountCop} onChange={(e) => setAmountCop(e.target.value)} placeholder="500000" />
          </label>
          <Button onClick={() => void requestWithdrawal()} disabled={!destinationReady || availableBalanceCents <= 0} loading={busy} variant="primary" size="sm" className="mt-4">Solicitar retiro</Button>
          {!destinationReady && <p className="text-[10px] text-amber-300/75 mt-2">Registra primero un destino de payout.</p>}
        </div>
      </div>

      {withdrawals.length > 0 && <div className="mt-6 border-t border-white/[.07] pt-5">
        <p className="micro-label mb-3">Historial de retiros</p>
        <div className="space-y-2">{withdrawals.slice(0, 8).map((withdrawal) => {
          const rail = rails[withdrawal.id];
          return <div key={withdrawal.id} className="grid grid-cols-[1fr_auto] gap-4 rounded-lg border border-white/[.055] px-3 py-3">
            <div><p className="text-xs text-white">{formatCents(withdrawal.amount_cents)}</p><p className="text-[9px] text-text-dim mt-1">{new Date(withdrawal.created_at).toLocaleString('es-CO')} · {rail?.provider_code ?? 'rail aún no iniciado'}</p></div>
            <div className="text-right"><p className="text-[9px] uppercase tracking-[.1em] text-accent">{withdrawal.status}</p><p className="text-[9px] text-text-dim mt-1">{rail?.payout_state ?? 'NOT_INITIATED'}</p></div>
          </div>;
        })}</div>
      </div>}
      <style jsx global>{`.railInput{width:100%;border-radius:11px;padding:10px 12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}.railInput:focus{border-color:rgba(201,169,98,.38)}.railInput:disabled{opacity:.45}`}</style>
    </section>
  );
}
