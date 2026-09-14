'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Archive, Beaker, CheckCircle2, FlaskConical, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type Stage = 'draft' | 'validated' | 'archived';
type CalculationType = 'fixed_points' | 'points_per_cop_block';

type PilotUnit = {
  id: string;
  code: string;
  name: string;
  source_domain: string;
  stage: Stage;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type RuleDraft = {
  id: string;
  pilot_unit_id: string;
  name: string;
  event_code: string;
  calculation_type: CalculationType;
  fixed_points: number | null;
  points_per_block: number | null;
  cop_block_cents: number | null;
  minimum_amount_cents: number;
  maximum_points_per_event: number | null;
  stage: Stage;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Simulation = {
  id: string;
  rule_id: string;
  input_amount_cents: number;
  calculated_points: number;
  calculation_snapshot: Record<string, unknown>;
  created_at: string;
};

type ControlPlanePayload = {
  phase: 'pilot_control_plane_v2';
  commercialStatus: 'inactive';
  ledgerEffects: false;
  units: PilotUnit[];
  rules: RuleDraft[];
  simulations: Simulation[];
};

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-accent/45';
const labelClass = 'mb-1.5 block text-[9px] font-medium uppercase tracking-[.14em] text-text-dim';

function copFromCents(cents: number) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.floor(cents / 100));
}

function stageLabel(stage: Stage) {
  if (stage === 'validated') return 'Validado para análisis';
  if (stage === 'archived') return 'Archivado';
  return 'Borrador';
}

async function requestControlPlane(body: Record<string, unknown>) {
  const response = await fetch('/api/admin/rewards/control-plane', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'No fue posible ejecutar la operación.');
  return payload;
}

