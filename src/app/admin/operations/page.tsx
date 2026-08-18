'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  LOT_NEXT_STATUS,
  LOT_STATUS_LABELS,
  type InvestmentProductionLot,
  type LotStatus,
} from '@/types/investment';
import type { InvestmentBeerStyle } from '@/types/beer-style';
import {
  deriveLotMetrics,
  getStyleDefaults,
  hasCompleteStyleEconomics,
  lotCodePreview,
} from '@/lib/production/lot-config';
import {
  createOperationsBrowserRepository,
  type BottleUnit,
  type SalesChannel,
} from '@/modules/operations/infrastructure/browser-repository';
import {
  Activity,
  Beer,
  Boxes,
  CircleDollarSign,
  Factory,
  PackageCheck,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  ShoppingCart,
} from 'lucide-react';

const UNIT_STATUS_OPTIONS = [
  'QC_APPROVED',
  'WAREHOUSE',
  'DISPATCHED',
  'IN_MARKET',
  'RETURNED',
  'DAMAGED',
  'LOST',
  'EXPIRED',
  'RECALLED',
] as const;

// REVENUE and TAX are no longer manual facts. Sales OS writes both from the
// authoritative sale document so settlement can reconcile every commercial peso.
const FINANCIAL_TYPES = ['PRODUCTION_COST', 'COMMERCIAL_COST', 'ADJUSTMENT'] as const;

