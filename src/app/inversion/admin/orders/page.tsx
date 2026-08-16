'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Badge } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCents } from '@/lib/format';
import { INVESTMENT_ORDER_STATUS_LABELS, type InvestmentOrder } from '@/types/investment';

export default function InvestmentOrdersAdminPage() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<InvestmentOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = profile?.role === 'admin';

  const load = useCallback(async () => {
    setLoadingOrders(true);
    const supabase = createClient();
    const { data, error: queryError } = await supabase
      .from('investment_orders')
      .select('*, lot:investment_production_lots(*)')
      .in('status', ['AWAITING_PAYMENT','PAYMENT_SUBMITTED'])
      .order('created_at', { ascending: true });
    if (queryError) setError(queryError.message);
    else setOrders((data as unknown as InvestmentOrder[]) ?? []);
    setLoadingOrders(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.push('/iniciar-sesion?next=/inversion/admin/orders');
    else if (!isAdmin) router.push('/dashboard');
    else load();
  }, [isAuthenticated, isLoading, isAdmin, router, load]);

  if (isLoading || !isAuthenticated || !isAdmin) return null;

  const approve = async (id: string) => {
    setBusyId(id); setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('approve_investment_order', { p_order_id: id, p_admin_notes: null });
    if (rpcError) setError(rpcError.message); else await load();
    setBusyId(null);
  };

  const reject = async (id: string) => {
    const notes = window.prompt('Motivo del rechazo');
    if (!notes?.trim()) return;
    setBusyId(id); setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('reject_investment_order', { p_order_id: id, p_admin_notes: notes.trim() });
    if (rpcError) setError(rpcError.message); else await load();
    setBusyId(null);
  };

  return (
    <section className="py-12 sm:py-16"><Container>
      <div className="flex items-end justify-between gap-4 mb-10"><div><Badge variant="accent" className="mb-4">Administración</Badge><h1 className="text-3xl font-outfit font-semibold text-white">Órdenes de inversión</h1><p className="text-sm text-text-muted mt-2">Valida evidencia de pago antes de convertir una orden en allocation y ledger.</p></div><Button href="/inversion/admin" variant="secondary" size="sm">Volver</Button></div>
      {error && <p className="text-sm mb-5" style={{ color: 'var(--error)' }}>{error}</p>}
      {loadingOrders ? <p className="text-sm text-text-dim">Cargando órdenes...</p> : orders.length === 0 ? <p className="text-sm text-text-dim">No hay órdenes pendientes.</p> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{orders.map(order => (
        <Card key={order.id} variant="bordered" padding="lg">
          <div className="flex justify-between gap-4 mb-5"><div><p className="text-white font-semibold">{order.lot?.beer_style ?? 'Lote'}</p><p className="text-[11px] text-text-dim mt-1">{order.lot?.code ?? order.lot_id}</p></div><span className="text-[9px] uppercase tracking-[.12em] text-accent">{INVESTMENT_ORDER_STATUS_LABELS[order.status]}</span></div>
          <div className="space-y-2 text-sm mb-5"><div className="flex justify-between"><span className="text-text-dim">Cajas</span><span className="text-white">{order.case_equivalent_units}</span></div><div className="flex justify-between"><span className="text-text-dim">Capital</span><span className="text-white">{formatCents(order.capital_required_cents)}</span></div><div className="flex justify-between"><span className="text-text-dim">Método</span><span className="text-white">{order.payment_method ?? 'Pendiente'}</span></div><div className="flex justify-between"><span className="text-text-dim">Referencia</span><span className="text-white break-all text-right">{order.payment_reference ?? '—'}</span></div></div>
          {order.status === 'PAYMENT_SUBMITTED' ? <div className="flex gap-2"><Button onClick={() => approve(order.id)} loading={busyId === order.id} variant="primary" size="sm">Aprobar pago</Button><Button onClick={() => reject(order.id)} variant="secondary" size="sm">Rechazar</Button></div> : <p className="text-xs text-text-dim">Esperando que el participante registre el pago.</p>}
        </Card>
      ))}</div>}
    </Container></section>
  );
}
