'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';
import { investmentConfig } from '@/lib/investment/config';
import {
  INVESTMENT_BANK_TRANSFER_CONFIGURED,
  INVESTMENT_BANK_TRANSFER_INSTRUCTIONS,
  INVESTMENT_CRYPTO_CONFIGURED,
} from '@/lib/payment-instructions';
import {
  InvestmentCryptoDestination,
  InvestmentPaymentRailChoice,
} from '@/components/inversion/InvestmentPaymentRailChoice';
import { uploadInvestmentPaymentProof } from '@/modules/investment/checkout/browser-repository';
import type { InvestmentProductionLot } from '@/types/investment';
import { Check, Coins, FileCheck2, Landmark, QrCode, ShieldCheck, X } from 'lucide-react';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

type ResumedOrder = {
  id: string;
  case_equivalent_units: number;
  capital_required_cents: number;
};

export function InvestmentResumePaymentClient({
  lot,
  order,
}: {
  lot: InvestmentProductionLot;
  order: ResumedOrder;
}) {
  const [proof, setProof] = useState<File | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [rail, setRail] = useState<'bank_transfer' | 'crypto'>('bank_transfer');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const railConfigured = rail === 'crypto' ? INVESTMENT_CRYPTO_CONFIGURED : INVESTMENT_BANK_TRANSFER_CONFIGURED;

  const submitProof = async () => {
    if (!proof) return;
    if (!railConfigured) {
      setError(rail === 'crypto'
        ? 'La dirección de destino en cripto aún no está configurada en producción. La orden continúa reservada, pero no se aceptará evidencia hasta publicarla.'
        : 'El QR de Bancolombia aún no está configurado en producción. La orden continúa reservada, pero no se aceptará evidencia hasta publicar el QR aprobado.');
      return;
    }
    if (proof.size <= 0 || proof.size > MAX_FILE_BYTES) {
      setError('El comprobante debe pesar entre 1 byte y 8 MB.');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await uploadInvestmentPaymentProof({ orderId: order.id, proof, rail });
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo registrar el comprobante');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_.95fr] gap-5 items-start">
      <section className="rounded-[24px] border border-accent/20 p-5 sm:p-7" style={{background:'linear-gradient(145deg,rgba(201,169,98,.075),rgba(255,255,255,.016))'}}>
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-full border border-accent/25 flex items-center justify-center text-accent shrink-0"><Check size={17}/></div>
          <div>
            <p className="text-[9px] uppercase tracking-[.22em] text-accent">Orden existente</p>
            <h2 className="text-xl sm:text-2xl font-outfit font-semibold mt-1">Retoma tu transferencia</h2>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">No se creará una nueva reserva. Este flujo continúa exclusivamente sobre la orden existente validada por tu sesión.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Summary label="Orden" value={order.id} mono />
          <Summary label="Lote" value={lot.code} />
          <Summary label="Cajas reservadas" value={String(order.case_equivalent_units)} />
          <Summary label="Capital exacto" value={formatCents(order.capital_required_cents)} accent />
        </div>

        <div className="mt-5 rounded-xl border border-white/[.07] p-4 flex items-start gap-3 bg-black/20">
          <ShieldCheck size={16} className="text-accent shrink-0 mt-0.5"/>
          <p className="text-xs text-text-muted leading-relaxed">El comprobante es evidencia, no confirmación de fondos. La participación solo se activa cuando Finance verifica el abono directamente en Bancolombia.</p>
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 p-5 sm:p-6" style={{background:'rgba(255,255,255,.022)'}}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-full border border-accent/20 flex items-center justify-center text-accent">{rail === 'crypto' ? <Coins size={17}/> : <Landmark size={17}/>}</div>
          <div><p className="text-[9px] uppercase tracking-[.22em] text-accent">Transferencia pendiente</p><h2 className="text-lg font-outfit font-semibold mt-1">{rail === 'crypto' ? 'Cripto' : 'Bancolombia'}</h2></div>
        </div>

        {submitted ? (
          <div className="rounded-xl border border-accent/20 bg-accent/[.05] p-4">
            <p className="text-sm text-white font-medium">Comprobante recibido</p>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">La orden pasó a verificación humana. No envíes una segunda transferencia ni crees otra orden para el mismo aporte.</p>
            <Button href="/inversion/app" variant="secondary" size="sm" fullWidth className="mt-4">Volver a mis inversiones</Button>
          </div>
        ) : (
          <>
            <InvestmentPaymentRailChoice rail={rail} onChange={setRail} disabled={busy} />

            {rail === 'crypto' ? <InvestmentCryptoDestination amountLabel={formatCents(order.capital_required_cents)} /> : (
              <>
                <div className="rounded-xl border border-white/[.07] p-4 mb-4 text-xs text-text-muted leading-relaxed">
                  Transfiere exactamente <strong className="text-white">{formatCents(order.capital_required_cents)}</strong> a la cuenta de ahorros de {INVESTMENT_BANK_TRANSFER_INSTRUCTIONS.bankName}. No cambies el valor de la orden reservada.
                </div>

                <Button onClick={() => setShowQr(true)} disabled={!INVESTMENT_BANK_TRANSFER_CONFIGURED} variant="secondary" size="sm" fullWidth><QrCode size={14}/> Ver QR Bancolombia</Button>
                {!INVESTMENT_BANK_TRANSFER_CONFIGURED && <p className="text-[11px] text-amber-300/80 mt-2">El QR aprobado todavía no está publicado en la configuración productiva. La orden permanece reservada.</p>}
              </>
            )}

            <label className="block rounded-xl border border-dashed border-white/15 p-4 mt-5 mb-5 cursor-pointer hover:border-accent/30 transition-colors">
              <div className="flex items-center gap-3"><FileCheck2 size={17} className="text-accent"/><div><p className="text-xs text-white">Subir comprobante de esta orden</p><p className="text-[10px] text-text-dim mt-1">JPG, PNG, WEBP o PDF · máx. 8 MB</p></div></div>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setProof(event.target.files?.[0] ?? null)} className="mt-3 w-full text-xs text-text-muted"/>
            </label>
            {proof && <p className="text-[10px] text-text-dim mb-4 break-all">Archivo: {proof.name}</p>}
            <Button onClick={submitProof} disabled={!proof || !railConfigured} loading={busy} variant="primary" size="md" fullWidth>Enviar comprobante a verificación</Button>
          </>
        )}

        {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[.04] p-3 text-xs text-red-200" role="alert">{error}</div>}
      </section>

      {showQr && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="QR Bancolombia">
          <div className="relative w-full max-w-md rounded-[24px] border border-white/10 bg-[#0b0b0b] p-5 sm:p-6 shadow-2xl">
            <button type="button" aria-label="Cerrar QR" onClick={() => setShowQr(false)} className="absolute right-4 top-4 rounded-full border border-white/10 p-2 text-text-muted hover:text-white"><X size={16}/></button>
            <p className="text-[9px] uppercase tracking-[.2em] text-accent mb-2">Transferencia oficial</p>
            <h3 className="text-xl font-outfit font-semibold text-white">QR Bancolombia</h3>
            <p className="text-xs text-text-muted mt-2 mb-5">{INVESTMENT_BANK_TRANSFER_INSTRUCTIONS.bankName} · {INVESTMENT_BANK_TRANSFER_INSTRUCTIONS.accountType}</p>
            <div className="rounded-2xl bg-white p-4"><img src={INVESTMENT_BANK_TRANSFER_INSTRUCTIONS.qrImageUrl} alt={`QR oficial de la cuenta de ahorros Bancolombia para ${investmentConfig.programDisplayName}`} className="mx-auto block max-h-[360px] w-auto max-w-full"/></div>
            <p className="text-[11px] text-text-dim mt-4 leading-relaxed">Después de transferir, sube el comprobante en esta misma orden. No generes otra reserva.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({label,value,mono=false,accent=false}:{label:string;value:string;mono?:boolean;accent?:boolean}) {
  return <div className="rounded-xl border border-white/[.07] p-3 bg-black/15 min-w-0"><p className="text-[8px] uppercase tracking-[.14em] text-text-dim mb-2">{label}</p><p className={`text-xs sm:text-sm break-all ${mono?'font-mono ':''}${accent?'text-accent font-semibold':'text-white'}`}>{value}</p></div>;
}
