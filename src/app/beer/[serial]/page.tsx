import React from 'react';
import { notFound } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { Container } from '@/components/ui';
import { Navbar } from '@/components/Navbar';
import { CheckCircle2, MapPin, PackageCheck, QrCode, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

type Trace = { serial_code:string; unit_number:number; bottle_status:string; current_location:string|null; packaged_at:string|null; sold_at:string|null; lot_code:string; beer_style:string; destination:string; lot_status:string; case_size_units:number };

export default async function BottleTracePage({params}:{params:{serial:string}}){
  if(!isSupabaseConfigured) notFound();
  const supabase=await createClient();
  const serial=decodeURIComponent(params.serial).trim().toUpperCase();
  const {data,error}=await supabase.rpc('get_public_bottle_trace',{p_serial_code:serial});
  if(error) return <TraceUnavailable serial={serial}/>;
  const trace=(Array.isArray(data)?data[0]:data) as Trace|undefined;
  if(!trace) notFound();

  return <div className="min-h-screen bg-[#050505] text-white"><Navbar/><main className="pt-28 pb-20"><Container>
    <div className="max-w-3xl mx-auto">
      <section className="rounded-[28px] border border-white/10 p-6 sm:p-9 relative overflow-hidden" style={{background:'linear-gradient(135deg,rgba(20,20,20,.97),rgba(8,8,8,.94))'}}>
        <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full border border-accent/10"/>
        <div className="relative"><div className="flex items-center gap-2 mb-5"><QrCode size={15} className="text-accent"/><p className="text-[9px] uppercase tracking-[.25em] text-accent">CTG Craft Beer · Unit Trace</p></div><h1 className="text-3xl sm:text-5xl font-outfit font-semibold">{trace.beer_style}</h1><p className="font-mono text-sm text-accent mt-3">{trace.serial_code}</p><p className="text-sm text-text-muted mt-4">Unidad #{trace.unit_number.toLocaleString('es-CO')} del lote {trace.lot_code}.</p></div>
      </section>

      <div className="grid sm:grid-cols-2 gap-4 mt-5">
        <TraceCard icon={<ShieldCheck/>} label="Autenticidad" value="Serial registrado" detail="Este identificador existe en el registro oficial de trazabilidad de CTG Craft Beer."/>
        <TraceCard icon={<PackageCheck/>} label="Estado de unidad" value={humanStatus(trace.bottle_status)} detail={trace.sold_at?`Venta registrada ${new Date(trace.sold_at).toLocaleDateString('es-CO')}`:'Trazabilidad operativa activa'}/>
        <TraceCard icon={<MapPin/>} label="Ubicación / destino" value={trace.current_location||trace.destination} detail={`Destino del lote: ${trace.destination}`}/>
        <TraceCard icon={<CheckCircle2/>} label="Lote" value={trace.lot_code} detail={`Estado del lote: ${humanStatus(trace.lot_status)}`}/>
      </div>

      <div className="rounded-2xl border border-white/[.08] p-5 mt-5 text-xs text-text-muted leading-relaxed" style={{background:'rgba(255,255,255,.018)'}}>La numeración individual permite rastrear esta unidad hasta su lote de producción. La información pública de trazabilidad no expone datos de inversionistas, clientes ni información financiera interna.</div>
    </div>
  </Container></main></div>;
}

function TraceCard({icon,label,value,detail}:{icon:React.ReactNode;label:string;value:string;detail:string}){return <div className="rounded-2xl border border-white/[.08] p-5" style={{background:'linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012))'}}><div className="flex items-center gap-2 text-accent mb-4">{icon}<span className="text-[9px] uppercase tracking-[.17em]">{label}</span></div><p className="text-lg font-semibold">{value}</p><p className="text-xs text-text-muted mt-2 leading-relaxed">{detail}</p></div>}
function humanStatus(s:string){return s.replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase())}
function TraceUnavailable({serial}:{serial:string}){return <div className="min-h-screen bg-[#050505] text-white"><Navbar/><main className="pt-32"><Container><div className="max-w-xl mx-auto rounded-2xl border border-white/10 p-7"><p className="text-[9px] uppercase tracking-[.2em] text-accent">Traceability pending configuration</p><h1 className="text-2xl font-semibold mt-3">No pudimos consultar {serial}</h1><p className="text-sm text-text-muted mt-3">La interfaz está disponible, pero la migración de trazabilidad debe estar aplicada en Supabase antes de consultar seriales.</p></div></Container></main></div>}
