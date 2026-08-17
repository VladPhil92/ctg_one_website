'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { LOT_NEXT_STATUS, LOT_STATUS_LABELS, type InvestmentProductionLot, type LotStatus } from '@/types/investment';
import { Activity, Beer, Boxes, CircleDollarSign, Factory, PackageCheck, Plus, QrCode, RefreshCw, ScanLine, ShoppingCart } from 'lucide-react';

const UNIT_STATUS_OPTIONS = ['QC_APPROVED','WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED','DAMAGED','LOST','EXPIRED','RECALLED'] as const;
const FINANCIAL_TYPES = ['REVENUE','TAX','PRODUCTION_COST','COMMERCIAL_COST','ADJUSTMENT'] as const;
const BEER_STYLES = [
  { id:'irish-red-ale', name:'Irish Red Ale', prefix:'IRA' },
  { id:'porter', name:'Porter', prefix:'POR' },
  { id:'oktoberfest-hefeweizen', name:'Oktoberfest Hefeweizen', prefix:'HEF' },
] as const;

type BottleUnit = { id:string; lot_id:string; serial_code:string; unit_number:number; status:string; current_location:string|null; sold_at:string|null; sale_price_cents:number|null };

export default function OperationsAdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [lots, setLots] = useState<InvestmentProductionLot[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [bottles, setBottles] = useState<BottleUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);

  const selected = lots.find(l => l.id === selectedId) ?? lots[0] ?? null;

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: lotError } = await supabase.from('investment_production_lots').select('*').order('created_at', { ascending:false });
    if (lotError) setError(lotError.message);
    const rows = (data ?? []) as InvestmentProductionLot[];
    setLots(rows);
    setSelectedId(prev => prev || rows[0]?.id || '');
    setLoading(false);
  }, [supabase]);

  const refreshBottles = useCallback(async () => {
    const lotId = selectedId || lots[0]?.id;
    if (!lotId) { setBottles([]); return; }
    const { data } = await supabase.from('investment_bottle_units').select('id,lot_id,serial_code,unit_number,status,current_location,sold_at,sale_price_cents').eq('lot_id', lotId).order('unit_number', { ascending:false }).limit(250);
    setBottles((data ?? []) as BottleUnit[]);
  }, [selectedId, lots, supabase]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { void refreshBottles(); }, [refreshBottles]);

  const run = async (fn: () => Promise<{ error?: { message:string } | null }>, success:string) => {
    setBusy(true); setError(null); setMessage(null);
    try { const result = await fn(); if (result.error) throw new Error(result.error.message); setMessage(success); await refresh(); await refreshBottles(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación'); }
    finally { setBusy(false); }
  };

  const bottleCounts = bottles.reduce<Record<string,number>>((acc,b)=>{acc[b.status]=(acc[b.status]||0)+1; return acc;},{});
  const totalPhysicalCapacity = selected ? selected.total_cases * selected.case_size_units : 0;

  return <div className="space-y-8">
    <header className="rounded-[28px] border border-white/10 p-6 sm:p-8 relative overflow-hidden" style={{background:'linear-gradient(135deg,rgba(20,20,20,.97),rgba(8,8,8,.94))'}}>
      <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full border border-accent/10" />
      <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div><p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One Admin OS · Craft Beer</p><h1 className="text-3xl sm:text-5xl font-outfit font-semibold text-white">Production & Traceability OS</h1><p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">Opera lotes, estados de producción, serialización unitaria, inventario, ventas y hechos financieros desde una sola consola. Supabase permanece como fuente de verdad.</p></div>
        <Button onClick={()=>void refresh()} variant="secondary" size="sm"><RefreshCw size={14}/> Actualizar</Button>
      </div>
    </header>

    {(message || error) && <div className="rounded-xl border px-4 py-3 text-sm" style={{borderColor:error?'rgba(239,68,68,.3)':'rgba(201,169,98,.28)',background:error?'rgba(239,68,68,.06)':'rgba(201,169,98,.05)',color:error?'#fca5a5':'var(--accent)'}}>{error ?? message}</div>}

    <section className="grid grid-cols-1 xl:grid-cols-[.8fr_1.2fr] gap-5">
      <CreateLotPanel lots={lots} busy={busy} onCreate={(payload)=>run(async()=>supabase.rpc('create_production_lot', payload),'Lote creado correctamente.')} />
      <div className="rounded-2xl border border-white/10 p-5 sm:p-6" style={{background:'rgba(255,255,255,.02)'}}>
        <div className="flex items-center justify-between mb-5"><div><p className="micro">LOT REGISTRY</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Registro maestro de lotes</h2></div><Beer className="text-accent" size={19}/></div>
        {loading ? <p className="text-sm text-text-dim">Sincronizando lotes...</p> : lots.length===0 ? <p className="text-sm text-text-muted">Aún no hay lotes registrados.</p> : <div className="grid sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">{lots.map(l=><button key={l.id} onClick={()=>setSelectedId(l.id)} className="text-left rounded-xl border p-4 transition-colors" style={{borderColor:selected?.id===l.id?'rgba(201,169,98,.35)':'rgba(255,255,255,.08)',background:selected?.id===l.id?'rgba(201,169,98,.06)':'rgba(255,255,255,.015)'}}><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold text-white">{l.beer_style}</p><p className="text-[10px] font-mono text-text-dim mt-1">{l.code}</p></div><span className="text-[8px] uppercase tracking-[.12em] text-accent">{LOT_STATUS_LABELS[l.status]}</span></div><p className="text-[11px] text-text-muted mt-3">{l.total_cases} cajas · {l.case_size_units} und/caja · {l.destination}</p></button>)}</div>}
      </div>
    </section>

    {selected && <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={<Boxes size={15}/>} label="Capacidad física" value={`${totalPhysicalCapacity} und.`}/>
        <Metric icon={<QrCode size={15}/>} label="Serializadas" value={String(bottles.length)}/>
        <Metric icon={<PackageCheck size={15}/>} label="En mercado" value={String(bottleCounts.IN_MARKET || 0)}/>
        <Metric icon={<ShoppingCart size={15}/>} label="Vendidas" value={String(bottleCounts.SOLD || 0)}/>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <LotControlPanel lot={selected} busy={busy} onTransition={(next,notes)=>run(async()=>supabase.rpc('transition_lot_status',{p_lot_id:selected.id,p_new_status:next,p_notes:notes||null,p_evidence_document_id:null}),`Lote actualizado a ${LOT_STATUS_LABELS[next]}.`)} />
        <SerialGenerationPanel lot={selected} busy={busy} onGenerate={(quantity)=>run(async()=>supabase.rpc('generate_bottle_units',{p_lot_id:selected.id,p_quantity:quantity}),`${quantity} unidades serializadas.`)} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <UnitMovementPanel lot={selected} busy={busy} onMove={(serials,status,location)=>run(async()=>supabase.rpc('update_bottle_units_status',{p_lot_id:selected.id,p_serial_codes:serials,p_new_status:status,p_location:location||null}),`${serials.length} unidades actualizadas.`)} />
        <SalesPanel lot={selected} busy={busy} onSale={(serials,unitPriceCop,reference,location)=>run(async()=>supabase.rpc('record_bottle_sales',{p_lot_id:selected.id,p_serial_codes:serials,p_unit_price_cents:Math.round(unitPriceCop*100),p_sale_reference:reference||null,p_location:location||null}),`Venta registrada para ${serials.length} unidades.`)} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[.8fr_1.2fr] gap-5">
        <FinancialPanel lot={selected} busy={busy} onRecord={(type,amountCop,description)=>run(async()=>supabase.rpc('record_lot_financial_entry',{p_lot_id:selected.id,p_entry_type:type,p_amount_cents:Math.round(amountCop*100),p_description:description||null}),'Hecho financiero registrado.')} />
        <BottleRegistry bottles={bottles} />
      </section>
    </>}

    <style jsx global>{`.micro{font-size:9px;letter-spacing:.22em;color:var(--text-dim);font-weight:600}.adminPanel{background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012));border:1px solid rgba(255,255,255,.085);box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 18px 45px rgba(0,0,0,.2)}.adminInput{width:100%;border-radius:12px;padding:11px 13px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}.adminInput:focus{border-color:rgba(201,169,98,.38)}.adminLabel{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.13em;color:var(--text-dim);margin-bottom:7px}`}</style>
  </div>;
}

function CreateLotPanel({lots,busy,onCreate}:{lots:InvestmentProductionLot[];busy:boolean;onCreate:(p:Record<string,unknown>)=>void}){
  const [f,setF]=useState({beerId:'irish-red-ale',destination:'Cartagena',cases:'10',caseSize:'24',production:'7000',label:'900',ownPrice:'18000',b2bPrice:'10000',inc:'8',advertising:'3.5'});
  const style = BEER_STYLES.find(s=>s.id===f.beerId) ?? BEER_STYLES[0];
  const year = new Date().getFullYear();
  const nextSequence = useMemo(()=>{
    const re = new RegExp(`^CTG-${style.prefix}-${year}-(\\d{3})$`,'i');
    const used = lots.map(l=>re.exec(l.code)?.[1]).filter(Boolean).map(Number);
    return (used.length ? Math.max(...used) : 0) + 1;
  },[lots,style.prefix,year]);
  const code = `CTG-${style.prefix}-${year}-${String(nextSequence).padStart(3,'0')}`;
  const cases = Math.max(0,Number(f.cases)||0);
  const caseSize = Math.max(0,Number(f.caseSize)||0);
  const production = Math.max(0,Number(f.production)||0);
  const label = Math.max(0,Number(f.label)||0);
  const ownPrice = Math.max(0,Number(f.ownPrice)||0);
  const b2bPrice = Math.max(0,Number(f.b2bPrice)||0);
  const totalUnits = cases * caseSize;
  const baseUnitCost = production + label;
  const baseCaseCost = baseUnitCost * caseSize;
  const baseLotCost = baseUnitCost * totalUnits;
  const ownGross = ownPrice * totalUnits;
  const b2bGross = b2bPrice * totalUnits;
  const submit=(e:React.FormEvent)=>{e.preventDefault();onCreate({p_code:code,p_beer_style:style.name,p_destination:f.destination.trim(),p_total_cases:cases,p_case_size_units:caseSize,p_production_cost_unit_cents:Math.round(production*100),p_label_cost_unit_cents:Math.round(label*100),p_own_point_price_unit_cents:Math.round(ownPrice*100),p_b2b_price_unit_cents:Math.round(b2bPrice*100),p_inc_rate:Number(f.inc)/100,p_advertising_rate_on_pre_inc:Number(f.advertising)/100});};
  return <form onSubmit={submit} className="adminPanel rounded-2xl p-5 sm:p-6">
    <div className="flex items-center gap-3 mb-6"><div className="w-9 h-9 rounded-full border border-accent/20 text-accent flex items-center justify-center"><Plus size={16}/></div><div><p className="micro">NEW PRODUCTION LOT</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Crear lote</h2></div></div>
    <div className="grid sm:grid-cols-2 gap-4">
      <div><label className="adminLabel">Estilo</label><select className="adminInput" value={f.beerId} onChange={e=>setF({...f,beerId:e.target.value})}>{BEER_STYLES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <DerivedField label="Código de lote · automático" value={code} mono />
      <Field label="Destino" value={f.destination} onChange={v=>setF({...f,destination:v})}/>
      <Field label="Cajas" value={f.cases} onChange={v=>setF({...f,cases:v})} type="number"/>
      <Field label="Unidades/caja" value={f.caseSize} onChange={v=>setF({...f,caseSize:v})} type="number"/>
      <DerivedField label="Unidades totales" value={formatNumber(totalUnits)} />
      <Field label="Costo producción/unidad COP" value={f.production} onChange={v=>setF({...f,production:v})} type="number"/>
      <Field label="Etiqueta/unidad COP" value={f.label} onChange={v=>setF({...f,label:v})} type="number"/>
      <DerivedField label="Costo base/unidad" value={formatCop(baseUnitCost)} />
      <DerivedField label="Costo base/caja" value={formatCop(baseCaseCost)} />
      <DerivedField label="Capital base del lote" value={formatCop(baseLotCost)} />
      <div className="hidden sm:block" />
      <Field label="Precio propio/unidad COP" value={f.ownPrice} onChange={v=>setF({...f,ownPrice:v})} type="number"/>
      <DerivedField label="Venta propia bruta proyectada" value={formatCop(ownGross)} />
      <Field label="Precio B2B/unidad COP" value={f.b2bPrice} onChange={v=>setF({...f,b2bPrice:v})} type="number"/>
      <DerivedField label="Venta B2B bruta proyectada" value={formatCop(b2bGross)} />
      <Field label="INC %" value={f.inc} onChange={v=>setF({...f,inc:v})} type="number"/>
      <Field label="Publicidad % pre-INC" value={f.advertising} onChange={v=>setF({...f,advertising:v})} type="number"/>
    </div>
    <div className="mt-5 rounded-xl border border-accent/15 bg-accent/[.035] p-4"><p className="text-[9px] uppercase tracking-[.16em] text-accent">Modelo conectado</p><p className="text-[11px] text-text-muted mt-2 leading-relaxed">Cajas × unidades/caja determina la capacidad física. Los costos y proyecciones se recalculan en tiempo real; la RPC de creación conserva como autoridad los valores unitarios y tasas que ya usa Investment OS.</p></div>
    <Button type="submit" disabled={!cases||!caseSize||!style} loading={busy} variant="primary" size="sm" className="mt-5">Crear lote maestro</Button>
  </form>;
}

function LotControlPanel({lot,busy,onTransition}:{lot:InvestmentProductionLot;busy:boolean;onTransition:(s:LotStatus,n:string)=>void}){const [notes,setNotes]=useState('');const next=LOT_NEXT_STATUS[lot.status];return <div className="adminPanel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-3 mb-5"><Factory size={18} className="text-accent"/><div><p className="micro">PRODUCTION STATE MACHINE</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">{lot.code}</h2></div></div><div className="rounded-xl border border-white/[.07] p-4 mb-4"><p className="text-[9px] uppercase tracking-[.14em] text-text-dim">Estado actual</p><p className="text-lg text-accent font-semibold mt-2">{LOT_STATUS_LABELS[lot.status]}</p></div><label className="adminLabel">Nota operativa</label><textarea className="adminInput min-h-24" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ej. Densidad final validada, inicia fermentación..."/>{next?<Button onClick={()=>onTransition(next,notes)} loading={busy} variant="primary" size="sm" className="mt-4">Avanzar a {LOT_STATUS_LABELS[next]}</Button>:<p className="text-xs text-text-dim mt-4">No existe una transición estándar siguiente desde este estado.</p>}</div>}

function SerialGenerationPanel({lot,busy,onGenerate}:{lot:InvestmentProductionLot;busy:boolean;onGenerate:(q:number)=>void}){const [q,setQ]=useState(String(lot.total_cases*lot.case_size_units));return <div className="adminPanel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-3 mb-5"><ScanLine size={18} className="text-accent"/><div><p className="micro">UNIT SERIALIZATION</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Generar botellas</h2></div></div><p className="text-xs text-text-muted leading-relaxed mb-5">Genera seriales únicos del tipo <span className="font-mono text-accent">{lot.code}-000001</span>. Solo está habilitado durante embotellado, control de calidad o bodega.</p><Field label="Unidades a generar" value={q} onChange={setQ} type="number"/><Button onClick={()=>onGenerate(Number(q))} loading={busy} variant="primary" size="sm" className="mt-4">Generar seriales</Button></div>}

function UnitMovementPanel({lot,busy,onMove}:{lot:InvestmentProductionLot;busy:boolean;onMove:(s:string[],st:string,l:string)=>void}){const [serials,setSerials]=useState('');const [status,setStatus]=useState<string>('WAREHOUSE');const [location,setLocation]=useState('');const parsed=parseSerials(serials);return <div className="adminPanel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-3 mb-5"><Activity size={18} className="text-accent"/><div><p className="micro">PHYSICAL MOVEMENT</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Mover unidades</h2></div></div><label className="adminLabel">Seriales · uno por línea o separados por coma</label><textarea className="adminInput min-h-28 font-mono text-xs" value={serials} onChange={e=>setSerials(e.target.value)} placeholder={`${lot.code}-000001\n${lot.code}-000002`}/><div className="grid sm:grid-cols-2 gap-3 mt-4"><div><label className="adminLabel">Nuevo estado</label><select className="adminInput" value={status} onChange={e=>setStatus(e.target.value)}>{UNIT_STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select></div><Field label="Ubicación" value={location} onChange={setLocation} placeholder="Bodega CTG / PISÁO Mall Plaza"/></div><Button onClick={()=>onMove(parsed,status,location)} disabled={!parsed.length} loading={busy} variant="secondary" size="sm" className="mt-4">Actualizar {parsed.length} unidades</Button></div>}

function SalesPanel({lot,busy,onSale}:{lot:InvestmentProductionLot;busy:boolean;onSale:(s:string[],p:number,r:string,l:string)=>void}){const [serials,setSerials]=useState('');const [price,setPrice]=useState('18000');const [reference,setReference]=useState('');const [location,setLocation]=useState('');const parsed=parseSerials(serials);return <div className="adminPanel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-3 mb-5"><ShoppingCart size={18} className="text-accent"/><div><p className="micro">SALES RECOGNITION</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Registrar venta unitaria</h2></div></div><label className="adminLabel">Seriales vendidos</label><textarea className="adminInput min-h-28 font-mono text-xs" value={serials} onChange={e=>setSerials(e.target.value)} placeholder={`${lot.code}-000001, ${lot.code}-000002`}/><div className="grid sm:grid-cols-3 gap-3 mt-4"><Field label="Precio unidad COP" value={price} onChange={setPrice} type="number"/><Field label="Referencia" value={reference} onChange={setReference} placeholder="FV-1029"/><Field label="Punto de venta" value={location} onChange={setLocation} placeholder="PISÁO"/></div><p className="text-[10px] text-text-dim mt-3">La venta marca cada serial como SOLD y reconoce automáticamente el ingreso del lote. Impuestos y costos se registran aparte.</p><Button onClick={()=>onSale(parsed,Number(price),reference,location)} disabled={!parsed.length} loading={busy} variant="primary" size="sm" className="mt-4">Registrar {parsed.length} ventas</Button></div>}

function FinancialPanel({lot,busy,onRecord}:{lot:InvestmentProductionLot;busy:boolean;onRecord:(t:string,a:number,d:string)=>void}){const [type,setType]=useState<string>('PRODUCTION_COST');const [amount,setAmount]=useState('');const [description,setDescription]=useState('');return <div className="adminPanel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-3 mb-5"><CircleDollarSign size={18} className="text-accent"/><div><p className="micro">LOT FINANCIAL FACTS</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Hecho financiero</h2></div></div><div className="space-y-3"><div><label className="adminLabel">Tipo</label><select className="adminInput" value={type} onChange={e=>setType(e.target.value)}>{FINANCIAL_TYPES.map(t=><option key={t}>{t}</option>)}</select></div><Field label="Valor COP" value={amount} onChange={setAmount} type="number"/><Field label="Descripción" value={description} onChange={setDescription}/></div><Button onClick={()=>onRecord(type,Number(amount),description)} disabled={!Number(amount)} loading={busy} variant="secondary" size="sm" className="mt-4">Registrar</Button></div>}

function BottleRegistry({bottles}:{bottles:BottleUnit[]}){return <div className="adminPanel rounded-2xl p-5 sm:p-6 overflow-hidden"><div className="flex justify-between gap-4 mb-5"><div><p className="micro">SERIAL REGISTRY</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Últimas unidades</h2></div><QrCode className="text-accent" size={19}/></div>{bottles.length===0?<p className="text-sm text-text-muted">No hay botellas serializadas para este lote.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-text-dim border-b border-white/[.07]"><th className="py-3 pr-4">Serial</th><th className="py-3 pr-4">Estado</th><th className="py-3 pr-4">Ubicación</th><th className="py-3">Trace</th></tr></thead><tbody>{bottles.slice(0,60).map(b=><tr key={b.id} className="border-b border-white/[.045]"><td className="py-3 pr-4 font-mono text-white">{b.serial_code}</td><td className="py-3 pr-4 text-accent">{b.status}</td><td className="py-3 pr-4 text-text-muted">{b.current_location||'—'}</td><td className="py-3"><a className="text-accent hover:underline" href={`/beer/${encodeURIComponent(b.serial_code)}`} target="_blank">Abrir</a></td></tr>)}</tbody></table></div>}</div>}

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="adminPanel rounded-xl p-4"><div className="flex items-center gap-2 text-accent mb-3">{icon}<span className="micro">{label}</span></div><p className="text-xl font-semibold text-white">{value}</p></div>}
function Field({label,value,onChange,type='text',placeholder}:{label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string}){return <div><label className="adminLabel">{label}</label><input className="adminInput" type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></div>}
function DerivedField({label,value,mono=false}:{label:string;value:string;mono?:boolean}){return <div><label className="adminLabel">{label}</label><div className={`adminInput bg-white/[.012] text-text-muted ${mono?'font-mono text-xs':''}`}>{value}</div></div>}
function formatCop(value:number){return new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value||0)}
function formatNumber(value:number){return new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(value||0)}
function parseSerials(value:string){return [...new Set(value.split(/[\n,;\s]+/).map(s=>s.trim().toUpperCase()).filter(Boolean))];}