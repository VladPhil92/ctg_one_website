'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ClientPagination } from '@/components/admin/ClientPagination';
import { formatCents } from '@/lib/format';
import { SALES_PAGE_SIZE, pageCount } from '@/lib/pagination';
import {
  createSalesReturnsBrowserRepository,
  type CreditItem,
  type CreditNote,
  type LotSummary,
  type ReturnLocation,
  type Sale,
  type SaleItem,
  type SalesReturnReconciliation,
} from '@/modules/operations/returns/browser-repository';
import { BadgeCheck, PackageCheck, ReceiptText, RotateCcw, ShieldCheck } from 'lucide-react';

const REASONS = [
  ['CUSTOMER_RETURN', 'Devolución del cliente'],
  ['QUALITY_ISSUE', 'Incidencia de calidad'],
  ['DAMAGED_PRODUCT', 'Producto dañado'],
  ['WRONG_PRODUCT', 'Producto incorrecto'],
  ['OTHER', 'Otro'],
] as const;

function browserIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `credit-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function ReturnsPage() {
  const repository = useMemo(() => createSalesReturnsBrowserRepository(), []);
  const [sales, setSales] = useState<Sale[]>([]);
  const [lots, setLots] = useState<LotSummary[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [creditItems, setCreditItems] = useState<CreditItem[]>([]);
  const [reconciliation, setReconciliation] = useState<SalesReturnReconciliation | null>(null);
  const [locations, setLocations] = useState<ReturnLocation[]>([]);
  const [saleId, setSaleId] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [returnLocation, setReturnLocation] = useState('');
  const [reason, setReason] = useState('CUSTOMER_RETURN');
  const [reference, setReference] = useState('');
  const [notesText, setNotesText] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [salesLoading, setSalesLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    try {
      const context = await repository.loadReturnContext();
      setLocations(context.locations);
      setCanManage(context.canManage);
      setReturnLocation((current) => current || context.locations[0]?.code || '');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar el contexto de devoluciones');
    }
  }, [repository]);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    setError(null);
    try {
      const result = await repository.listConfirmedSales(page, SALES_PAGE_SIZE);
      const maxPage = pageCount(result.totalCount, SALES_PAGE_SIZE);
      if (page > maxPage) {
        setTotalCount(result.totalCount);
        setPage(maxPage);
        return;
      }

      setSales(result.rows);
      setLots(result.lots);
      setTotalCount(result.totalCount);
      setSaleId((current) =>
        result.rows.some((sale) => sale.id === current) ? current : (result.rows[0]?.id ?? ''),
      );
    } catch (caught) {
      setSales([]);
      setLots([]);
      setSaleId('');
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar las ventas');
    } finally {
      setSalesLoading(false);
    }
  }, [page, repository]);

  const loadDetails = useCallback(async (targetSaleId: string) => {
    if (!targetSaleId) {
      setItems([]);
      setNotes([]);
      setCreditItems([]);
      setReconciliation(null);
      return;
    }

    setDetailsLoading(true);
    setError(null);
    try {
      const details = await repository.loadSaleDetails(targetSaleId);
      setItems(details.items);
      setNotes(details.notes);
      setCreditItems(details.creditItems);
      setReconciliation(details.reconciliation);
    } catch (caught) {
      setItems([]);
      setNotes([]);
      setCreditItems([]);
      setReconciliation(null);
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar el detalle de la venta');
    } finally {
      setDetailsLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  useEffect(() => {
    setSelected([]);
    setReference('');
    setNotesText('');
    setIdempotencyKey('');
    void loadDetails(saleId);
  }, [saleId, loadDetails]);

  const sale = sales.find((row) => row.id === saleId) ?? null;
  const lot = lots.find((row) => row.id === sale?.lot_id) ?? null;
  const creditedIds = useMemo(() => new Set(creditItems.map((row) => row.sale_item_id)), [creditItems]);
  const available = useMemo(() => items.filter((row) => !creditedIds.has(row.id)), [items, creditedIds]);
  const selectedItems = useMemo(
    () => items.filter((row) => selected.includes(row.serial_code)),
    [items, selected],
  );
  const grossCredit = selectedItems.reduce((sum, row) => sum + Number(row.line_total_cents || 0), 0);

  const taxShares = useMemo(() => {
    const map = new Map<string, number>();
    if (!sale || items.length === 0) return map;
    const base = Math.floor(Number(sale.tax_recognized_cents) / items.length);
    const remainder = Number(sale.tax_recognized_cents) % items.length;
    items.forEach((row, index) => map.set(row.id, base + (index < remainder ? 1 : 0)));
    return map;
  }, [sale, items]);

  const taxCredit = selectedItems.reduce((sum, row) => sum + (taxShares.get(row.id) ?? 0), 0);

  const toggle = (serial: string) => {
    setSelected((current) =>
      current.includes(serial) ? current.filter((value) => value !== serial) : [...current, serial],
    );
  };

  const submit = async () => {
    if (!sale || !selected.length || !returnLocation || !canManage) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const key = idempotencyKey || browserIdempotencyKey();
    if (!idempotencyKey) setIdempotencyKey(key);

    const { data, error: rpcError } = await repository.recordReturn({
      p_sale_id: sale.id,
      p_serial_codes: selected,
      p_return_location: returnLocation,
      p_reason_code: reason,
      p_idempotency_key: key,
      p_credit_reference: reference || null,
      p_notes: notesText || null,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      setMessage(
        `Nota crédito registrada · ${row?.returned_count ?? selected.length} unidad(es) · ${formatCents(Number(row?.gross_credit_cents ?? grossCredit))}.`,
      );
      setSelected([]);
      setReference('');
      setNotesText('');
      setIdempotencyKey('');
      await Promise.all([loadSales(), loadDetails(sale.id)]);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <header
        className="rounded-[28px] border border-white/10 p-6 sm:p-8"
        style={{ background: 'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))' }}
      >
        <p className="mb-3 text-[9px] uppercase tracking-[.28em] text-accent">Sales OS · Reverse Flow</p>
        <h1 className="text-3xl font-outfit font-semibold sm:text-5xl">Devoluciones & Credit Notes</h1>
        <p className="mt-3 max-w-3xl text-sm text-text-muted">
          La venta original permanece inmutable. Cada devolución vincula seriales vendidos, movimiento físico desde custodia del cliente, reversión de ingreso/impuesto y evidencia auditable.
        </p>
        <p className="mt-2 text-[11px] text-text-dim">Ventas confirmadas paginadas · {totalCount} registros</p>
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

      <section className="rounded-2xl border border-white/10 bg-white/[.02] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="block flex-1 text-[9px] uppercase tracking-[.13em] text-text-dim">
            Venta confirmada
            <select
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.025] px-3 py-3 text-white"
              value={saleId}
              disabled={salesLoading || sales.length === 0}
              onChange={(event) => setSaleId(event.target.value)}
            >
              <option value="">Selecciona una venta</option>
              {sales.map((row) => {
                const saleLot = lots.find((item) => item.id === row.lot_id);
                return (
                  <option key={row.id} value={row.id}>
                    {saleLot?.code ?? row.lot_id.slice(0, 8)} · {row.sale_reference || row.id.slice(0, 8)} · {formatCents(row.gross_revenue_cents)}
                  </option>
                );
              })}
            </select>
          </label>
          <Button onClick={() => void loadSales()} variant="secondary" size="sm" disabled={salesLoading || busy}>
            Actualizar ventas
          </Button>
        </div>
        <ClientPagination
          page={page}
          pageSize={SALES_PAGE_SIZE}
          totalCount={totalCount}
          disabled={salesLoading || busy}
          onPageChange={(nextPage) => {
            setMessage(null);
            setError(null);
            setPage(nextPage);
          }}
        />
      </section>

      {detailsLoading && sale && <p className="text-sm text-text-dim">Cargando detalle de la venta seleccionada...</p>}

      {sale && !detailsLoading && (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <Metric icon={<ReceiptText />} label="Venta original" value={formatCents(sale.gross_revenue_cents)} />
            <Metric icon={<RotateCcw />} label="Crédito acumulado" value={formatCents(reconciliation?.gross_credit_cents ?? 0)} />
            <Metric icon={<PackageCheck />} label="Unidades retornadas" value={`${reconciliation?.returned_units ?? 0}/${reconciliation?.sold_units ?? items.length}`} />
            <Metric icon={<ShieldCheck />} label="Ingreso neto" value={formatCents(reconciliation?.net_revenue_cents ?? sale.gross_revenue_cents)} accent />
            <Metric icon={<BadgeCheck />} label="Reconciliación" value={reconciliation?.is_reconciled ? 'OK' : reconciliation ? 'REVISAR' : '—'} />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[.02] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] uppercase tracking-[.18em] text-text-dim">SERIAL RETURN SET</p>
                  <h2 className="mt-1 text-xl font-outfit font-semibold">{lot?.code ?? 'Lote'} · seleccionar unidades</h2>
                </div>
                <span className="text-[10px] text-text-dim">Disponibles: {available.length}</span>
              </div>
              {available.length === 0 ? (
                <p className="text-sm text-text-muted">No quedan unidades elegibles para devolución en esta venta.</p>
              ) : (
                <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {available.map((row) => (
                    <label
                      key={row.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.018] px-3 py-3"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(row.serial_code)}
                        onChange={() => toggle(row.serial_code)}
                      />
                      <span className="flex-1 font-mono text-xs text-white">{row.serial_code}</span>
                      <span className="text-[10px] text-text-dim">{formatCents(row.line_total_cents)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-accent/20 bg-accent/[.035] p-5 sm:p-6">
              <p className="text-[9px] uppercase tracking-[.18em] text-accent">AUTHORITATIVE CREDIT</p>
              <h2 className="mb-5 mt-1 text-xl font-outfit font-semibold">Emitir nota crédito</h2>
              <Field label="Referencia" value={reference} onChange={setReference} placeholder="NC-0001" />
              <div className="mt-3">
                <label className="adminLabel">Motivo</label>
                <select className="adminInput" value={reason} onChange={(event) => setReason(event.target.value)}>
                  {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="mt-3">
                <label className="adminLabel">Punto receptor</label>
                <select className="adminInput" value={returnLocation} onChange={(event) => setReturnLocation(event.target.value)}>
                  {locations.map((location) => (
                    <option key={location.id} value={location.code}>{location.name} · {location.location_type}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3">
                <Field label="Notas" value={notesText} onChange={setNotesText} placeholder="Estado del producto / evidencia..." />
              </div>
              <div className="mt-4 rounded-xl border border-white/[.08] bg-black/20 p-4">
                <Row label="Unidades" value={String(selected.length)} />
                <Row label="Crédito bruto" value={formatCents(grossCredit)} />
                <Row label="Reversión impuesto" value={formatCents(taxCredit)} />
                <p className="mt-3 text-[10px] leading-relaxed text-text-dim">
                  Los valores se derivan de los ítems originales. El impuesto se reparte por botella conservando exactamente los centavos reconocidos en la venta completa.
                </p>
              </div>
              {!canManage && (
                <p className="mt-4 text-xs text-amber-300">
                  Modo lectura: se requiere <span className="font-mono">sales.manage</span> para emitir una devolución.
                </p>
              )}
              <Button
                onClick={() => void submit()}
                disabled={!canManage || !selected.length || !returnLocation}
                loading={busy}
                variant="primary"
                size="sm"
                fullWidth
                className="mt-4"
              >
                Registrar devolución de {selected.length} unidad(es)
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[.02] p-5 sm:p-6">
            <p className="text-[9px] uppercase tracking-[.18em] text-text-dim">CREDIT NOTE HISTORY</p>
            <h2 className="mb-4 mt-1 text-xl font-outfit font-semibold">Documentos de esta venta</h2>
            {notes.length === 0 ? (
              <p className="text-sm text-text-muted">Sin notas crédito.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[.07] text-text-dim">
                      <th className="py-3 pr-4">Referencia</th>
                      <th className="py-3 pr-4">Motivo</th>
                      <th className="py-3 pr-4">Bruto</th>
                      <th className="py-3 pr-4">Impuesto</th>
                      <th className="py-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notes.map((note) => (
                      <tr key={note.id} className="border-b border-white/[.045]">
                        <td className="py-3 pr-4 font-mono text-white">{note.credit_reference || note.id.slice(0, 8)}</td>
                        <td className="py-3 pr-4 text-text-muted">{note.reason_code}</td>
                        <td className="py-3 pr-4 text-white">{formatCents(note.gross_credit_cents)}</td>
                        <td className="py-3 pr-4 text-text-muted">{formatCents(note.tax_credit_cents)}</td>
                        <td className="py-3 text-text-muted">{new Date(note.confirmed_at).toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {!salesLoading && sales.length === 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[.02] p-5 text-sm text-text-muted">
          No hay ventas confirmadas disponibles para devolución.
        </section>
      )}

      <style jsx global>{`.adminInput{width:100%;border-radius:12px;padding:11px 13px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}.adminLabel{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.13em;color:var(--text-dim);margin-bottom:7px}`}</style>
    </div>
  );
}

function Metric({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: accent ? 'rgba(201,169,98,.28)' : 'rgba(255,255,255,.08)',
        background: accent ? 'rgba(201,169,98,.05)' : 'rgba(255,255,255,.02)',
      }}
    >
      <div className="mb-3 text-accent">{React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 15 })}</div>
      <p className="text-[9px] uppercase tracking-[.12em] text-text-dim">{label}</p>
      <p className="mt-2 truncate text-lg font-outfit font-semibold">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="adminLabel">{label}</span>
      <input className="adminInput" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-xs">
      <span className="text-text-dim">{label}</span>
      <span className="font-mono text-white">{value}</span>
    </div>
  );
}