export default function OperationsAdminPage() {
  const operations = useMemo(() => createOperationsBrowserRepository(), []);
  const [lots, setLots] = useState<InvestmentProductionLot[]>([]);
  const [beerStyles, setBeerStyles] = useState<InvestmentBeerStyle[]>([]);
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [bottles, setBottles] = useState<BottleUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [stylesLoading, setStylesLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = lots.find((lot) => lot.id === selectedId) ?? lots[0] ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await operations.listLots();
      setLots(rows);
      setSelectedId((previous) => previous || rows[0]?.id || '');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los lotes');
      setLots([]);
    } finally {
      setLoading(false);
    }
  }, [operations]);

  const refreshStyles = useCallback(async () => {
    setStylesLoading(true);
    try {
      setBeerStyles(await operations.listBeerStyles());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar Beer Style Master Data');
      setBeerStyles([]);
    } finally {
      setStylesLoading(false);
    }
  }, [operations]);

  const refreshSalesChannels = useCallback(async () => {
    try {
      setSalesChannels(await operations.listSalesChannels());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los canales de venta');
      setSalesChannels([]);
    }
  }, [operations]);

  const refreshBottles = useCallback(async () => {
    const lotId = selectedId || lots[0]?.id;
    if (!lotId) {
      setBottles([]);
      return;
    }
    try {
      setBottles(await operations.listBottleUnits(lotId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar las unidades serializadas');
      setBottles([]);
    }
  }, [selectedId, lots, operations]);

  useEffect(() => {
    void refresh();
    void refreshStyles();
    void refreshSalesChannels();
  }, [refresh, refreshStyles, refreshSalesChannels]);

  useEffect(() => {
    void refreshBottles();
  }, [refreshBottles]);

  const run = async (
    fn: () => Promise<{ error?: { message: string } | null }>,
    success: string,
  ): Promise<boolean> => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await fn();
      if (result.error) throw new Error(result.error.message);
      setMessage(success);
      await Promise.all([refresh(), refreshStyles(), refreshSalesChannels()]);
      await refreshBottles();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la operación');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const bottleCounts = bottles.reduce<Record<string, number>>((acc, bottle) => {
    acc[bottle.status] = (acc[bottle.status] || 0) + 1;
    return acc;
  }, {});
  const totalPhysicalCapacity = selected ? selected.total_cases * selected.case_size_units : 0;

  return (
    <div className="space-y-8">
      <header
        className="rounded-[28px] border border-white/10 p-6 sm:p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,rgba(20,20,20,.97),rgba(8,8,8,.94))' }}
      >
        <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full border border-accent/10" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One Admin OS · Craft Beer</p>
            <h1 className="text-3xl sm:text-5xl font-outfit font-semibold text-white">Production & Traceability OS</h1>
            <p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">
              Opera lotes, estados de producción, serialización unitaria, inventario, ventas y hechos financieros desde una sola consola. Supabase permanece como fuente de verdad.
            </p>
          </div>
          <Button
            onClick={() => {
              void refresh();
              void refreshStyles();
              void refreshSalesChannels();
            }}
            variant="secondary"
            size="sm"
          >
            <RefreshCw size={14} /> Actualizar
          </Button>
        </div>
      </header>

      {(message || error) && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: error ? 'rgba(239,68,68,.3)' : 'rgba(201,169,98,.28)',
            background: error ? 'rgba(239,68,68,.06)' : 'rgba(201,169,98,.05)',
            color: error ? '#fca5a5' : 'var(--accent)',
          }}
        >
          {error ?? message}
        </div>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-[.8fr_1.2fr] gap-5">
        <CreateLotPanel
          styles={beerStyles}
          loading={stylesLoading}
          busy={busy}
          onCreate={(payload) =>
            run(
              async () => operations.createLot(payload),
              'Lote creado correctamente con snapshot económico persistido.',
            )
          }
          onSaveDefaults={(payload) =>
            run(
              async () => operations.saveBeerStyleEconomics(payload),
              'Presets económicos del estilo actualizados.',
            )
          }
        />

        <div className="rounded-2xl border border-white/10 p-5 sm:p-6" style={{ background: 'rgba(255,255,255,.02)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="micro">LOT REGISTRY</p>
              <h2 className="text-xl font-outfit font-semibold text-white mt-1">Registro maestro de lotes</h2>
            </div>
            <Beer className="text-accent" size={19} />
          </div>
          {loading ? (
            <p className="text-sm text-text-dim">Sincronizando lotes...</p>
          ) : lots.length === 0 ? (
            <p className="text-sm text-text-muted">Aún no hay lotes registrados.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {lots.map((lot) => (
                <button
                  key={lot.id}
                  onClick={() => setSelectedId(lot.id)}
                  className="text-left rounded-xl border p-4 transition-colors"
                  style={{
                    borderColor: selected?.id === lot.id ? 'rgba(201,169,98,.35)' : 'rgba(255,255,255,.08)',
                    background: selected?.id === lot.id ? 'rgba(201,169,98,.06)' : 'rgba(255,255,255,.015)',
                  }}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{lot.beer_style}</p>
                      <p className="text-[10px] font-mono text-text-dim mt-1">{lot.code}</p>
                    </div>
                    <span className="text-[8px] uppercase tracking-[.12em] text-accent">{LOT_STATUS_LABELS[lot.status]}</span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-3">{lot.total_cases} cajas · {lot.case_size_units} und/caja · {lot.destination}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {selected && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric icon={<Boxes size={15} />} label="Capacidad física" value={`${totalPhysicalCapacity} und.`} />
            <Metric icon={<QrCode size={15} />} label="Serializadas" value={String(bottles.length)} />
            <Metric icon={<PackageCheck size={15} />} label="En mercado" value={String(bottleCounts.IN_MARKET || 0)} />
            <Metric icon={<ShoppingCart size={15} />} label="Vendidas" value={String(bottleCounts.SOLD || 0)} />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <LotControlPanel
              lot={selected}
              busy={busy}
              onTransition={(next, notes) =>
                run(
                  async () => operations.transitionLot({
                    p_lot_id: selected.id,
                    p_new_status: next,
                    p_notes: notes || null,
                    p_evidence_document_id: null,
                  }),
                  `Lote actualizado a ${LOT_STATUS_LABELS[next]}.`,
                )
              }
            />
            <SerialGenerationPanel
              lot={selected}
              busy={busy}
              onGenerate={(quantity) =>
                run(
                  async () => operations.generateBottleUnits({ p_lot_id: selected.id, p_quantity: quantity }),
                  `${quantity} unidades serializadas.`,
                )
              }
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <UnitMovementPanel
              lot={selected}
              busy={busy}
              onMove={(serials, status, location) =>
                run(
                  async () => operations.updateBottleUnits({
                    p_lot_id: selected.id,
                    p_serial_codes: serials,
                    p_new_status: status,
                    p_location: location || null,
                  }),
                  `${serials.length} unidades actualizadas.`,
                )
              }
            />
            <SalesPanel
              lot={selected}
              channels={salesChannels}
              busy={busy}
              onSale={(payload) =>
                run(
                  async () => operations.recordBottleSale({
                    p_lot_id: selected.id,
                    p_serial_codes: payload.serials,
                    p_unit_price_cents: Math.round(payload.unitPriceCop * 100),
                    p_channel_code: payload.channelCode,
                    p_idempotency_key: payload.idempotencyKey,
                    p_sale_reference: payload.reference || null,
                    p_location: payload.location || null,
                    p_tax_cents: Math.round(payload.taxCop * 100),
                  }),
                  `Venta Sales OS registrada para ${payload.serials.length} unidades.`,
                )
              }
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[.8fr_1.2fr] gap-5">
            <FinancialPanel
              busy={busy}
              onRecord={(type, amountCop, description) =>
                run(
                  async () => operations.recordLotFinancialEntry({
                    p_lot_id: selected.id,
                    p_entry_type: type,
                    p_amount_cents: Math.round(amountCop * 100),
                    p_description: description || null,
                  }),
                  'Hecho financiero registrado.',
                )
              }
            />
            <BottleRegistry bottles={bottles} />
          </section>
        </>
      )}

      <style jsx global>{`
        .micro{font-size:9px;letter-spacing:.22em;color:var(--text-dim);font-weight:600}
        .adminPanel{background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012));border:1px solid rgba(255,255,255,.085);box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 18px 45px rgba(0,0,0,.2)}
        .adminInput{width:100%;border-radius:12px;padding:11px 13px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}
        .adminInput:focus{border-color:rgba(201,169,98,.38)}
        .adminLabel{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.13em;color:var(--text-dim);margin-bottom:7px}
      `}</style>
    </div>
  );
}

type LotEconomicsForm = {
  styleCode: string;
  destination: string;
  cases: string;
  caseSize: string;
  production: string;
  label: string;
  transport: string;
  ownPrice: string;
  b2bPrice: string;
  inc: string;
  advertising: string;
};

const toStringValue = (value: number | null) => (value == null ? '' : String(value));
const parsedNumber = (value: string) => (value.trim() === '' ? null : Number(value));

function draftFromStyle(style: InvestmentBeerStyle, current?: LotEconomicsForm): LotEconomicsForm {
  const defaults = getStyleDefaults(style);
  return {
    styleCode: style.code,
    destination: current?.destination ?? 'Cartagena',
    cases: current?.cases ?? '10',
    caseSize: toStringValue(defaults.caseSize),
    production: toStringValue(defaults.productionCostCop),
    label: toStringValue(defaults.labelCostCop),
    transport: toStringValue(defaults.transportCostCop),
    ownPrice: toStringValue(defaults.ownPriceCop),
    b2bPrice: toStringValue(defaults.b2bPriceCop),
    inc: toStringValue(defaults.incPercent),
    advertising: toStringValue(defaults.advertisingPercent),
  };
}

function CreateLotPanel({
  styles,
  loading,
  busy,
  onCreate,
  onSaveDefaults,
}: {
  styles: InvestmentBeerStyle[];
  loading: boolean;
  busy: boolean;
  onCreate: (payload: Record<string, unknown>) => void;
  onSaveDefaults: (payload: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState<LotEconomicsForm>({
    styleCode: '',
    destination: 'Cartagena',
    cases: '10',
    caseSize: '',
    production: '',
    label: '',
    transport: '',
    ownPrice: '',
    b2bPrice: '',
    inc: '',
    advertising: '',
  });
  const style = styles.find((item) => item.code === form.styleCode) ?? styles[0] ?? null;

  useEffect(() => {
    if (!styles.length) return;
    setForm((current) => (current.styleCode ? current : draftFromStyle(styles[0], current)));
  }, [styles]);

  const selectStyle = (code: string) => {
    const next = styles.find((item) => item.code === code);
    if (!next) {
      setForm({ ...form, styleCode: code });
      return;
    }
    setForm((current) => draftFromStyle(next, current));
  };

  const cases = parsedNumber(form.cases);
  const caseSize = parsedNumber(form.caseSize);
  const production = parsedNumber(form.production);
  const label = parsedNumber(form.label);
  const transport = parsedNumber(form.transport);
  const ownPrice = parsedNumber(form.ownPrice);
  const b2bPrice = parsedNumber(form.b2bPrice);
  const inc = parsedNumber(form.inc);
  const advertising = parsedNumber(form.advertising);

  const economicsValid =
    production != null && production >= 0 &&
    label != null && label >= 0 &&
    transport != null && transport >= 0 && production + label + transport > 0 &&
    ownPrice != null && ownPrice > 0 &&
    b2bPrice != null && b2bPrice > 0 &&
    inc != null && inc >= 0 && inc <= 100 &&
    advertising != null && advertising >= 0 && advertising <= 100;

  const lotValid =
    !!style && cases != null && cases > 0 && caseSize != null && caseSize > 0 &&
    economicsValid && form.destination.trim().length > 0;

  const metrics = deriveLotMetrics({
    cases: cases ?? 0,
    caseSize: caseSize ?? 0,
    productionCostCop: production ?? 0,
    labelCostCop: label ?? 0,
    transportCostCop: transport ?? 0,
    ownPriceCop: ownPrice ?? 0,
    b2bPriceCop: b2bPrice ?? 0,
  });
  const codePreview = lotCodePreview(style?.code);
  const masterConfigured = hasCompleteStyleEconomics(style);

  const economicsPayload = () => ({
    p_style_code: style?.code,
    p_production_cost_unit_cents: Math.round((production ?? 0) * 100),
    p_label_cost_unit_cents: Math.round((label ?? 0) * 100),
    p_transport_cost_unit_cents: Math.round((transport ?? 0) * 100),
    p_own_point_price_unit_cents: Math.round((ownPrice ?? 0) * 100),
    p_b2b_price_unit_cents: Math.round((b2bPrice ?? 0) * 100),
    p_inc_rate: (inc ?? 0) / 100,
    p_advertising_rate_on_pre_inc: (advertising ?? 0) / 100,
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!style || !lotValid || cases == null || caseSize == null) return;
    onCreate({
      ...economicsPayload(),
      p_style_code: style.code,
      p_destination: form.destination.trim(),
      p_total_cases: cases,
      p_case_size_units: caseSize,
      p_total_eligible_units: cases,
    });
  };

  const saveDefaults = () => {
    if (!style || !economicsValid) return;
    onSaveDefaults({ ...economicsPayload(), p_style_code: style.code });
  };

  return (
    <form onSubmit={submit} className="adminPanel rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-full border border-accent/20 text-accent flex items-center justify-center"><Plus size={16} /></div>
        <div><p className="micro">NEW PRODUCTION LOT</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Crear lote</h2></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="adminLabel">Estilo maestro</label>
          <select className="adminInput" value={style?.code ?? ''} disabled={loading || !styles.length} onChange={(event) => selectStyle(event.target.value)}>
            {loading ? <option>Cargando catálogo...</option> : styles.map((item) => <option key={item.id} value={item.code}>{item.name} · {item.code}</option>)}
          </select>
        </div>
        <DerivedField label="Código · asignado por base de datos" value={codePreview} mono />
        <Field label="Destino" value={form.destination} onChange={(value) => setForm({ ...form, destination: value })} />
        <Field label="Cajas" value={form.cases} onChange={(value) => setForm({ ...form, cases: value })} type="number" />
        <Field label="Unidades/caja" value={form.caseSize} onChange={(value) => setForm({ ...form, caseSize: value })} type="number" />
        <DerivedField label="Unidades totales" value={formatNumber(metrics.totalUnits)} />
        <Field label="Costo producción/unidad COP" value={form.production} onChange={(value) => setForm({ ...form, production: value })} type="number" />
        <Field label="Etiqueta/unidad COP" value={form.label} onChange={(value) => setForm({ ...form, label: value })} type="number" />
        <Field label="Transporte/unidad COP" value={form.transport} onChange={(value) => setForm({ ...form, transport: value })} type="number" />
        <DerivedField label="Costo base/unidad · producción + etiqueta + transporte" value={formatCop(metrics.baseUnitCost)} />
        <DerivedField label="Costo base/caja" value={formatCop(metrics.baseCaseCost)} />
        <DerivedField label="Capital base del lote" value={formatCop(metrics.baseLotCost)} />
        <Field label="Precio propio/unidad COP" value={form.ownPrice} onChange={(value) => setForm({ ...form, ownPrice: value })} type="number" />
        <DerivedField label="Venta propia bruta proyectada" value={formatCop(metrics.ownGross)} />
        <Field label="Precio B2B/unidad COP" value={form.b2bPrice} onChange={(value) => setForm({ ...form, b2bPrice: value })} type="number" />
        <DerivedField label="Venta B2B bruta proyectada" value={formatCop(metrics.b2bGross)} />
        <Field label="INC %" value={form.inc} onChange={(value) => setForm({ ...form, inc: value })} type="number" />
        <Field label="Publicidad % pre-INC" value={form.advertising} onChange={(value) => setForm({ ...form, advertising: value })} type="number" />
      </div>

      <div
        className="mt-5 rounded-xl border p-4"
        style={{
          borderColor: masterConfigured ? 'rgba(201,169,98,.22)' : 'rgba(245,158,11,.24)',
          background: masterConfigured ? 'rgba(201,169,98,.035)' : 'rgba(245,158,11,.035)',
        }}
      >
        <p className="text-[9px] uppercase tracking-[.16em] text-accent">Economics source of truth</p>
        <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
          {masterConfigured
            ? 'Los campos se cargaron desde los presets persistidos del estilo. Puedes ajustar el lote sin alterar esos presets; al crear, PostgreSQL congela producción, etiqueta, transporte, precios e impuestos como snapshot histórico.'
            : 'Este estilo aún no tiene presets económicos completos. No se insertan cifras de ejemplo: completa producción, etiqueta, transporte, precios e impuestos antes de crear el lote. Si son los parámetros estándar vigentes, puedes guardarlos como presets del estilo.'}
        </p>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <Button type="button" onClick={saveDefaults} disabled={!style || !economicsValid || loading} loading={busy} variant="secondary" size="sm">Guardar como presets del estilo</Button>
        <Button type="submit" disabled={!lotValid || loading} loading={busy} variant="primary" size="sm">Crear lote maestro</Button>
      </div>
    </form>
  );
}

function LotControlPanel({ lot, busy, onTransition }: { lot: InvestmentProductionLot; busy: boolean; onTransition: (status: LotStatus, notes: string) => void }) {
  const [notes, setNotes] = useState('');
  const next = LOT_NEXT_STATUS[lot.status];
  return (
    <div className="adminPanel rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5"><Factory size={18} className="text-accent" /><div><p className="micro">PRODUCTION STATE MACHINE</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">{lot.code}</h2></div></div>
      <div className="rounded-xl border border-white/[.07] p-4 mb-4"><p className="text-[9px] uppercase tracking-[.14em] text-text-dim">Estado actual</p><p className="text-lg text-accent font-semibold mt-2">{LOT_STATUS_LABELS[lot.status]}</p></div>
      <label className="adminLabel">Nota operativa</label>
      <textarea className="adminInput min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ej. Densidad final validada, inicia fermentación..." />
      {next ? <Button onClick={() => onTransition(next, notes)} loading={busy} variant="primary" size="sm" className="mt-4">Avanzar a {LOT_STATUS_LABELS[next]}</Button> : <p className="text-xs text-text-dim mt-4">No existe una transición estándar siguiente desde este estado.</p>}
    </div>
  );
}

function SerialGenerationPanel({ lot, busy, onGenerate }: { lot: InvestmentProductionLot; busy: boolean; onGenerate: (quantity: number) => void }) {
  const [quantity, setQuantity] = useState(String(lot.total_cases * lot.case_size_units));
  useEffect(() => setQuantity(String(lot.total_cases * lot.case_size_units)), [lot.id, lot.total_cases, lot.case_size_units]);
  return (
    <div className="adminPanel rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5"><ScanLine size={18} className="text-accent" /><div><p className="micro">UNIT SERIALIZATION</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Generar botellas</h2></div></div>
      <p className="text-xs text-text-muted leading-relaxed mb-5">Genera seriales únicos del tipo <span className="font-mono text-accent">{lot.code}-000001</span>. Solo está habilitado durante embotellado, control de calidad o bodega.</p>
      <Field label="Unidades a generar" value={quantity} onChange={setQuantity} type="number" />
      <Button onClick={() => onGenerate(Number(quantity))} loading={busy} variant="primary" size="sm" className="mt-4">Generar seriales</Button>
    </div>
  );
}

function UnitMovementPanel({ lot, busy, onMove }: { lot: InvestmentProductionLot; busy: boolean; onMove: (serials: string[], status: string, location: string) => void }) {
  const [serials, setSerials] = useState('');
  const [status, setStatus] = useState<string>('WAREHOUSE');
  const [location, setLocation] = useState('');
  const parsed = parseSerials(serials);
  return (
    <div className="adminPanel rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5"><Activity size={18} className="text-accent" /><div><p className="micro">PHYSICAL MOVEMENT</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Mover unidades</h2></div></div>
      <label className="adminLabel">Seriales · uno por línea o separados por coma</label>
      <textarea className="adminInput min-h-28 font-mono text-xs" value={serials} onChange={(event) => setSerials(event.target.value)} placeholder={`${lot.code}-000001\n${lot.code}-000002`} />
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <div><label className="adminLabel">Nuevo estado</label><select className="adminInput" value={status} onChange={(event) => setStatus(event.target.value)}>{UNIT_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        <Field label="Ubicación" value={location} onChange={setLocation} placeholder="Bodega CTG / PISÁO Mall Plaza" />
      </div>
      <Button onClick={() => onMove(parsed, status, location)} disabled={!parsed.length} loading={busy} variant="secondary" size="sm" className="mt-4">Actualizar {parsed.length} unidades</Button>
    </div>
  );
}

type SalePayload = {
  serials: string[];
  unitPriceCop: number;
  taxCop: number;
  channelCode: string;
  reference: string;
  location: string;
  idempotencyKey: string;
};

function browserIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `sale-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function SalesPanel({
  lot,
  channels,
  busy,
  onSale,
}: {
  lot: InvestmentProductionLot;
  channels: SalesChannel[];
  busy: boolean;
  onSale: (payload: SalePayload) => Promise<boolean>;
}) {
  const [serials, setSerials] = useState('');
  const [price, setPrice] = useState(String(lot.own_point_price_unit_cents / 100));
  const [tax, setTax] = useState('0');
  const [reference, setReference] = useState('');
  const [location, setLocation] = useState('');
  const [channelCode, setChannelCode] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const parsed = parseSerials(serials);

  useEffect(() => {
    setPrice(String(lot.own_point_price_unit_cents / 100));
  }, [lot.id, lot.own_point_price_unit_cents]);

  useEffect(() => {
    if (!channels.length) {
      setChannelCode('');
      return;
    }
    setChannelCode((current) => current || channels.find((channel) => channel.code === 'DIRECT')?.code || channels[0].code);
  }, [channels]);

  const submit = async () => {
    if (!parsed.length || !Number(price) || !channelCode) return;
    const key = idempotencyKey || browserIdempotencyKey();
    if (!idempotencyKey) setIdempotencyKey(key);

    const success = await onSale({
      serials: parsed,
      unitPriceCop: Number(price),
      taxCop: Math.max(0, Number(tax) || 0),
      channelCode,
      reference,
      location,
      idempotencyKey: key,
    });

    if (success) {
      setSerials('');
      setReference('');
      setTax('0');
      setIdempotencyKey(browserIdempotencyKey());
    }
  };

  return (
    <div className="adminPanel rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5"><ShoppingCart size={18} className="text-accent" /><div><p className="micro">SALES OS · IDEMPOTENT</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Registrar documento de venta</h2></div></div>
      <label className="adminLabel">Seriales vendidos</label>
      <textarea className="adminInput min-h-28 font-mono text-xs" value={serials} onChange={(event) => setSerials(event.target.value)} placeholder={`${lot.code}-000001, ${lot.code}-000002`} />
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <Field label="Precio unidad COP" value={price} onChange={setPrice} type="number" />
        <Field label="Impuesto reconocido COP" value={tax} onChange={setTax} type="number" />
        <div><label className="adminLabel">Canal</label><select className="adminInput" value={channelCode} onChange={(event) => setChannelCode(event.target.value)} disabled={!channels.length}>{channels.length ? channels.map((channel) => <option key={channel.id} value={channel.code}>{channel.name} · {channel.code}</option>) : <option>Sin canales disponibles</option>}</select></div>
        <Field label="Referencia" value={reference} onChange={setReference} placeholder="FV-1029" />
        <div className="sm:col-span-2"><Field label="Punto / ubicación" value={location} onChange={setLocation} placeholder="PISÁO Mall Plaza" /></div>
      </div>
      <p className="text-[10px] text-text-dim mt-3 leading-relaxed">
        Cada envío usa una llave de idempotencia estable durante reintentos. Sales OS crea el documento, vincula cada botella, cambia su estado a SOLD y reconoce REVENUE/TAX en la misma transacción. No vuelvas a enviar una venta fallida con datos diferentes hasta corregir el error.
      </p>
      <Button onClick={() => { void submit(); }} disabled={!parsed.length || !Number(price) || !channelCode} loading={busy} variant="primary" size="sm" className="mt-4">Registrar {parsed.length} ventas</Button>
    </div>
  );
}

function FinancialPanel({
  busy,
  onRecord,
}: {
  busy: boolean;
  onRecord: (type: string, amountCop: number, description: string) => void;
}) {
  const [type, setType] = useState<string>('PRODUCTION_COST');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  return (
    <div className="adminPanel rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5"><CircleDollarSign size={18} className="text-accent" /><div><p className="micro">LOT FINANCIAL FACTS</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Costo / ajuste financiero</h2></div></div>
      <div className="space-y-3">
        <div><label className="adminLabel">Tipo</label><select className="adminInput" value={type} onChange={(event) => setType(event.target.value)}>{FINANCIAL_TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
        <Field label="Valor COP" value={amount} onChange={setAmount} type="number" />
        <Field label="Descripción" value={description} onChange={setDescription} />
      </div>
      <p className="text-[10px] text-text-dim mt-3 leading-relaxed">REVENUE y TAX no se registran manualmente: nacen del documento de Sales OS para mantener reconciliación uno-a-uno antes del settlement.</p>
      <Button onClick={() => onRecord(type, Number(amount), description)} disabled={!Number(amount)} loading={busy} variant="secondary" size="sm" className="mt-4">Registrar</Button>
    </div>
  );
}

function BottleRegistry({ bottles }: { bottles: BottleUnit[] }) {
  return (
    <div className="adminPanel rounded-2xl p-5 sm:p-6 overflow-hidden">
      <div className="flex justify-between gap-4 mb-5"><div><p className="micro">SERIAL REGISTRY</p><h2 className="text-xl font-outfit font-semibold text-white mt-1">Últimas unidades</h2></div><QrCode className="text-accent" size={19} /></div>
      {bottles.length === 0 ? <p className="text-sm text-text-muted">No hay botellas serializadas para este lote.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-text-dim border-b border-white/[.07]"><th className="py-3 pr-4">Serial</th><th className="py-3 pr-4">Estado</th><th className="py-3 pr-4">Ubicación</th><th className="py-3">Trace</th></tr></thead><tbody>{bottles.slice(0, 60).map((bottle) => <tr key={bottle.id} className="border-b border-white/[.045]"><td className="py-3 pr-4 font-mono text-white">{bottle.serial_code}</td><td className="py-3 pr-4 text-accent">{bottle.status}</td><td className="py-3 pr-4 text-text-muted">{bottle.current_location || '—'}</td><td className="py-3"><a className="text-accent hover:underline" href={`/beer/${encodeURIComponent(bottle.serial_code)}`} target="_blank">Abrir</a></td></tr>)}</tbody></table></div>}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="adminPanel rounded-xl p-4"><div className="flex items-center gap-2 text-accent mb-3">{icon}<span className="micro">{label}</span></div><p className="text-xl font-semibold text-white">{value}</p></div>;
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <div><label className="adminLabel">{label}</label><input className="adminInput" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}

function DerivedField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><label className="adminLabel">{label}</label><div className={`adminInput bg-white/[.012] text-text-muted ${mono ? 'font-mono text-xs' : ''}`}>{value}</div></div>;
}

function formatCop(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value || 0);
}

function parseSerials(value: string) {
  return [...new Set(value.split(/[\n,;\s]+/).map((serial) => serial.trim().toUpperCase()).filter(Boolean))];
}