export function RewardsPilotControlPlane() {
  const [data, setData] = useState<ControlPlanePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [calculationType, setCalculationType] = useState<CalculationType>('fixed_points');
  const [selectedRuleId, setSelectedRuleId] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/rewards/control-plane', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'No fue posible leer el control plane.');
      setData(payload as ControlPlanePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible leer el control plane.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const unitsById = useMemo(() => new Map((data?.units ?? []).map(unit => [unit.id, unit])), [data?.units]);
  const simulatableRules = useMemo(() => (data?.rules ?? []).filter(rule => rule.stage !== 'archived'), [data?.rules]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operación fallida.');
    } finally {
      setBusy(false);
    }
  }

  function createUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const formElement = event.currentTarget;
    void run(async () => {
      await requestControlPlane({
        action: 'create_unit',
        code: form.get('code'),
        name: form.get('name'),
        sourceDomain: form.get('sourceDomain'),
        notes: form.get('notes'),
      });
      formElement.reset();
    }, 'Unidad piloto creada como borrador.');
  }

  function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const toCents = (value: FormDataEntryValue | null) => Math.round(Number(value || 0) * 100);
    const optionalNumber = (value: FormDataEntryValue | null) => value === null || value === '' ? null : Number(value);
    const formElement = event.currentTarget;

    void run(async () => {
      await requestControlPlane({
        action: 'create_rule',
        pilotUnitId: form.get('pilotUnitId'),
        name: form.get('name'),
        eventCode: form.get('eventCode'),
        calculationType,
        fixedPoints: calculationType === 'fixed_points' ? optionalNumber(form.get('fixedPoints')) : null,
        pointsPerBlock: calculationType === 'points_per_cop_block' ? optionalNumber(form.get('pointsPerBlock')) : null,
        copBlockCents: calculationType === 'points_per_cop_block' ? toCents(form.get('copBlockCop')) : null,
        minimumAmountCents: toCents(form.get('minimumAmountCop')),
        maximumPointsPerEvent: optionalNumber(form.get('maximumPointsPerEvent')),
        notes: form.get('notes'),
      });
      formElement.reset();
      setCalculationType('fixed_points');
    }, 'Regla creada en modo simulación.');
  }

  function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amountCop = Number(form.get('amountCop') ?? 0);
    void run(
      () => requestControlPlane({ action: 'simulate_rule', ruleId: selectedRuleId, inputAmountCents: Math.round(amountCop * 100) }),
      'Simulación registrada. Ningún saldo fue modificado.',
    );
  }

  function setStage(entity: 'unit' | 'rule', id: string, stage: Stage) {
    void run(
      () => requestControlPlane({ action: 'set_stage', entity, id, stage }),
      `Estado actualizado a ${stageLabel(stage).toLowerCase()}.`,
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))' }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-[9px] uppercase tracking-[.28em] text-accent">CTG Rewards · Pilot Control Plane v2</p>
            <h1 className="font-outfit text-3xl font-semibold sm:text-5xl">Economía antes de ejecución</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted">
              Diseña unidades candidatas, reglas y escenarios sin tocar saldos. Validado significa listo para análisis interno; nunca significa activo para usuarios.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading || busy}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </Button>
        </div>
      </header>

      <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[.055] p-5 text-sm text-amber-100">
        <div className="flex gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-300" />
          <div><strong>SIMULACIÓN — cero efectos de ledger.</strong><p className="mt-1 text-xs leading-relaxed text-amber-100/70">Esta superficie no crea puntos, no reserva beneficios, no redime, no mueve COP y no convierte a CTGO. Una fase y migración separadas serán obligatorias antes de cualquier piloto económico real.</p></div>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/[.06] px-4 py-3 text-sm text-red-300">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[.05] px-4 py-3 text-sm text-emerald-200">{notice}</div>}

      <section className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={createUnit} className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><Plus size={18} className="text-accent" /><div><p className="text-[9px] uppercase tracking-[.16em] text-accent">Participantes candidatos</p><h2 className="font-outfit text-xl font-semibold">Nueva unidad piloto</h2></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>Código</span><input name="code" required maxLength={48} placeholder="pisao" className={inputClass} /></label>
            <label><span className={labelClass}>Nombre</span><input name="name" required maxLength={100} placeholder="PISÁO Gastrobar" className={inputClass} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>Source domain</span><input name="sourceDomain" required maxLength={64} placeholder="pisao.purchase" className={inputClass} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>Notas</span><textarea name="notes" maxLength={600} rows={3} className={inputClass} placeholder="Hipótesis y alcance del candidato." /></label>
          </div>
          <Button type="submit" className="mt-5" disabled={busy}>Crear borrador</Button>
        </form>

        <form onSubmit={createRule} className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><FlaskConical size={18} className="text-accent" /><div><p className="text-[9px] uppercase tracking-[.16em] text-accent">Economía simulada</p><h2 className="font-outfit text-xl font-semibold">Nueva regla borrador</h2></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className={labelClass}>Unidad piloto</span><select name="pilotUnitId" required className={inputClass} defaultValue=""><option value="" disabled>Seleccionar unidad</option>{(data?.units ?? []).filter(u => u.stage !== 'archived').map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
            <label><span className={labelClass}>Nombre</span><input name="name" required maxLength={120} placeholder="Compra presencial base" className={inputClass} /></label>
            <label><span className={labelClass}>Evento</span><input name="eventCode" required maxLength={64} placeholder="purchase.completed" className={inputClass} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>Fórmula</span><select value={calculationType} onChange={event => setCalculationType(event.target.value as CalculationType)} className={inputClass}><option value="fixed_points">Puntos fijos</option><option value="points_per_cop_block">Puntos por bloque COP</option></select></label>
            {calculationType === 'fixed_points' ? <label><span className={labelClass}>Puntos fijos</span><input name="fixedPoints" required type="number" min="1" step="1" className={inputClass} /></label> : <><label><span className={labelClass}>Puntos por bloque</span><input name="pointsPerBlock" required type="number" min="1" step="1" className={inputClass} /></label><label><span className={labelClass}>Tamaño bloque (COP)</span><input name="copBlockCop" required type="number" min="1" step="1" className={inputClass} /></label></>}
            <label><span className={labelClass}>Compra mínima (COP)</span><input name="minimumAmountCop" type="number" min="0" step="1" defaultValue="0" className={inputClass} /></label>
            <label><span className={labelClass}>Tope puntos / evento</span><input name="maximumPointsPerEvent" type="number" min="1" step="1" className={inputClass} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>Notas</span><textarea name="notes" maxLength={600} rows={2} className={inputClass} /></label>
          </div>
          <Button type="submit" className="mt-5" disabled={busy || !(data?.units.length)}>Guardar regla de simulación</Button>
        </form>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3"><Beaker size={18} className="text-accent" /><div><p className="text-[9px] uppercase tracking-[.16em] text-accent">Scenario lab</p><h2 className="font-outfit text-xl font-semibold">Simular un evento</h2></div></div>
        <form onSubmit={simulate} className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <label><span className={labelClass}>Regla</span><select value={selectedRuleId} onChange={event => setSelectedRuleId(event.target.value)} required className={inputClass}><option value="">Seleccionar regla</option>{simulatableRules.map(rule => <option key={rule.id} value={rule.id}>{unitsById.get(rule.pilot_unit_id)?.name ?? 'Unidad'} · {rule.name}</option>)}</select></label>
          <label><span className={labelClass}>Monto hipotético (COP)</span><input name="amountCop" required type="number" min="0" step="1" className={inputClass} /></label>
          <Button type="submit" disabled={busy || !selectedRuleId}>Simular</Button>
        </form>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
          <h2 className="font-outfit text-xl font-semibold">Unidades candidatas</h2>
          <div className="mt-5 space-y-3">
            {(data?.units ?? []).length === 0 && <p className="text-sm text-text-dim">Aún no hay unidades piloto.</p>}
            {(data?.units ?? []).map(unit => <div key={unit.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-sm">{unit.name}</strong><p className="mt-1 font-mono text-[10px] text-text-dim">{unit.code} · {unit.source_domain}</p></div><span className="rounded-full border border-white/10 px-2 py-1 text-[8px] uppercase tracking-[.1em] text-accent">{stageLabel(unit.stage)}</span></div>{unit.notes && <p className="mt-3 text-xs leading-relaxed text-text-muted">{unit.notes}</p>}<div className="mt-3 flex gap-2">{unit.stage === 'draft' && <button onClick={() => setStage('unit', unit.id, 'validated')} className="text-[9px] text-emerald-300"><CheckCircle2 size={12} className="mr-1 inline" />Validar</button>}{unit.stage !== 'archived' && <button onClick={() => setStage('unit', unit.id, 'archived')} className="text-[9px] text-text-dim"><Archive size={12} className="mr-1 inline" />Archivar</button>}</div></div>)}
          </div>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
          <h2 className="font-outfit text-xl font-semibold">Reglas de simulación</h2>
          <div className="mt-5 space-y-3">
            {(data?.rules ?? []).length === 0 && <p className="text-sm text-text-dim">Aún no hay reglas.</p>}
            {(data?.rules ?? []).map(rule => <div key={rule.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-sm">{rule.name}</strong><p className="mt-1 text-[10px] text-text-dim">{unitsById.get(rule.pilot_unit_id)?.name ?? 'Unidad'} · {rule.event_code}</p></div><span className="rounded-full border border-white/10 px-2 py-1 text-[8px] uppercase tracking-[.1em] text-accent">{stageLabel(rule.stage)}</span></div><p className="mt-3 text-xs text-text-muted">{rule.calculation_type === 'fixed_points' ? `${rule.fixed_points ?? 0} pts fijos` : `${rule.points_per_block ?? 0} pts por cada $${copFromCents(rule.cop_block_cents ?? 0)} COP`} · mínimo $${copFromCents(rule.minimum_amount_cents)} COP{rule.maximum_points_per_event ? ` · tope ${rule.maximum_points_per_event} pts` : ''}</p><div className="mt-3 flex gap-2">{rule.stage === 'draft' && <button onClick={() => setStage('rule', rule.id, 'validated')} className="text-[9px] text-emerald-300"><CheckCircle2 size={12} className="mr-1 inline" />Validar</button>}{rule.stage !== 'archived' && <button onClick={() => setStage('rule', rule.id, 'archived')} className="text-[9px] text-text-dim"><Archive size={12} className="mr-1 inline" />Archivar</button>}</div></div>)}
          </div>
        </article>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
        <h2 className="font-outfit text-xl font-semibold">Últimas simulaciones</h2>
        <div className="mt-5 divide-y divide-white/[.06]">
          {(data?.simulations ?? []).length === 0 && <p className="text-sm text-text-dim">Aún no hay simulaciones registradas.</p>}
          {(data?.simulations ?? []).map(sim => { const rule = data?.rules.find(item => item.id === sim.rule_id); return <div key={sim.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-xs">{rule?.name ?? 'Regla'}</strong><p className="mt-1 text-[10px] text-text-dim">Escenario ${copFromCents(sim.input_amount_cents)} COP · {new Date(sim.created_at).toLocaleString()}</p></div><div className="text-left sm:text-right"><strong className="font-outfit text-lg text-accent">{sim.calculated_points.toLocaleString()} pts</strong><p className="text-[9px] uppercase tracking-[.1em] text-text-dim">resultado hipotético</p></div></div>; })}
        </div>
      </section>
    </div>
  );
}
