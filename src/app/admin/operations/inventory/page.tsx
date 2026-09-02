'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { callTrustedAdminRpc } from '@/lib/investment/trusted-admin-rpc-client';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Boxes, MapPin, RefreshCw, ShieldCheck, Warehouse } from 'lucide-react';

type InventoryLocation = {
  id: string;
  code: string;
  name: string;
  location_type: string;
  address: string | null;
  active: boolean;
  is_system: boolean;
};

type StockRow = {
  location_id: string | null;
  location_code: string;
  location_name: string;
  location_type: string;
  lot_id: string;
  lot_code: string;
  bottle_status: string;
  inventory_class: string;
  quantity_units: number;
};

type ReconciliationRow = {
  lot_id: string;
  lot_code: string;
  serialized_units: number;
  movement_events: number;
  movement_quantity_mismatches: number;
  bottles_without_history: number;
  canonical_location_gaps: number;
  location_mismatches: number;
  status_mismatches: number;
  sale_link_mismatches: number;
  is_reconciled: boolean;
};

const LOCATION_TYPES = [
  'PRODUCTION',
  'WAREHOUSE',
  'TRANSIT',
  'SALES_POINT',
  'PARTNER',
  'CUSTOMER',
  'QUARANTINE',
  'OTHER',
] as const;

const CLASS_LABELS: Record<string, string> = {
  SELLABLE: 'Disponible / comercializable',
  WORK_IN_PROCESS: 'En proceso',
  SOLD: 'Vendida',
  NON_SELLABLE: 'No comercializable',
};

