import Link from 'next/link';
import { CircleDollarSign, Download } from 'lucide-react';
import { fetchNvetGovernanceTransactions, fetchNvetPaymentStats } from '@/lib/nvetcareapp/governance';
import { requireNvetSuperadmin } from '@/lib/nvetcareapp/require-superadmin';
import { LogoutButton } from '../logout-button';

const STATUSES = ['PENDING', 'VERIFYING', 'CONFIRMED', 'LIQUIDATED', 'DISPUTED', 'FAILED'] as const;
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  VERIFYING: 'Verificando',
  CONFIRMED: 'Confirmada',
  LIQUIDATED: 'Liquidada',
  DISPUTED: 'Disputada',
  FAILED: 'Fallida',
};
const TONES: Record<string, string> = {
  PENDING: 'border-[#0D1B2A]/10 bg-[#0D1B2A]/[0.03] text-[#5B6670]',
  VERIFYING: 'border-[#FF8A3D]/30 bg-[#FF8A3D]/[0.06] text-[#B75B1C]',
  CONFIRMED: 'border-[#34B27A]/30 bg-[#34B27A]/[0.06] text-[#289463]',
  LIQUIDATED: 'border-[#34B27A]/30 bg-[#34B27A]/[0.06] text-[#289463]',
  DISPUTED: 'border-[#FF8A3D]/30 bg-[#FF8A3D]/[0.06] text-[#B75B1C]',
  FAILED: 'border-red-300 bg-red-50 text-red-700',
};

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function person(first: string | null, last: string | null, fallback = 'Sin nombre') {
  return [first, last].filter(Boolean).join(' ').trim() || fallback;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string; status?: string }>;
}) {
  const { accessToken } = await requireNvetSuperadmin();
  const params = await searchParams;
  const rawOffset = Number(params.offset ?? 0);
  const offset = Number.isInteger(rawOffset) && rawOffset > 0 ? rawOffset : 0;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number]) ? params.status : undefined;
  const [transactions, paymentStats] = await Promise.all([
    fetchNvetGovernanceTransactions(accessToken, offset, status),
    fetchNvetPaymentStats(accessToken),
  ]);

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/nvetcareapp/dashboard/gobernanza" className="text-xs font-semibold text-[#5B6670] hover:text-[#0D1B2A]">← Gobernanza</Link>
            <div className="mt-2 flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-[#34B27A]" /><h1 className="text-2xl font-bold text-[#0D1B2A]">Tesorería y transacciones</h1></div>
            <p className="mt-1 text-sm text-[#5B6670]">Libro operacional de pagos, comisiones y estados de liquidación.</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/api/nvetcareapp/admin/governance/exports/transactions" className="inline-flex items-center gap-2 rounded-xl border border-[#0D1B2A]/10 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-[#0D1B2A] hover:border-[#34B27A]/40 hover:text-[#289463]"><Download className="h-4 w-4" /> Exportar CSV</a>
            <LogoutButton />
          </div>
        </header>

        {paymentStats.ok && (
          <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {['TRANSFER', 'PSE', 'CTG'].map((method) => {
              const stat = paymentStats.data[method];
              return (
                <div key={method} className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">{method === 'TRANSFER' ? 'Transferencias' : method}</p>
                  <p className="mt-1 text-xl font-bold text-[#0D1B2A]">{money.format(stat?.amount ?? 0)}</p>
                  <p className="mt-1 text-xs text-[#5B6670]">{stat?.total ?? 0} transacciones</p>
                </div>
              );
            })}
          </section>
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          <Link href="/nvetcareapp/dashboard/transacciones" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${!status ? 'border-[#0D1B2A] bg-[#0D1B2A] text-white' : 'border-[#0D1B2A]/10 bg-white text-[#5B6670]'}`}>Todas</Link>
          {STATUSES.map((item) => <Link key={item} href={`/nvetcareapp/dashboard/transacciones?status=${item}`} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${status === item ? 'border-[#0D1B2A] bg-[#0D1B2A] text-white' : 'border-[#0D1B2A]/10 bg-white text-[#5B6670]'}`}>{STATUS_LABELS[item]}</Link>)}
        </div>

        {!transactions.ok ? (
          <div className="rounded-2xl border border-[#FF8A3D]/30 bg-white p-8 text-center text-sm text-[#0D1B2A]">No se pudo cargar el libro de transacciones.</div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-[#0D1B2A]/10 bg-white shadow-sm">
              <div className="hidden grid-cols-[140px_130px_minmax(180px,1fr)_minmax(180px,1fr)_150px_150px] gap-3 border-b border-[#0D1B2A]/8 bg-[#F8F9FA] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670] xl:grid">
                <span>Fecha</span><span>Estado</span><span>Cliente</span><span>Veterinario</span><span>Importe</span><span>Método</span>
              </div>
              <div className="divide-y divide-[#0D1B2A]/7">
                {transactions.data.results.map((tx) => (
                  <div key={tx.id} className="grid grid-cols-1 gap-3 px-5 py-5 text-xs xl:grid-cols-[140px_130px_minmax(180px,1fr)_minmax(180px,1fr)_150px_150px] xl:items-center xl:gap-3">
                    <span className="text-[#5B6670]">{new Date(tx.createdAt).toLocaleDateString('es-CO')}</span>
                    <span><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${TONES[tx.status] ?? TONES.PENDING}`}>{STATUS_LABELS[tx.status] ?? tx.status}</span></span>
                    <div><p className="font-semibold text-[#0D1B2A]">{person(tx.appointment.client.firstName, tx.appointment.client.lastName, tx.appointment.client.email)}</p><p className="mt-1 text-[#5B6670]">{tx.appointment.serviceType}</p></div>
                    <p className="font-semibold text-[#0D1B2A]">{person(tx.appointment.vet.user.firstName, tx.appointment.vet.user.lastName)}</p>
                    <div><p className="font-semibold text-[#0D1B2A]">{money.format(tx.amountCop)}</p><p className="mt-1 text-[#5B6670]">Comisión {money.format(tx.commissionAmount)}</p></div>
                    <div><p className="font-semibold text-[#0D1B2A]">{tx.paymentMethod}</p>{tx.transferCode && <p className="mt-1 text-[#5B6670]">{tx.transferCode}</p>}</div>
                  </div>
                ))}
                {transactions.data.results.length === 0 && <div className="p-8 text-center text-sm text-[#5B6670]">No hay transacciones para este filtro.</div>}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-[#5B6670]">
              <span>{transactions.data.total ? `Mostrando ${offset + 1}–${offset + transactions.data.results.length} de ${transactions.data.total}` : 'Sin transacciones'}</span>
              <div className="flex gap-3 font-bold uppercase tracking-[0.08em] text-[#34B27A]">
                {offset > 0 && <Link href={`/nvetcareapp/dashboard/transacciones?offset=${Math.max(0, offset - transactions.data.limit)}${status ? `&status=${status}` : ''}`}>← Anteriores</Link>}
                {transactions.data.hasMore && <Link href={`/nvetcareapp/dashboard/transacciones?offset=${offset + transactions.data.limit}${status ? `&status=${status}` : ''}`}>Siguientes →</Link>}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
