'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';
import { PAYMENT_INSTRUCTIONS_CONFIGURED, BANK_TRANSFER_INSTRUCTIONS, BRE_B_INSTRUCTIONS } from '@/lib/payment-instructions';
import type { InvestmentProductionLot, LotFundingSummary } from '@/types/investment';
import { Boxes, Check, CreditCard, FileCheck2, Minus, Plus, RadioTower, ShieldCheck, WalletCards } from 'lucide-react';

type PaymentMethod = 'bank_transfer' | 'pse' | 'bre_b_qr' | 'crypto';
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'Transferencia', pse: 'PSE', bre_b_qr: 'Bre-B / QR', crypto: 'Cripto',
};

export function InvestmentCheckoutClient({ lot, funding }: { lot: InvestmentProductionLot; funding: LotFundingSummary }) {
  const { userId, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState(Math.min(5, Math.max(1, funding.availableCasesEquivalent)));
  const [orderId, setOrderId] = useState<string | null>(null);
  const [capitalRequired, setCapitalRequired] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const capitalPerCase = useMemo(() => {
    const unit = (lot.production_cost_unit_cents ?? 0) + (lot.label_cost_unit_cents ?? 0);
    return unit * lot.case_size_units;
  }, [lot]);
  const estimate = capitalPerCase * cases;
  const displayCapital = orderId ? capitalRequired ?? estimate : estimate;
  const bottles = cases * lot.case_size_units;
  const capacityPercent = funding.totalCases > 0 ? Math.min(100, Math.round(((funding.allocatedCases + cases) / funding.totalCases) * 100)) : 0;

  if (!isLoading && !isAuthenticated) {
    router.replace(`/iniciar-sesion?next=/dashboard/inversion/nueva/${lot.code.toLowerCase()}`);
    return null;
  }
  if (isLoading || !userId) return <div className="rounded-2xl border border-white/10 p-6 text-sm text-text-dim">Sincronizando identidad y permisos...</div>;

  const setSafeCases = (next: number) => setCases(Math.max(1, Math.min(funding.availableCasesEquivalent, next || 1)));

  const createOrder = async () => {
    if (!accepted) { setError('Debes confirmar que entiendes las condiciones y riesgos antes de crear la orden.'); return; }
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
    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_.85fr] gap-5 items-start">
      <div className="space-y-5">
        <section className="rounded-[24px] border border-white/10 p-5 sm:p-7 relative overflow-hidden" style={{background:'linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018))',boxShadow:'inset 0 1px 0 rgba(255,255,255,.035),0 22px 55px rgba(0,0,0,.24)'}}>
          <div className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full border border-accent/10"/>
          <div className="relative">
            <div className="flex items-center justify-between gap-4 mb-7">
              <div><p className="text-[9px] uppercase tracking-[.24em] text-accent mb-2">01 · Position Builder</p><h2 className="text-2xl font-outfit font-semibold">Configura tu participación</h2></div>
              <div className="w-10 h-10 rounded-full border border-accent/20 flex items-center justify-center text-accent"><Boxes size={18}/></div>
            </div>

            <div className="rounded-2xl border border-white/[.08] p-4 sm:p-5 mb-5" style={{background:'rgba(0,0,0,.18)'}}>
              <div className="flex items-center justify-between gap-4 mb-4"><span className="text-xs text-text-muted">Cantidad de cajas</span><span className="text-[9px] uppercase tracking-[.15em] text-text-dim">máx. {funding.availableCasesEquivalent}</span></div>
              <div className="grid grid-cols-[48px_1fr_48px] gap-3 items-center">
                <button type="button" disabled={!!orderId || cases <= 1} onClick={() => setSafeCases(cases - 1)} className="h-12 rounded-xl border border-white/10 text-text-muted hover:text-accent disabled:opacity-30 flex items-center justify-center"><Minus size={16}/></button>
                <input type="number" min={1} max={funding.availableCasesEquivalent} value={cases} disabled={!!orderId} onChange={(e) => setSafeCases(Number(e.target.value))} className="h-12 text-center rounded-xl text-2xl font-outfit font-semibold text-white outline-none" style={{background:'rgba(255,255,255,.035)',border:'1px solid rgba(255,255,255,.08)'}} />
                <button type="button" disabled={!!orderId || cases >= funding.availableCasesEquivalent} onClick={() => setSafeCases(cases + 1)} className="h-12 rounded-xl border border-white/10 text-text-muted hover:text-accent disabled:opacity-30 flex items-center justify-center"><Plus size={16}/></button>
              </div>
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
              <p className="text-[10px] text-text-dim mt-2">La disponibilidad definitiva se vuelve a validar en servidor al crear la orden.</p>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-white/[.07] p-4 cursor-pointer mb-5" style={{background:'rgba(255,255,255,.018)'}}>
              <input type="checkbox" checked={accepted} disabled={!!orderId} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 accent-accent" />
              <span className="text-xs text-text-muted leading-relaxed">Entiendo que esta participación financia un equivalente productivo dentro de un lote físico y que los resultados dependen de producción, ventas, costos, impuestos y condiciones contractuales aplicables. No existe rentabilidad garantizada.</span>
            </label>

            {!orderId ? <Button onClick={createOrder} loading={busy} variant="primary" size="md" fullWidth>Crear orden y reservar cajas</Button> : <div className="rounded-xl border border-accent/20 p-4 flex items-center gap-3" style={{background:'rgba(201,169,98,.055)'}}><div className="w-8 h-8 rounded-full border border-accent/30 flex items-center justify-center text-accent"><Check size={15}/></div><div><p className="text-sm text-white font-medium">Orden creada</p><p className="text-[10px] text-text-dim mt-1 font-mono">{orderId}</p></div></div>}
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 p-5 sm:p-7" style={{background:'linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012))'}}>
          <div className="flex items-center gap-3 mb-5"><div className="w-9 h-9 rounded-full border border-accent/20 flex items-center justify-center text-accent"><ShieldCheck size={17}/></div><div><p className="text-[9px] uppercase tracking-[.22em] text-text-dim">Risk & Control</p><h3 className="text-base font-outfit font-semibold mt-1">Protecciones de la operación</h3></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-text-muted"><Control text="Cupo revalidado al crear la orden"/><Control text="Pago sujeto a verificación administrativa"/><Control text="Allocation solo después de pago aprobado"/></div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-24 space-y-5">
        <section className="rounded-[24px] border border-accent/20 p-5 sm:p-6 relative overflow-hidden" style={{background:'linear-gradient(150deg,rgba(201,169,98,.09),rgba(255,255,255,.018))',boxShadow:'0 22px 55px rgba(0,0,0,.25)'}}>
          <div className="flex items-center justify-between gap-4 mb-6"><div><p className="text-[9px] uppercase tracking-[.22em] text-accent mb-2">Order Summary</p><h2 className="text-xl font-outfit font-semibold">Resumen de inversión</h2></div><WalletCards size={20} className="text-accent"/></div>
          <div className="space-y-0 mb-6">
            <SummaryRow label="Lote" value={lot.code}/><SummaryRow label="Estilo" value={lot.beer_style}/><SummaryRow label="Destino" value={lot.destination}/><SummaryRow label="Cajas" value={String(cases)}/><SummaryRow label="Botellas equivalentes" value={String(bottles)}/><SummaryRow label="Capital requerido" value={formatCents(displayCapital)} strong/>
          </div>
          <div className="rounded-xl border border-white/[.07] p-4 text-[11px] text-text-dim leading-relaxed">El capital se calcula con el snapshot económico del lote configurado en la base de datos. Este resumen no es una promesa de retorno.</div>
        </section>

        <section className="rounded-[24px] border border-white/10 p-5 sm:p-6" style={{background:'rgba(255,255,255,.022)'}}>
          <div className="flex items-center gap-3 mb-5"><div className="w-9 h-9 rounded-full border border-accent/20 flex items-center justify-center text-accent"><CreditCard size={17}/></div><div><p className="text-[9px] uppercase tracking-[.22em] text-accent">02 · Settlement Input</p><h2 className="text-lg font-outfit font-semibold mt-1">Registrar pago</h2></div></div>

          {!orderId ? <div className="rounded-xl border border-white/[.07] p-4 text-xs text-text-dim">Primero crea la orden para fijar lote, cantidad y capital requerido.</div> : !PAYMENT_INSTRUCTIONS_CONFIGURED ? <div><div className="rounded-xl border border-white/[.07] p-4 text-xs text-text-muted leading-relaxed">La orden fue creada. Los canales de pago están temporalmente deshabilitados hasta validar instrucciones productivas.</div><Button href="/dashboard/inversion" variant="secondary" size="sm" fullWidth className="mt-4">Volver a mis inversiones</Button></div> : <>
            <div className="grid grid-cols-2 gap-2 mb-5">{(['bank_transfer','pse','bre_b_qr','crypto'] as PaymentMethod[]).map((m)=><button key={m} type="button" onClick={()=>setMethod(m)} className="rounded-xl px-3 py-3 text-[10px] uppercase tracking-[.1em] transition-colors" style={{background:method===m?'var(--accent)':'rgba(255,255,255,.025)',color:method===m?'#050505':'var(--text-muted)',border:'1px solid rgba(255,255,255,.08)'}}>{PAYMENT_LABELS[m]}</button>)}</div>
            {method==='bank_transfer'&&<InfoBox icon={<RadioTower size={14}/>} text={`${BANK_TRANSFER_INSTRUCTIONS.bankName} · ${BANK_TRANSFER_INSTRUCTIONS.accountType} · ${BANK_TRANSFER_INSTRUCTIONS.accountNumber}`}/>} 
            {method==='bre_b_qr'&&<InfoBox icon={<RadioTower size={14}/>} text={`Llave Bre-B: ${BRE_B_INSTRUCTIONS.key}`}/>} 
            <label className="block text-[10px] uppercase tracking-[.13em] text-text-dim mb-2">Referencia / hash</label>
            <input value={reference} onChange={(e)=>setReference(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none mb-4" style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)'}} />
            {method!=='crypto'&&<label className="block rounded-xl border border-dashed border-white/15 p-4 mb-5 cursor-pointer hover:border-accent/30 transition-colors"><div className="flex items-center gap-3"><FileCheck2 size={17} className="text-accent"/><div><p className="text-xs text-white">Adjuntar comprobante</p><p className="text-[10px] text-text-dim mt-1">Imagen o PDF · máx. 8 MB</p></div></div><input type="file" accept="image/*,application/pdf" onChange={(e)=>setProof(e.target.files?.[0]??null)} className="mt-3 w-full text-xs text-text-muted"/></label>}
            <Button onClick={submitPayment} loading={busy} variant="primary" size="md" fullWidth>Enviar pago a verificación</Button>
          </>}
          {error&&<div className="mt-4 rounded-xl border p-3 text-xs" style={{borderColor:'rgba(239,68,68,.25)',background:'rgba(239,68,68,.05)',color:'var(--error)'}}>{error}</div>}
        </section>
      </aside>
    </div>
  );
}

function Stat({label,value,accent=false}:{label:string;value:string;accent?:boolean}){return <div className="rounded-xl border border-white/[.07] p-3" style={{background:'rgba(255,255,255,.018)'}}><p className="text-[8px] uppercase tracking-[.14em] text-text-dim mb-2">{label}</p><p className={`text-sm font-semibold truncate ${accent?'text-accent':'text-white'}`}>{value}</p></div>}
function SummaryRow({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <div className="flex items-start justify-between gap-4 py-3 border-b border-white/[.06]"><span className="text-xs text-text-dim">{label}</span><span className={`text-right text-xs ${strong?'text-accent font-semibold':'text-white'}`}>{value}</span></div>}
function Control({text}:{text:string}){return <div className="flex items-start gap-2 rounded-xl border border-white/[.06] p-3"><Check size={13} className="text-accent shrink-0 mt-0.5"/><span>{text}</span></div>}
function InfoBox({icon,text}:{icon:React.ReactNode;text:string}){return <div className="flex items-start gap-3 rounded-xl border border-white/[.07] p-3 mb-4 text-xs text-text-muted"><span className="text-accent shrink-0 mt-0.5">{icon}</span><span>{text}</span></div>}
