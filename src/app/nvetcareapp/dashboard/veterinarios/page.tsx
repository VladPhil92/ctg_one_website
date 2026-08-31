import type { CSSProperties } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser, isNvetAdminRole } from '@/lib/nvetcareapp/user';
import { fetchNvetVets, NVET_TIER_COMMISSION_PCT, type NvetVerificationStatus } from '@/lib/nvetcareapp/vets';
import { LogoutButton } from '../logout-button';
import { TierSelect } from './tier-select';
import { VetGovernanceActions } from './governance-actions';

const poppinsFont: CSSProperties = { fontFamily: 'var(--font-poppins-nvet), Poppins, sans-serif' };

const VERIFICATION_LABELS: Record<NvetVerificationStatus, string> = {
  NONE: 'Sin iniciar',
  PENDING: 'Documentos enviados',
  IN_REVIEW: 'En revisión',
  APPROVED: 'Verificado',
  REJECTED: 'Rechazado',
  EXPIRED: 'Vencido',
};

const VERIFICATION_TONE: Record<NvetVerificationStatus, string> = {
  NONE: 'border-[#0D1B2A]/10 bg-[#0D1B2A]/[0.03] text-[#5B6670]',
  PENDING: 'border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] text-[#FF8A3D]',
  IN_REVIEW: 'border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] text-[#FF8A3D]',
  APPROVED: 'border-[#34B27A]/25 bg-[#34B27A]/[0.06] text-[#34B27A]',
  REJECTED: 'border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] text-[#FF8A3D]',
  EXPIRED: 'border-[#0D1B2A]/10 bg-[#0D1B2A]/[0.03] text-[#5B6670]',
};

function vetName(firstName: string | null, lastName: string | null, email: string) {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || email;
}

export default async function VeterinariansPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/nvetcareapp/iniciar-sesion');

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) redirect('/nvetcareapp/iniciar-sesion');

  const isAdmin = userResult.ok && isNvetAdminRole(userResult.user.role);
  const isSuperadmin = userResult.ok && userResult.user.isSuperadmin;

  const rawOffset = Number((await searchParams).offset);
  const offset = Number.isInteger(rawOffset) && rawOffset > 0 ? rawOffset : 0;

  const vetsResult = isAdmin ? await fetchNvetVets(accessToken, offset) : null;
  if (vetsResult && !vetsResult.ok && vetsResult.status === 401) redirect('/nvetcareapp/iniciar-sesion');

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href={isSuperadmin ? '/nvetcareapp/dashboard/gobernanza' : '/nvetcareapp/dashboard'} className="mb-2 inline-block text-xs text-[#5B6670] hover:text-[#0D1B2A]">← {isSuperadmin ? 'Gobernanza' : 'Panel'}</Link>
            <h1 className="text-xl font-semibold text-[#0D1B2A]" style={poppinsFont}>Veterinarios</h1>
            <p className="text-sm text-[#5B6670]">{isSuperadmin ? 'Verificación, habilitación profesional, niveles y comisiones.' : 'Niveles y comisiones por veterinario.'}</p>
          </div>
          <LogoutButton />
        </div>

        {!isAdmin ? (
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-8 text-center shadow-sm"><p className="text-sm text-[#0D1B2A]">Tu cuenta no tiene permisos de administrador para ver esta página.</p></div>
        ) : !vetsResult?.ok ? (
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-8 text-center shadow-sm"><p className="text-sm text-[#0D1B2A]">No se pudo obtener la lista de veterinarios en este momento.</p></div>
        ) : vetsResult.page.results.length === 0 ? (
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-8 text-center shadow-sm"><p className="text-sm text-[#0D1B2A]">Todavía no hay veterinarios registrados.</p></div>
        ) : (
          <>
            <div className="space-y-3">
              {vetsResult.page.results.map((vet) => (
                <div key={vet.id} className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#0D1B2A]">{vetName(vet.user.firstName, vet.user.lastName, vet.user.email)}</p>
                      <p className="text-xs text-[#5B6670]">{vet.user.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${VERIFICATION_TONE[vet.verificationStatus]}`}>{VERIFICATION_LABELS[vet.verificationStatus]}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${vet.isActive ? 'border-[#34B27A]/25 bg-[#34B27A]/[0.06] text-[#289463]' : 'border-red-200 bg-red-50 text-red-700'}`}>{vet.isActive ? 'Habilitado' : 'Suspendido'}</span>
                        <span className="text-[11px] text-[#5B6670]">{vet._count.appointments} citas · {vet.rating ? vet.rating.toFixed(1) : 'Sin calificación'} ({vet._count.reviews})</span>
                      </div>
                      {isSuperadmin && <VetGovernanceActions vetId={vet.id} verificationStatus={vet.verificationStatus} active={vet.isActive} />}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] text-[#5B6670]">{NVET_TIER_COMMISSION_PCT[vet.tier]}% de comisión</span>
                      <TierSelect vetId={vet.id} currentTier={vet.tier} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-[#5B6670]">
              <span>Mostrando {offset + 1}–{offset + vetsResult.page.results.length} de {vetsResult.page.total}</span>
              <div className="flex gap-3">
                {offset > 0 && <Link href={`/nvetcareapp/dashboard/veterinarios?offset=${Math.max(0, offset - vetsResult.page.limit)}`} className="font-semibold uppercase tracking-[0.08em] text-[#34B27A] hover:text-[#289463]">← Anteriores</Link>}
                {vetsResult.page.hasMore && <Link href={`/nvetcareapp/dashboard/veterinarios?offset=${offset + vetsResult.page.limit}`} className="font-semibold uppercase tracking-[0.08em] text-[#34B27A] hover:text-[#289463]">Siguientes →</Link>}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
