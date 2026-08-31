import Link from 'next/link';
import { Search, ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react';
import { fetchNvetGovernanceUsers } from '@/lib/nvetcareapp/governance';
import { requireNvetSuperadmin } from '@/lib/nvetcareapp/require-superadmin';
import { LogoutButton } from '../logout-button';
import { UserStatusButton } from './user-status-button';

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Administrador',
  VET: 'Veterinario',
  CLIENT: 'Cliente',
};

function nameOf(user: { firstName: string | null; lastName: string | null; email: string }) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email;
}

export default async function GovernanceUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string; q?: string }>;
}) {
  const { accessToken, user: root } = await requireNvetSuperadmin();
  const params = await searchParams;
  const parsedOffset = Number(params.offset ?? 0);
  const offset = Number.isInteger(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;
  const query = typeof params.q === 'string' ? params.q.trim() : '';
  const result = await fetchNvetGovernanceUsers(accessToken, offset, query);

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/nvetcareapp/dashboard/gobernanza" className="text-xs font-semibold text-[#5B6670] hover:text-[#0D1B2A]">← Gobernanza</Link>
            <div className="mt-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#34B27A]" />
              <h1 className="text-2xl font-bold text-[#0D1B2A]">Usuarios y control de acceso</h1>
            </div>
            <p className="mt-1 text-sm text-[#5B6670]">Ciclo de vida de cuentas, identidad CTG One y postura básica de seguridad.</p>
          </div>
          <LogoutButton />
        </header>

        <form className="mb-5 flex max-w-xl items-center gap-2 rounded-2xl border border-[#0D1B2A]/10 bg-white p-2 shadow-sm" action="/nvetcareapp/dashboard/usuarios">
          <Search className="ml-2 h-4 w-4 text-[#7C8791]" />
          <input
            name="q"
            defaultValue={query}
            minLength={2}
            placeholder="Buscar por nombre o correo"
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[#0D1B2A] outline-none placeholder:text-[#9AA3AB]"
          />
          <button className="rounded-xl bg-[#0D1B2A] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white">Buscar</button>
        </form>

        {!result.ok ? (
          <div className="rounded-2xl border border-[#FF8A3D]/30 bg-white p-8 text-center text-sm text-[#0D1B2A]">
            No se pudo obtener el registro de usuarios. Verifica que Governance V1 esté desplegado en el backend.
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">Resultados</p>
                <p className="mt-1 text-xl font-bold text-[#0D1B2A]">{result.data.total}</p>
              </div>
              <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-4">
                <div className="flex items-center gap-2 text-[#34B27A]"><UserRoundCheck className="h-4 w-4" /><span className="text-[11px] font-bold uppercase tracking-[0.1em]">Activas en esta página</span></div>
                <p className="mt-1 text-xl font-bold text-[#0D1B2A]">{result.data.results.filter((item) => item.isActive).length}</p>
              </div>
              <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-4">
                <div className="flex items-center gap-2 text-[#FF8A3D]"><UserRoundX className="h-4 w-4" /><span className="text-[11px] font-bold uppercase tracking-[0.1em]">Inactivas en esta página</span></div>
                <p className="mt-1 text-xl font-bold text-[#0D1B2A]">{result.data.results.filter((item) => !item.isActive).length}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#0D1B2A]/10 bg-white shadow-sm">
              <div className="hidden grid-cols-[minmax(220px,1.5fr)_120px_170px_180px_130px] gap-3 border-b border-[#0D1B2A]/8 bg-[#F8F9FA] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670] lg:grid">
                <span>Identidad</span><span>Rol</span><span>Seguridad</span><span>Actividad</span><span className="text-right">Control</span>
              </div>
              <div className="divide-y divide-[#0D1B2A]/7">
                {result.data.results.map((item) => {
                  const isRoot = item.id === root.id;
                  return (
                    <div key={item.id} className="grid grid-cols-1 gap-4 px-5 py-5 lg:grid-cols-[minmax(220px,1.5fr)_120px_170px_180px_130px] lg:items-center lg:gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#0D1B2A]">{nameOf(item)}</p>
                          {isRoot && <span className="rounded-full bg-[#0D1B2A] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white">root</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-[#5B6670]">{item.email}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${item.isActive ? 'border-[#34B27A]/30 bg-[#34B27A]/[0.06] text-[#289463]' : 'border-[#FF8A3D]/30 bg-[#FF8A3D]/[0.06] text-[#B75B1C]'}`}>{item.isActive ? 'Activa' : 'Inactiva'}</span>
                          {item.ctgLinked && <span className="rounded-full border border-[#0D1B2A]/10 bg-[#0D1B2A]/[0.03] px-2 py-0.5 text-[10px] font-semibold text-[#5B6670]">CTG One</span>}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-[#0D1B2A]">{ROLE_LABELS[item.role] ?? item.role}</div>
                      <div className="space-y-1 text-xs text-[#5B6670]">
                        <p>{item.emailVerified ? '✓ Email verificado' : '○ Email pendiente'}</p>
                        <p>{item.twoFactorEnabled ? '✓ 2FA activo' : '○ 2FA inactivo'}</p>
                      </div>
                      <div className="text-xs text-[#5B6670]">
                        <p>Alta: {new Date(item.createdAt).toLocaleDateString('es-CO')}</p>
                        <p className="mt-1">Último acceso: {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString('es-CO') : 'Sin registro'}</p>
                      </div>
                      <UserStatusButton userId={item.id} active={item.isActive} disabled={isRoot} />
                    </div>
                  );
                })}
              </div>
            </div>

            {result.data.results.length === 0 && (
              <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-8 text-center text-sm text-[#5B6670]">No hay usuarios para este criterio.</div>
            )}

            <div className="mt-5 flex items-center justify-between text-xs text-[#5B6670]">
              <span>
                {result.data.total > 0 ? `Mostrando ${offset + 1}–${offset + result.data.results.length} de ${result.data.total}` : 'Sin resultados'}
              </span>
              <div className="flex gap-3 font-bold uppercase tracking-[0.08em] text-[#34B27A]">
                {offset > 0 && (
                  <Link href={`/nvetcareapp/dashboard/usuarios?offset=${Math.max(0, offset - result.data.limit)}${query ? `&q=${encodeURIComponent(query)}` : ''}`}>← Anteriores</Link>
                )}
                {result.data.hasMore && (
                  <Link href={`/nvetcareapp/dashboard/usuarios?offset=${offset + result.data.limit}${query ? `&q=${encodeURIComponent(query)}` : ''}`}>Siguientes →</Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
