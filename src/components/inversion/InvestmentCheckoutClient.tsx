'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';
import { MIN_INVESTMENT_CASES } from '@/lib/investment/constants';
import {
  INVESTMENT_BANK_TRANSFER_CONFIGURED,
  INVESTMENT_BANK_TRANSFER_INSTRUCTIONS,
} from '@/lib/payment-instructions';
import {
  createInvestmentOrder,
  uploadInvestmentPaymentProof,
} from '@/modules/investment/checkout/browser-repository';
import {
  clampInvestmentCases,
  getCapitalPerCase,
  getProjectedLotCapacityPercent,
} from '@/modules/investment/checkout/domain';
import type { InvestmentProductionLot, LotFundingSummary } from '@/types/investment';
import { Boxes, Check, FileCheck2, Landmark, Minus, Plus, QrCode, ShieldCheck, X } from 'lucide-react';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export function InvestmentCheckoutClient({ lot, funding }: { lot: InvestmentProductionLot; funding: LotFundingSummary }) {
  const { userId, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const canInvest = funding.availableCasesEquivalent >= MIN_INVESTMENT_CASES;
  const initialCases = canInvest ? MIN_INVESTMENT_CASES : funding.availableCasesEquivalent;
  const [cases, setCases] = useState(initialCases);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [capitalRequired, setCapitalRequired] = useState<number | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const orderIdempotencyKey = useRef<string | null>(null);

  const capitalPerCase = getCapitalPerCase(lot);
  const estimate = capitalPerCase * cases;
  const displayCapital = orderId ? capitalRequired ?? estimate : estimate;
  const bottles = cases * lot.case_size_units;
  const capacityPercent = getProjectedLotCapacityPercent(cases, funding);

  if (!isLoading && !isAuthenticated) {
    router.replace(`/iniciar-sesion?next=/dashboard/inversion/nueva/${lot.code.toLowerCase()}`);
    return null;
  }
  if (isLoading || !userId) {
    return <div className="rounded-2xl border border-white/10 p-6 text-sm text-text-dim">Sincronizando identidad y permisos...</div>;
  }

  const setSafeCases = (next: number) => {
    if (!canInvest) return;
    setCases(clampInvestmentCases(next, funding));
  };

  const createOrder = async () => {
    if (!canInvest || cases < MIN_INVESTMENT_CASES) {
      setError(`La inversión mínima es de ${MIN_INVESTMENT_CASES} cajas.`);
      return;
    }
    if (!accepted) {
      setError('Debes confirmar que entiendes las condiciones y riesgos antes de crear la orden.');
      return;
    }
    setError(null); setBusy(true);
    try {
      const idempotencyKey = orderIdempotencyKey.current ?? crypto.randomUUID();
      orderIdempotencyKey.current = idempotencyKey;
      const order = await createInvestmentOrder({
        lotId: lot.id,
        cases,
        idempotencyKey,
      });
      setOrderId(order.id);
      setCapitalRequired(order.capital_required_cents);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'No se pudo crear la orden';
      setError(message.includes('KYC') ? 'Necesitas completar el KYC específico de inversión antes de participar.' : message);
    } finally { setBusy(false); }
  };

  const submitProof = async () => {
    if (!orderId || !proof) return;
    if (!INVESTMENT_BANK_TRANSFER_CONFIGURED) {
      setError('El QR de Bancolombia aún no está configurado en producción. La orden queda reservada, pero no se aceptará evidencia hasta publicar el QR aprobado.');
      return;
    }
    if (proof.size <= 0 || proof.size > MAX_FILE_BYTES) {
      setError('El comprobante debe pesar entre 1 byte y 8 MB.');
      return;
    }

    setError(null); setBusy(true);
    try {
      await uploadInvestmentPaymentProof({ orderId, proof });
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo registrar el comprobante');
    } finally { setBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_.85fr] gap-5 items-start">
      <div className="space-y-5">
        <section className="rounded-[24px] border border-white/10 p-5 sm:p-7 relative overflow-hidden" style={{background:'linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018))',boxShadow:'inset 0 1px 0 rgba(255,255,255,.035),0 22px 55px rgba(0,0,0,.24)'}}>
          <div className="flex items-center justify-between gap-4 mb-7">
            <div><p className="text-[9px] uppercase tracking-[.24em] text-accent mb-2">01 · Position Builder</p><h2 className="text-2xl font-outfit font-semibold">Configura tu participación</h2></div>
            <div className="w-10 h-10 rounded-full border border-accent/20 flex items-center justify-center text-accent"><Boxes size={18}/></div>
          </div>

          <div className="rounded-2xl border border-white/[.08] p-4 sm:p-5 mb-5" style={{background:'rgba(0,0,0,.18)'}}>
            <div className="flex items-center justify-between gap-4 mb-4"><span className="text-xs text-text-muted">Cantidad de cajas · mínimo {MIN_INVESTMENT_CASES}</span><span className="text-[9px] uppercase tracking-[.15em] text-text-dim">máx. {funding.availableCasesEquivalent}</span></div>
            <div className="grid grid-cols-[48px_1fr_48px] gap-3 items-center">
              <button type="button" disabled={!!orderId || !canInvest || cases <= MIN_INVESTMENT_CASES} onClick={() => setSafeCases(cases - 1)} className="h-12 rounded-xl border border-white/10 text-text-muted hover:text-accent disabled:opacity-30 flex items-center justify-center"><Minus size={16}/></button>
              <input type="number" min={MIN_INVESTMENT_CASES} max={funding.availableCasesEquivalent} value={cases} disabled={!!orderId || !canInvest} onChange={(event) => setSafeCases(Number(event.target.value))} className="h-12 text-center rounded-xl text-2xl font-outfit font-semibold text-white outline-none" style={{background:'rgba(255,255,255,.035)',border:'1px solid rgba(255,255,255,.08)'}} />
              <button type="button" disabled={!!orderId || !canInvest || cases >= funding.availableCasesEquivalent} onClick={() => setSafeCases(cases + 1)} className="h-12 rounded-xl border border-white/10 text-text-muted hover:text-accent disabled:opacity-30 flex items-center justify-center"><Plus size={16}/></button>
            </div>
            {!canInvest && <p className="mt-3 text-[11px] text-amber-300/80">Este lote tiene menos de {MIN_INVESTMENT_CASES} cajas disponibles y ya no admite una nueva inversión mínima.</p>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Stat label="Cajas" value={String(cases)} />
            <Stat label="Botellas eq." value={String(bottles)} />
            <Stat label="Capital/caja" value={formatCents(capitalPerCase)} />
            <Stat label="Capital total" value={formatCents(displayCapital)} accent />
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-[10px] uppercase tracking-[.13em] text-text-dim mb-2"><span>Capacidad proyectada del lote</span><span>{capacityPercent}%</span></div>
            <div className="h-1.5 rounded-full bg-white/[.05] overflow-hidden"><div className="h-full bg-accent rounded-full transition-all duration-300" style={{width:`${capacityPercent}%`}}/></div>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-white/[.07] p-4 cursor-pointer mb-5" style={{background:'rgba(255,255,255,.018)'}}>
            <input type="checkbox" checked={accepted} disabled={!!orderId || !canInvest} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 accent-accent" />
            <span className="text-xs text-text-muted leading-relaxed">Entiendo que esta participación financia un equivalente productivo dentro de un lote físico, que no existe rentabilidad garantizada y que la inversión solo se activa después de la verificación bancaria humana.</span>
          </label>

          {!orderId
            ? <Button onClick={createOrder} disabled={!canInvest} loading={busy} variant="primary" size="md" fullWidth>Crear orden y reservar cajas</Button>
            : <div className="rounded-xl border border-accent/20 p-4 flex items-center gap-3" style={{background:'rgba(201,169,98,.055)'}}><div className="w-8 h-8 rounded-full border border-accent/30 flex items-center justify-center text-accent"><Check size={15}/></div><div><p className="text-sm text-white font-medium">Orden creada</p><p className="text-[10px] text-text-dim mt-1 font-mono">{orderId}</p></div></div>}
        </section>

        <section className="rounded-[24px] border border-white/10 p-5 sm:p-7" style={{background:'linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012))'}}>
          <div className="flex items-center gap-3 mb-5"><ShieldCheck size={18} className="text-accent"/><div><p className="text-[9px] uppercase tracking-[.22em] text-text-dim">Control de fraude</p><h3 className="text-base font-outfit font-semibold mt-1">El comprobante no aprueba la inversión</h3></div></div>
          <div className="grid sm:grid-cols-3 gap-3 text-xs text-text-muted">
            <Control text="SHA-256 exacto para detectar reutilización del mismo archivo"/>
            <Control text="Finance verifica el abono directamente en Bancolombia"/>
            <Control text="Contrato y allocation nacen solo después de confirmación humana"/>
          </div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-24 space-y-5">
        <section className="rounded-[24px] border border-accent/20 p-5 sm:p-6" style={{background:'linear-gradient(150deg,rgba(201,169,98,.09),rgba(255,255,255,.018))'}}>
          <p className="text-[9px] uppercase tracking-[.22em] text-accent mb-2">Order Summary</p>
          <h2 className="text-xl font-outfit font-semibold mb-5">Resumen de inversión</h2>
          <SummaryRow label="Lote" value={lot.code}/><SummaryRow label="Estilo" value={lot.beer_style}/><SummaryRow label="Cajas" value={String(cases)}/><SummaryRow label="Capital requerido" value={formatCents(displayCapital)} strong/>
        </section>

        <section className="rounded-[24px] border border-white/10 p-5 sm:p-6" style={{background:'rgba(255,255,255,.022)'}}>
          <div className="flex items-center gap-3 mb-5"><div className="w-9 h-9 rounded-full border border-accent/20 flex items-center justify-center text-accent"><Landmark size={17}/></div><div><p className="text-[9px] uppercase tracking-[.22em] text-accent">02 · Transferencia</p><h2 className="text-lg font-outfit font-semibold mt-1">Bancolombia</h2></div></div>

          {!orderId ? <p className="text-xs text-text-dim">Primero crea la orden para fijar el valor exacto a transferir.</p> : submitted ? <div className="rounded-xl border border-accent/20 bg-accent/[.05] p-4"><p className="text-sm text-white font-medium">Comprobante recibido</p><p className="text-xs text-text-muted mt-2 leading-relaxed">Estado: <strong className="text-accent">pendiente de verificación bancaria humana</strong>. Ninguna IA ni lectura automática puede activar esta inversión.</p><Button href="/dashboard/inversion" variant="secondary" size="sm" fullWidth className="mt-4">Volver a mis inversiones</Button></div> : <>
            <div className="rounded-xl border border-white/[.07] p-4 mb-4 text-xs text-text-muted leading-relaxed">
              Transfiere exactamente <strong className="text-white">{formatCents(displayCapital)}</strong> a la cuenta de ahorros de {INVESTMENT_BANK_TRANSFER_INSTRUCTIONS.bankName}. Usa exclusivamente el QR oficial mostrado aquí.
            </div>

            <Button onClick={() => setShowQr(true)} disabled={!INVESTMENT_BANK_TRANSFER_CONFIGURED} variant="secondary" size="sm" fullWidth><QrCode size={14}/> Ver QR Bancolombia</Button>
            {!INVESTMENT_BANK_TRANSFER_CONFIGURED && <p className="text-[11px] text-amber-300/80 mt-2">El QR aprobado todavía no está publicado en la configuración productiva. La orden permanece reservada.</p>}

            <label className="block rounded-xl border border-dashed border-white/15 p-4 mt-5 mb-5 cursor-pointer hover:border-accent/30 transition-colors">
              <div className="flex items-center gap-3"><FileCheck2 size={17} className="text-accent"/><div><p className="text-xs text-white">Subir comprobante</p><p className="text-[10px] text-text-dim mt-1">JPG, PNG, WEBP o PDF · máx. 8 MB</p></div></div>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setProof(event.target.files?.[0] ?? null)} className="mt-3 w-full text-xs text-text-muted"/>
            </label>
            {proof && <p className="text-[10px] text-text-dim mb-4 break-all">Archivo: {proof.name}</p>}
            <Button onClick={submitProof} disabled={!proof || !INVESTMENT_BANK_TRANSFER_CONFIGURED} loading={busy} variant="primary" size="md" fullWidth>Enviar comprobante a verificación</Button>
          </>}
          {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[.04] p-3 text-xs text-red-200">{error}</div>}
        </section>
      </aside>

      {showQr && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="QR Bancolombia">
        <div className="relative w-full max-w-md rounded-[24px] border border-white/10 bg-[#0b0b0b] p-5 sm:p-6 shadow-2xl">
          <button type="button" aria-label="Cerrar QR" onClick={() => setShowQr(false)} className="absolute right-4 top-4 rounded-full border border-white/10 p-2 text-text-muted hover:text-white"><X size={16}/></button>
          <p className="text-[9px] uppercase tracking-[.2em] text-accent mb-2">Transferencia oficial</p>
          <h3 className="text-xl font-outfit font-semibold text-white">QR Bancolombia</h3>
          <p className="text-xs text-text-muted mt-2 mb-5">{INVESTMENT_BANK_TRANSFER_INSTRUCTIONS.bankName} · {INVESTMENT_BANK_TRANSFER_INSTRUCTIONS.accountType}</p>
          <div className="rounded-2xl bg-white p-4">
            {/* QR is an approved public payment asset configured outside source code. */}
            <img src={INVESTMENT_BANK_TRANSFER_INSTRUCTIONS.qrImageUrl} alt="QR oficial de la cuenta de ahorros Bancolombia para CTG Craft Beer Inversión" className="mx-auto block max-h-[360px] w-auto max-w-full" />
          </div>
          <p className="text-[11px] text-text-dim mt-4 leading-relaxed">Después de transferir, vuelve a esta ventana y sube el comprobante. El comprobante será tratado como evidencia, no como confirmación de fondos.</p>
        </div>
      </div>}
    </div>
  );
}

function Stat({label,value,accent=false}:{label:string;value:string;accent?:boolean}){return <div className="rounded-xl border border-white/[.07] p-3" style={{background:'rgba(255,255,255,.018)'}}><p className="text-[8px] uppercase tracking-[.14em] text-text-dim mb-2">{label}</p><p className={`text-sm font-semibold truncate ${accent?'text-accent':'text-white'}`}>{value}</p></div>}
function SummaryRow({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <div className="flex items-start justify-between gap-4 py-3 border-b border-white/[.06]"><span className="text-xs text-text-dim">{label}</span><span className={`text-right text-xs ${strong?'text-accent font-semibold':'text-white'}`}>{value}</span></div>}
function Control({text}:{text:string}){return <div className="flex items-start gap-2 rounded-xl border border-white/[.06] p-3"><Check size={13} className="text-accent shrink-0 mt-0.5"/><span>{text}</span></div>}
