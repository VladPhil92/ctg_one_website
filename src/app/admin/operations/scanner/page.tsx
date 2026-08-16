'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Camera, CheckCircle2, ScanLine, ShoppingCart, Warehouse, Truck, Store, RotateCcw, AlertTriangle } from 'lucide-react';

type Lot = { id:string; code:string; beer_style:string; status:string };
type Bottle = { serial_code:string; status:string; current_location:string|null; lot_id:string };

type Action = 'WAREHOUSE'|'DISPATCHED'|'IN_MARKET'|'RETURNED'|'DAMAGED'|'LOST'|'EXPIRED'|'RECALLED'|'SOLD';

const ACTIONS: Array<{value:Action;label:string;icon:React.ReactNode}> = [
  {value:'WAREHOUSE',label:'Ingreso a bodega',icon:<Warehouse size={16}/>},
  {value:'DISPATCHED',label:'Despachar',icon:<Truck size={16}/>},
  {value:'IN_MARKET',label:'Recibir en punto',icon:<Store size={16}/>},
  {value:'RETURNED',label:'Devolución',icon:<RotateCcw size={16}/>},
  {value:'DAMAGED',label:'Dañada',icon:<AlertTriangle size={16}/>},
  {value:'LOST',label:'Pérdida',icon:<AlertTriangle size={16}/>},
  {value:'EXPIRED',label:'Vencida',icon:<AlertTriangle size={16}/>},
  {value:'RECALLED',label:'Retirada',icon:<AlertTriangle size={16}/>},
  {value:'SOLD',label:'Registrar venta',icon:<ShoppingCart size={16}/>},
];

function normalizeSerial(raw:string){
  const value = raw.trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'beer' && parts[1]) return decodeURIComponent(parts[1]).toUpperCase();
  } catch {}
  return value.toUpperCase();
}