export default function InventoryReconciliationPage() {
  const supabase = useMemo(() => createClient(), []);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', type: 'SALES_POINT', address: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [locationsResult, stockResult, reconciliationResult, permissionResult] = await Promise.all([
      supabase
        .from('investment_inventory_locations')
        .select('id,code,name,location_type,address,active,is_system')
        .order('location_type')
        .order('name'),
      supabase.rpc('get_inventory_location_stock', { p_lot_id: null }),
      callTrustedAdminRpc<ReconciliationRow[]>('inventory.reconcile', { p_lot_id: null }),
      supabase.rpc('has_investment_permission', { p_permission: 'inventory.manage' }),
    ]);

    const firstError = locationsResult.error ?? stockResult.error ?? reconciliationResult.error ?? permissionResult.error;
    if (firstError) {
      setError(firstError.message);
      setLocations([]);
      setStock([]);
      setReconciliation([]);
      setLoading(false);
      return;
    }

    setLocations((locationsResult.data ?? []) as InventoryLocation[]);
    setStock((stockResult.data ?? []) as StockRow[]);
    setReconciliation((reconciliationResult.data ?? []) as ReconciliationRow[]);
    setCanManage(Boolean(permissionResult.data));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveLocation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !form.code.trim() || !form.name.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const { error: saveError } = await supabase.rpc('upsert_inventory_location', {
      p_code: form.code.trim().toUpperCase(),
      p_name: form.name.trim(),
      p_location_type: form.type,
      p_address: form.address.trim() || null,
      p_active: true,
    });
    if (saveError) {
      setError(saveError.message);
    } else {
      setMessage(`Ubicación ${form.code.trim().toUpperCase()} registrada.`);
      setForm({ code: '', name: '', type: 'SALES_POINT', address: '' });
      await load();
    }
    setBusy(false);
  };

  const totalTracked = stock.reduce((sum, row) => sum + Number(row.quantity_units || 0), 0);
  const sellable = stock
    .filter((row) => row.inventory_class === 'SELLABLE')
    .reduce((sum, row) => sum + Number(row.quantity_units || 0), 0);
  const discrepancyCount = reconciliation.reduce(
    (sum, row) => sum
      + Number(row.movement_quantity_mismatches || 0)
      + Number(row.bottles_without_history || 0)
      + Number(row.canonical_location_gaps || 0)
      + Number(row.location_mismatches || 0)
      + Number(row.status_mismatches || 0)
      + Number(row.sale_link_mismatches || 0),
    0,
  );
  const reconciledLots = reconciliation.filter((row) => row.is_reconciled).length;

  return (
    <div className="space-y-7">
      <header
        className="rounded-[28px] border border-white/10 p-6 sm:p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))' }}
      >
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-accent/10" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One · Inventory Control</p>
            <h1 className="text-3xl sm:text-5xl font-outfit font-semibold">Inventory Reconciliation</h1>
            <p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">
              Fuente operacional para ubicaciones, stock por punto y reconciliación botella ↔ movimiento ↔ Sales OS. Una discrepancia aquí significa que la historia física no puede reconstruirse sin intervención.
            </p>
          </div>
          <Button onClick={() => void load()} loading={loading} variant="secondary" size="sm">
            <RefreshCw size={14} /> Reconciliar
          </Button>
        </div>
      </header>

      {(message || error) && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: error ? 'rgba(239,68,68,.3)' : 'rgba(34,197,94,.25)',
            background: error ? 'rgba(239,68,68,.06)' : 'rgba(34,197,94,.05)',
            color: error ? '#fca5a5' : '#86efac',
          }}
        >
          {error ?? message}
        </div>
      )}

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Metric icon={<MapPin />} label="Ubicaciones activas" value={String(locations.filter((item) => item.active).length)} />
        <Metric icon={<Boxes />} label="Unidades trazadas" value={String(totalTracked)} />
        <Metric icon={<Warehouse />} label="Comercializables" value={String(sellable)} />
        <Metric
          icon={discrepancyCount === 0 ? <ShieldCheck /> : <AlertTriangle />}
          label="Discrepancias"
          value={String(discrepancyCount)}
          warning={discrepancyCount > 0}
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[.8fr_1.2fr] gap-5">
        <div className="rounded-2xl border border-white/10 p-5 bg-white/[.02]">
          <p className="text-[9px] uppercase tracking-[.18em] text-text-dim">LOCATION MASTER</p>
          <h2 className="text-xl font-outfit font-semibold mt-1 mb-5">Ubicaciones registradas</h2>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {locations.map((location) => (
              <div key={location.id} className="rounded-xl border border-white/[.07] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-white font-medium">{location.name}</p>
                    <p className="text-[9px] font-mono text-accent mt-1">{location.code}</p>
                  </div>
                  <span className="text-[8px] uppercase tracking-[.12em] text-text-dim">{location.location_type}</span>
                </div>
                {location.address && <p className="text-[10px] text-text-dim mt-2">{location.address}</p>}
                <p className="text-[9px] text-text-dim mt-2">{location.is_system ? 'Sistema' : 'Operativa'} · {location.active ? 'Activa' : 'Inactiva'}</p>
              </div>
            ))}
            {!loading && locations.length === 0 && <p className="text-sm text-text-dim">No hay ubicaciones disponibles.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 p-5 bg-white/[.02]">
          <p className="text-[9px] uppercase tracking-[.18em] text-text-dim">REGISTER LOCATION</p>
          <h2 className="text-xl font-outfit font-semibold mt-1 mb-4">Nueva ubicación operacional</h2>
          {canManage ? (
            <form onSubmit={saveLocation} className="grid sm:grid-cols-2 gap-4">
              <Field label="Código" value={form.code} onChange={(value) => setForm({ ...form, code: value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })} placeholder="PISAO_MALL_PLAZA" />
              <Field label="Nombre" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="PISÁO Gastrobar · Mall Plaza" />
              <div>
                <label className="adminLabel">Tipo</label>
                <select className="adminInput" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                  {LOCATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <Field label="Dirección / referencia" value={form.address} onChange={(value) => setForm({ ...form, address: value })} placeholder="Opcional" />
              <div className="sm:col-span-2">
                <Button type="submit" loading={busy} disabled={!form.code.trim() || !form.name.trim()} variant="primary" size="sm">Registrar ubicación</Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-text-muted leading-relaxed">Tu rol puede consultar inventario, pero no administrar el registro maestro de ubicaciones.</p>
          )}
          <p className="text-[10px] text-text-dim mt-5 leading-relaxed">
            Usa códigos estables. El Scanner y los RPC físicos resuelven estos códigos a UUID; el nombre es solo una etiqueta de presentación y puede cambiar sin romper la historia.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 overflow-hidden bg-white/[.02]">
        <div className="p-5 border-b border-white/[.07]">
          <p className="text-[9px] uppercase tracking-[.18em] text-text-dim">LOCATION STOCK</p>
          <h2 className="text-xl font-outfit font-semibold mt-1">Stock derivado por ubicación</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[9px] uppercase tracking-[.12em] text-text-dim">
              <tr>
                <th className="p-4">Ubicación</th>
                <th className="p-4">Lote</th>
                <th className="p-4">Estado botella</th>
                <th className="p-4">Clase</th>
                <th className="p-4 text-right">Unidades</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((row, index) => (
                <tr key={`${row.location_code}-${row.lot_id}-${row.bottle_status}-${index}`} className="border-t border-white/[.06]">
                  <td className="p-4"><p className="text-white">{row.location_name}</p><p className="font-mono text-[9px] text-accent mt-1">{row.location_code}</p></td>
                  <td className="p-4 font-mono text-[10px]">{row.lot_code}</td>
                  <td className="p-4 text-accent">{row.bottle_status}</td>
                  <td className="p-4 text-text-muted">{CLASS_LABELS[row.inventory_class] ?? row.inventory_class}</td>
                  <td className="p-4 text-right font-mono text-white">{row.quantity_units}</td>
                </tr>
              ))}
              {!loading && stock.length === 0 && (
                <tr><td className="p-6 text-center text-text-dim" colSpan={5}>No hay botellas serializadas todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 overflow-hidden bg-white/[.02]">
        <div className="p-5 border-b border-white/[.07] flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-[.18em] text-text-dim">RECONCILIATION ENGINE</p>
            <h2 className="text-xl font-outfit font-semibold mt-1">Integridad física por lote</h2>
          </div>
          <p className="text-[10px] text-text-dim">{reconciledLots}/{reconciliation.length} lotes conciliados</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[9px] uppercase tracking-[.12em] text-text-dim">
              <tr>
                <th className="p-4">Lote</th>
                <th className="p-4">Seriales</th>
                <th className="p-4">Eventos</th>
                <th className="p-4">Qty≠links</th>
                <th className="p-4">Sin historia</th>
                <th className="p-4">Sin ubicación</th>
                <th className="p-4">Ubicación</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Venta</th>
                <th className="p-4">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.map((row) => (
                <tr key={row.lot_id} className="border-t border-white/[.06]">
                  <td className="p-4 font-mono text-[10px] text-white">{row.lot_code}</td>
                  <td className="p-4">{row.serialized_units}</td>
                  <td className="p-4">{row.movement_events}</td>
                  <td className="p-4">{row.movement_quantity_mismatches}</td>
                  <td className="p-4">{row.bottles_without_history}</td>
                  <td className="p-4">{row.canonical_location_gaps}</td>
                  <td className="p-4">{row.location_mismatches}</td>
                  <td className="p-4">{row.status_mismatches}</td>
                  <td className="p-4">{row.sale_link_mismatches}</td>
                  <td className="p-4">
                    <span className={row.is_reconciled ? 'text-emerald-300' : 'text-amber-300'}>{row.is_reconciled ? 'OK' : 'REVIEW'}</span>
                  </td>
                </tr>
              ))}
              {!loading && reconciliation.length === 0 && (
                <tr><td className="p-6 text-center text-text-dim" colSpan={10}>No hay lotes para reconciliar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx global>{`
        .adminInput{width:100%;border-radius:12px;padding:11px 13px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}
        .adminInput:focus{border-color:rgba(201,169,98,.38)}
        .adminLabel{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.13em;color:var(--text-dim);margin-bottom:7px}
      `}</style>
    </div>
  );
}

function Metric({ icon, label, value, warning = false }: { icon: React.ReactNode; label: string; value: string; warning?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4 sm:p-5">
      <div className={warning ? 'text-amber-300 mb-4' : 'text-accent mb-4'}>{React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 16 })}</div>
      <p className="text-[9px] uppercase tracking-[.13em] text-text-dim">{label}</p>
      <p className="text-lg sm:text-xl font-outfit font-semibold mt-2">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="adminLabel">{label}</label>
      <input className="adminInput" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}
