import type { CSSProperties } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { fetchNvetPendingTransfers, fetchNvetDisputedTransactions, type NvetTransaction } from '@/lib/nvetcareapp/transactions';
import { LogoutButton } from '../logout-button';
import { TransferActions } from './transfer-actions';
import { DisputeResolutionForm } from './dispute-resolution-form';

const poppinsFont: CSSProperties = { fontFamily: 'var(--font-poppins-nvet), Poppins, sans-serif' };

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border-[1px] border-[#0D1B2A]/10 bg-white p-8 text-center shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
      <p className="text-sm text-[#0D1B2A]">{message}</p>
    </div>
  );
}

function TransactionHeader({ tx }: { tx: NvetTransaction }) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#0D1B2A]">
        {tx.appointment.vet.user.firstName} {tx.appointment.vet.user.lastName}
      </p>
      <p className="text-xs text-[#5B6670]">
        {tx.appointment.client.firstName} {tx.appointment.client.lastName} · {tx.appointment.serviceType}
      </p>
      <p className="mt-1 text-xs text-[#5B6670]">
        {formatCOP(tx.amountCop)} · comisión {formatCOP(tx.commissionAmount)}
        {tx.transferCode && ` · código ${tx.transferCode}`}
      </p>
    </div>
  );
}

export default async function AccountingPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    redirect('/nvetcareapp/iniciar-sesion');
  }

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion');
  }

  const isAdmin = userResult.ok && userResult.user.role === 'ADMIN';

  const [transfersResult, disputesResult] = isAdmin
    ? await Promise.all([fetchNvetPendingTransfers(accessToken), fetchNvetDisputedTransactions(accessToken)])
    : [null, null];

  if (transfersResult && !transfersResult.ok && transfersResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion');
  }
  if (disputesResult && !disputesResult.ok && disputesResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion');
  }

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/nvetcareapp/dashboard" className="mb-2 inline-block text-xs text-[#5B6670] hover:text-[#0D1B2A]">← Panel</a>
            <h1 className="text-xl font-semibold text-[#0D1B2A]" style={poppinsFont}>Contabilidad</h1>
            <p className="text-sm text-[#5B6670]">Transferencias pendientes y disputas.</p>
          </div>
          <LogoutButton />
        </div>

        {!isAdmin ? (
          <ErrorPanel message="Tu cuenta no tiene permisos de administrador para ver esta página." />
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-sm font-semibold text-[#0D1B2A]" style={poppinsFont}>Transferencias pendientes</h2>
              {!transfersResult?.ok ? (
                <ErrorPanel message="No se pudieron obtener las transferencias pendientes en este momento." />
              ) : transfersResult.data.length === 0 ? (
                <ErrorPanel message="No hay transferencias pendientes de confirmación." />
              ) : (
                <div className="space-y-3">
                  {transfersResult.data.map((tx) => (
                    <div key={tx.id} className="rounded-2xl border-[1px] border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <TransactionHeader tx={tx} />
                        <div className="flex flex-col items-end gap-2">
                          {typeof tx.waitingMinutes === 'number' && (
                            <span className="text-[11px] text-[#5B6670]">Esperando {tx.waitingMinutes} min</span>
                          )}
                          <TransferActions transactionId={tx.id} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-[#0D1B2A]" style={poppinsFont}>Transacciones en disputa</h2>
              {!disputesResult?.ok ? (
                <ErrorPanel message="No se pudieron obtener las transacciones en disputa en este momento." />
              ) : disputesResult.data.results.length === 0 ? (
                <ErrorPanel message="No hay transacciones en disputa." />
              ) : (
                <div className="space-y-3">
                  {disputesResult.data.results.map((tx) => (
                    <div key={tx.id} className="rounded-2xl border-[1px] border-[#FF8A3D]/25 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <TransactionHeader tx={tx} />
                        <DisputeResolutionForm transactionId={tx.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