export default function ScannerPage(){
  const supabase = useMemo(()=>createClient(),[]);
  const videoRef = useRef<HTMLVideoElement|null>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const timerRef = useRef<number|null>(null);
  const [lots,setLots]=useState<Lot[]>([]);
  const [lotId,setLotId]=useState('');
  const [serialInput,setSerialInput]=useState('');
  const [queue,setQueue]=useState<Bottle[]>([]);
  const [action,setAction]=useState<Action>('WAREHOUSE');
  const [location,setLocation]=useState('');
  const [unitPrice,setUnitPrice]=useState('18000');
  const [saleReference,setSaleReference]=useState('');
  const [cameraOn,setCameraOn]=useState(false);
  const [cameraSupported,setCameraSupported]=useState<boolean|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{
    void (async()=>{
      const {data,error}=await supabase.from('investment_production_lots').select('id,code,beer_style,status').order('created_at',{ascending:false});
      if(error){setError(error.message);return;}
      const rows=(data??[]) as Lot[]; setLots(rows); setLotId(rows[0]?.id??'');
    })();
    return ()=>stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[supabase]);

  const addSerial=async(raw:string)=>{
    const serial=normalizeSerial(raw);
    if(!serial||!lotId)return;
    setError(null); setMessage(null);
    if(queue.some(b=>b.serial_code===serial)) return;
    const {data,error}=await supabase.from('investment_bottle_units').select('serial_code,status,current_location,lot_id').eq('lot_id',lotId).eq('serial_code',serial).maybeSingle();
    if(error){setError(error.message);return;}
    if(!data){setError(`El serial ${serial} no pertenece al lote seleccionado.`);return;}
    setQueue(q=>[...q,data as Bottle]); setSerialInput('');
    if(navigator.vibrate) navigator.vibrate(70);
  };

  const stopCamera=()=>{
    if(timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current=null;
    streamRef.current?.getTracks().forEach(t=>t.stop()); streamRef.current=null;
    if(videoRef.current) videoRef.current.srcObject=null;
    setCameraOn(false);
  };

  const startCamera=async()=>{
    setError(null);
    try{
      const Detector=(window as unknown as {BarcodeDetector?:new(o:{formats:string[]})=>{detect:(source:HTMLVideoElement)=>Promise<Array<{rawValue:string}>>}}).BarcodeDetector;
      if(!Detector){setCameraSupported(false);setError('Este navegador no ofrece detección QR nativa. Puedes escribir o pegar el serial debajo.');return;}
      setCameraSupported(true);
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      streamRef.current=stream;
      if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play();}
      setCameraOn(true);
      const detector=new Detector({formats:['qr_code']});
      const scan=async()=>{
        if(!videoRef.current||!streamRef.current)return;
        try{
          const codes=await detector.detect(videoRef.current);
          if(codes[0]?.rawValue) await addSerial(codes[0].rawValue);
        }catch{}
        timerRef.current=window.setTimeout(scan,450);
      };
      timerRef.current=window.setTimeout(scan,500);
    }catch(e){setError(e instanceof Error?e.message:'No fue posible abrir la cámara.');stopCamera();}
  };

  const execute=async()=>{
    if(!lotId||queue.length===0)return;
    setBusy(true);setError(null);setMessage(null);
    const serials=queue.map(b=>b.serial_code);
    try{
      if(action==='SOLD'){
        const price=Math.round(Number(unitPrice)*100);
        if(!Number.isFinite(price)||price<=0) throw new Error('Ingresa un precio unitario válido.');
        const {error}=await supabase.rpc('record_bottle_sales',{p_lot_id:lotId,p_serial_codes:serials,p_unit_price_cents:price,p_sale_reference:saleReference.trim()||null,p_location:location.trim()||null});
        if(error) throw error;
      }else{
        const {error}=await supabase.rpc('update_bottle_units_status',{p_lot_id:lotId,p_serial_codes:serials,p_new_status:action,p_location:location.trim()||null});
        if(error) throw error;
      }
      setMessage(`${serials.length} unidad(es) procesadas correctamente.`); setQueue([]);
    }catch(e){setError(e instanceof Error?e.message:'No se pudo completar la operación.');}
    finally{setBusy(false);}
  };

  return <div className="space-y-6">
    <header className="rounded-[28px] border border-white/10 p-6 sm:p-8 relative overflow-hidden" style={{background:'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))'}}>
      <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full border border-accent/10"/>
      <div className="relative"><p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One · Mobile Operations</p><h1 className="text-3xl sm:text-5xl font-outfit font-semibold text-white">Bottle Scanner</h1><p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">Escanea el QR o serial de una botella y registra movimientos físicos o ventas sin tocar Supabase manualmente.</p></div>
    </header>

    {(message||error)&&<div className="rounded-xl border px-4 py-3 text-sm" style={{borderColor:error?'rgba(239,68,68,.3)':'rgba(34,197,94,.25)',background:error?'rgba(239,68,68,.06)':'rgba(34,197,94,.05)',color:error?'#fca5a5':'#86efac'}}>{error??message}</div>}

    <section className="grid grid-cols-1 xl:grid-cols-[.9fr_1.1fr] gap-5">
      <div className="rounded-2xl border border-white/10 p-5 bg-white/[.02]">
        <div className="flex items-center gap-3 mb-5"><ScanLine className="text-accent"/><div><p className="text-[9px] uppercase tracking-[.18em] text-text-dim">SCAN SOURCE</p><h2 className="text-xl font-outfit font-semibold">Captura</h2></div></div>
        <label className="adminLabel">Lote activo</label><select className="adminInput mb-4" value={lotId} onChange={e=>{setLotId(e.target.value);setQueue([])}}>{lots.map(l=><option key={l.id} value={l.id}>{l.code} · {l.beer_style}</option>)}</select>
        <div className="rounded-xl border border-white/[.08] overflow-hidden bg-black aspect-[4/3] flex items-center justify-center relative">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted/>
          {!cameraOn&&<div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"><Camera className="text-accent mb-3" size={28}/><p className="text-sm text-text-muted">Usa la cámara trasera para leer QR.</p></div>}
          {cameraOn&&<div className="absolute inset-5 border border-accent/35 rounded-xl pointer-events-none"><div className="absolute left-1/2 top-1/2 -translate-x-1/2 w-2/3 h-px bg-accent/60 shadow-[0_0_10px_rgba(201,169,98,.8)]"/></div>}
        </div>
        <div className="flex gap-2 mt-4">{cameraOn?<Button onClick={stopCamera} variant="secondary" size="sm">Detener cámara</Button>:<Button onClick={()=>void startCamera()} variant="primary" size="sm">Abrir cámara</Button>}</div>
        {cameraSupported===false&&<p className="text-[11px] text-text-dim mt-3">Fallback activo: ingreso manual de serial.</p>}
        <div className="mt-5"><label className="adminLabel">Serial o URL de trazabilidad</label><div className="flex gap-2"><input className="adminInput" value={serialInput} onChange={e=>setSerialInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void addSerial(serialInput)}}} placeholder="CTG-IRA-2026-001-000487"/><Button onClick={()=>void addSerial(serialInput)} variant="secondary" size="sm">Añadir</Button></div></div>
      </div>

      <div className="rounded-2xl border border-white/10 p-5 bg-white/[.02]">
        <p className="text-[9px] uppercase tracking-[.18em] text-text-dim">OPERATION QUEUE</p><h2 className="text-xl font-outfit font-semibold mt-1 mb-5">{queue.length} unidad(es) seleccionadas</h2>
        <div className="space-y-2 max-h-56 overflow-auto pr-1 mb-5">{queue.length===0?<p className="text-sm text-text-dim py-6 text-center">Escanea o agrega un serial para comenzar.</p>:queue.map(b=><div key={b.serial_code} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.07] px-3 py-3"><div><p className="text-xs font-mono text-white">{b.serial_code}</p><p className="text-[9px] uppercase tracking-[.12em] text-text-dim mt-1">{b.status}{b.current_location?` · ${b.current_location}`:''}</p></div><button onClick={()=>setQueue(q=>q.filter(x=>x.serial_code!==b.serial_code))} className="text-[10px] text-text-dim">Quitar</button></div>)}</div>
        <label className="adminLabel">Acción</label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">{ACTIONS.map(a=><button key={a.value} onClick={()=>setAction(a.value)} className="rounded-xl border px-3 py-3 text-left" style={{borderColor:action===a.value?'rgba(201,169,98,.35)':'rgba(255,255,255,.08)',background:action===a.value?'rgba(201,169,98,.06)':'rgba(255,255,255,.012)'}}><span className="text-accent">{a.icon}</span><span className="block text-[10px] mt-2 text-white">{a.label}</span></button>)}</div>
        <label className="adminLabel">Ubicación / punto</label><input className="adminInput mb-4" value={location} onChange={e=>setLocation(e.target.value)} placeholder="PISÁO Mall Plaza"/>
        {action==='SOLD'&&<div className="grid sm:grid-cols-2 gap-4 mb-4"><div><label className="adminLabel">Precio unitario COP</label><input className="adminInput" type="number" min="1" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)}/></div><div><label className="adminLabel">Referencia de venta</label><input className="adminInput" value={saleReference} onChange={e=>setSaleReference(e.target.value)} placeholder="POS-000123"/></div></div>}
        <Button onClick={()=>void execute()} loading={busy} disabled={queue.length===0} variant="primary" size="sm" fullWidth><CheckCircle2 size={15}/> Confirmar operación</Button>
      </div>
    </section>
    <style jsx global>{`.adminInput{width:100%;border-radius:12px;padding:11px 13px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}.adminInput:focus{border-color:rgba(201,169,98,.38)}.adminLabel{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.13em;color:var(--text-dim);margin-bottom:7px}`}</style>
  </div>;
}
