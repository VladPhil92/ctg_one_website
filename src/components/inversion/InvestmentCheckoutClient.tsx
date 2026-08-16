'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui';
import { formatCents } from '@/lib/format';
import { PAYMENT_INSTRUCTIONS_CONFIGURED, BANK_TRANSFER_INSTRUCTIONS, BRE_B_INSTRUCTIONS } from '@/lib/payment-instructions';
import type { InvestmentProductionLot, LotFundingSummary } from '@/types/investment';

type PaymentMethod = 'bank_transfer' | 'pse' | 'bre_b_qr' | 'crypto';
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export function InvestmentCheckoutClient({ lot, funding }: { lot: InvestmentProductionLot; funding: LotFundingSummary }) {
  const { userId, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState(Math.min(5, Math.max(1, funding.availableCasesEquivalent)));
  const [orderId, setOrderId] = useState<string | null>(null);
  const [capitalRequired, setCapitalRequired] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const capitalPerCase = useMemo(() => {
    const unit = (lot.production_cost_unit_cents ?? 0) + (lot.label_cost_unit_cents ?? 0);
    return unit * lot.case_size_units;
  }, [lot]);
  const estimate = capitalPerCase * cases;

  if (!isLoading && !isAuthenticated) {
    router.replace(`/iniciar-sesion?next=/dashboard/inversion/nueva/${lot.code.toLowerCase()}`);
    return null;
  }
  if (isLoading || !userId) return <p className="text-sm text-text-dim">Cargando tu cuenta...</p>;

  const createOrder = async () => {
    setError(null); setBusy(true);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc('create_investment_order', {
        p_lot_id: lot.id,
        p_case_equivalent_units: cases,
      });
      if (rpcError) throw rpcError;
      const row = Array.isArray(data) ? data[0] : data;
      setOrderId(row.id);
      setCapitalRequired(row.capital_required_cents);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo crear la orden';
      setError(message.includes('KYC') ? 'Necesitas completar el KYC específico de inversión antes de participar.' : message);
    } finally { setBusy(false); }
  };

  const submitPayment = async () => {
    if (!orderId) return;
    if (!PAYMENT_INSTRUCTIONS_CONFIGURED) {
      setError('Los canales de pago aún no están habilitados en producción. Tu orden queda pendiente de pago.');
      return;
    }
    if (method !== 'crypto' && !proof) { setError('Sube el comprobante de pago.'); return; }
    if (proof && proof.size > MAX_FILE_BYTES) { setError('El comprobante debe pesar menos de 8MB.'); return; }
    if (method === 'crypto' && !reference.trim()) { setError('Ingresa el hash o referencia de la transacción.'); return; }

    setError(null); setBusy(true);
    try {
      const supabase = createClient();
      let proofPath: string | null = null;
      if (proof) {
        proofPath = `${userId}/investment-orders/${orderId}/${Date.now()}-${proof.name}`;
        const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(proofPath, proof);
        if (uploadError) throw uploadError;
      }
      const { error: rpcError } = await supabase.rpc('submit_investment_order_payment', {
        p_order_id: orderId,
        p_payment_method: method,
        p_payment_reference: reference.trim() || null,
        p_payment_proof_storage_path: proofPath,
      });
      if (rpcError) throw rpcError;
      router.push('/dashboard/inversion');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el pago');
    } finally { setBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_.8fr] gap-6">
      <Card variant="bordered" padding="lg">
        <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-2">Paso 1 · Participación</p>
        <h2 className="text-xl font-outfit font-semibold text-white mb-5">Elige cuántas cajas financiar</h2>
        <label className="block text-xs text-text-muted mb-2">Número de cajas</label>
        <input
          type="number" min={1} max={funding.availableCasesEquivalent} value={cases}
          disabled={!!orderId}
          onChange={(e) => setCases(Math.max(1, Math.min(funding.availableCasesEquivalent, Number(e.target.value) || 1)))}
          className="w-full rounded-lg px-4 py-3 text-white mb-5"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        />
        <div className="space-y-3 text-sm mb-6">
          <div className="flex justify-between"><span className="text-text-dim">Disponibles</span><span className="text-white">{funding.availableCasesEquivalent} cajas</span></div>
          <div className="flex justify-between"><span className="text-text-dim">Botellas equivalentes</span><span className="text-white">{cases * lot.case_size_units}</span></div>
          <div className="flex justify-between"><span className="text-text-dim">Capital requerido</span><span className="text-white font-semibold">{formatCents(orderId ? capitalRequired ?? estimate : estimate)}</span></div>
        </div>
        <p className="text-[11px] text-text-dim leading-relaxed mb-5">El capital se calcula con el snapshot de costos de producción y etiqueta configurado para este lote. No es una promesa de rentabilidad.</p>
        {!orderId && <Button onClick={createOrder} loading={busy} variant="primary" size="md" fullWidth>Crear orden de participación</Button>}
      </Card>

      <Card variant="bordered" padding="lg">
        <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-2">Paso 2 · Pago</p>
        <h2 className="text-xl font-outfit font-semibold text-white mb-5">Registrar pago</h2>
        {!orderId ? (
          <p className="text-sm text-text-dim">Primero crea la orden para fijar el lote, la cantidad y el capital requerido.</p>
        ) : !PAYMENT_INSTRUCTIONS_CONFIGURED ? (
          <div>
            <p className="text-sm text-text-muted leading-relaxed">La orden fue creada. Los canales de pago están temporalmente deshabilitados hasta que las instrucciones productivas sean verificadas.</p>
            <Button href="/dashboard/inversion" variant="secondary" size="sm" className="mt-5">Ver mis inversiones</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-5">
              {(['bank_transfer','pse','bre_b_qr','crypto'] as PaymentMethod[]).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)} className="px-3 py-2 rounded-lg text-[10px] uppercase tracking-[.1em]" style={{ backgroundColor: method === m ? 'var(--accent)' : 'var(--bg-tertiary)', color: method === m ? '#050505' : 'var(--text-muted)', border: '1px solid var(--border)' }}>{m.replaceAll('_',' ')}</button>
              ))}
            </div>
            {method === 'bank_transfer' && <p className="text-xs text-text-muted mb-4">{BANK_TRANSFER_INSTRUCTIONS.bankName} · {BANK_TRANSFER_INSTRUCTIONS.accountType} · {BANK_TRANSFER_INSTRUCTIONS.accountNumber}</p>}
            {method === 'bre_b_qr' && <p className="text-xs text-text-muted mb-4">Llave Bre-B: {BRE_B_INSTRUCTIONS.key}</p>}
            <label className="block text-xs text-text-muted mb-2">Referencia / hash</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} className="w-full rounded-lg px-4 py-3 text-white mb-4" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }} />
            {method !== 'crypto' && <input type="file" accept="image/*,application/pdf" onChange={(e) => setProof(e.target.files?.[0] ?? null)} className="w-full text-sm text-white mb-5" />}
            <Button onClick={submitPayment} loading={busy} variant="primary" size="md" fullWidth>Enviar pago a verificación</Button>
          </>
        )}
        {error && <p className="text-xs mt-4" style={{ color: 'var(--error)' }}>{error}</p>}
      </Card>
    </div>
  );
}
