'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { LocalQr } from '@/components/admin/LocalQr';
import { Download, Printer, QrCode, RefreshCw } from 'lucide-react';

type Lot = { id:string; code:string; beer_style:string; status:string };
type Bottle = { id:string; serial_code:string; unit_number:number; status:string };

const SITE_URL = 'https://ctgone.com';

export default function LabelsPage(){
  const supabase = useMemo(()=>createClient(),[]);
  const [lots,setLots]=useState<Lot[]>([]);
  const [lotId,setLotId]=useState('');
  const [bottles,setBottles]=useState<Bottle[]>([]);
  const [from,setFrom]=useState('1');
  const [to,setTo]=useState('48');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  const loadLots=useCallback(async()=>{
    setLoading(true);setError(null);
    const {data,error}=await supabase.from('investment_production_lots').select('id,code,beer_style,status').order('created_at',{ascending:false});
    if(error)setError(error.message);
    const rows=(data??[]) as Lot[];setLots(rows);setLotId(p=>p||rows[0]?.id||'');setLoading(false);
  },[supabase]);

  const loadBottles=useCallback(async()=>{
    if(!lotId){setBottles([]);return;}
    const {data,error}=await supabase.from('investment_bottle_units').select('id,serial_code,unit_number,status').eq('lot_id',lotId).order('unit_number',{ascending:true});
    if(error){setError(error.message);return;}
    setBottles((data??[]) as Bottle[]);
  },[lotId,supabase]);

  useEffect(()=>{void loadLots()},[loadLots]);
  useEffect(()=>{void loadBottles()},[loadBottles]);

  const lot=lots.find(l=>l.id===lotId);
  const visible=bottles.filter(b=>b.unit_number>=Math.max(1,Number(from)||1)&&b.unit_number<=Math.max(Number(from)||1,Number(to)||48));
  const traceUrl=(serial:string)=>`${SITE_URL}/beer/${encodeURIComponent(serial)}`;

  const exportCsv=()=>{
    if(!lot||visible.length===0)return;
    const lines=['lot_code,beer_style,unit_number,serial_code,status,trace_url',...visible.map(b=>[lot.code,lot.beer_style,b.unit_number,b.serial_code,b.status,traceUrl(b.serial_code)].map(v=>`"${String(v).replaceAll('"','""')}"`).join(','))];
    const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${lot.code}-label-manifest.csv`;a.click();URL.revokeObjectURL(url);
  };

  return <div className="space-y-6">
    <header className="no-print rounded-[28px] border border-white/10 p-6 sm:p-8" style={{background:'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))'}}>
      <p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One · Traceability</p>
      <h1 className="text-3xl sm:text-5xl font-outfit font-semibold">QR & Label Factory</h1>
      <p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">Genera manifiestos y hojas imprimibles a partir de botellas ya serializadas. Cada QR se construye localmente dentro de CTG One y contiene únicamente la URL pública de trazabilidad de la unidad.</p>
    </header>

    {error&&<div className="no-print rounded-xl border border-red-500/30 bg-red-500/[.06] text-red-300 px-4 py-3 text-sm">{error}</div>}

    <section className="no-print rounded-2xl border border-white/10 bg-white/[.02] p-5 sm:p-6 grid lg:grid-cols-[1fr_.45fr_.45fr_auto] gap-4 items-end">
      <div><label className="label">Lote</label><select className="input" value={lotId} onChange={e=>setLotId(e.target.value)} disabled={loading}><option value="">Selecciona lote</option>{lots.map(l=><option key={l.id} value={l.id}>{l.code} · {l.beer_style}</option>)}</select></div>
      <div><label className="label">Unidad inicial</label><input className="input" type="number" min="1" value={from} onChange={e=>setFrom(e.target.value)}/></div>
      <div><label className="label">Unidad final</label><input className="input" type="number" min="1" value={to} onChange={e=>setTo(e.target.value)}/></div>
      <Button variant="secondary" size="sm" onClick={()=>void loadBottles()}><RefreshCw size={14}/> Actualizar</Button>
    </section>

    <div className="no-print flex flex-wrap gap-3 items-center justify-between">
      <p className="text-xs text-text-dim">{visible.length} etiquetas seleccionadas · {bottles.length} unidades serializadas en el lote.</p>
      <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={exportCsv}><Download size={14}/> Manifiesto CSV</Button><Button variant="primary" size="sm" onClick={()=>window.print()}><Printer size={14}/> Imprimir etiquetas</Button></div>
    </div>

    {lot&&visible.length>0?<section className="label-sheet">
      {visible.map(b=><article key={b.id} className="beer-label">
        <div className="brand"><span>CTG</span><small>CRAFT BEER</small></div>
        <div className="qr-frame"><LocalQr value={traceUrl(b.serial_code)} size={82} title={`QR ${b.serial_code}`} /></div>
        <div className="label-copy"><strong>{lot.beer_style}</strong><span>{lot.code}</span><code>{b.serial_code}</code><small>UNIDAD {String(b.unit_number).padStart(6,'0')} · TRAZABILIDAD DIGITAL</small></div>
      </article>)}
    </section>:<div className="rounded-2xl border border-dashed border-white/10 py-16 text-center"><QrCode className="mx-auto text-text-dim mb-3"/><p className="text-sm text-text-muted">No hay botellas serializadas en el rango seleccionado.</p></div>}

    <p className="no-print text-[10px] text-text-dim leading-relaxed">Privacidad operativa: la matriz QR se genera en el navegador. No se envían seriales ni URLs de trazabilidad a un proveedor de renderizado externo. El manifiesto CSV conserva la relación serial/URL para impresión industrial u operación offline.</p>

    <style jsx global>{`.label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.13em;color:var(--text-dim);margin-bottom:7px}.input{width:100%;border-radius:12px;padding:11px 13px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}.label-sheet{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.beer-label{min-height:190px;border:1px solid rgba(201,169,98,.28);background:#080808;border-radius:14px;padding:14px;display:grid;grid-template-columns:94px 1fr;grid-template-rows:auto 1fr;gap:10px;color:#fff;break-inside:avoid}.brand{grid-column:1/-1;display:flex;align-items:baseline;gap:8px;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:8px}.brand span{font:700 18px/1 var(--font-outfit);color:#c9a962}.brand small{font-size:7px;letter-spacing:.22em;color:#888}.qr-frame{width:90px;height:90px;background:#fff;padding:4px;border-radius:8px;display:flex;align-items:center;justify-content:center}.qr-frame svg{width:82px;height:82px;display:block}.label-copy{display:flex;min-width:0;flex-direction:column;justify-content:center;gap:5px}.label-copy strong{font-size:12px}.label-copy span{font:9px/1.3 monospace;color:#c9a962}.label-copy code{font:8px/1.3 monospace;color:#aaa;word-break:break-all}.label-copy small{font-size:6px;letter-spacing:.09em;color:#666}@media(max-width:900px){.label-sheet{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.label-sheet{grid-template-columns:1fr}}@media print{body{background:#fff!important}.no-print,nav{display:none!important}.label-sheet{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:6mm!important}.beer-label{border:1px solid #999!important;background:#fff!important;color:#111!important;border-radius:0!important;min-height:48mm!important;padding:4mm!important;page-break-inside:avoid}.brand span,.label-copy span{color:#7b5b1d!important}.brand{border-color:#ddd!important}.label-copy code,.label-copy small,.brand small{color:#444!important}.qr-frame{border:1px solid #ddd!important}}
`}</style>
  </div>
}
