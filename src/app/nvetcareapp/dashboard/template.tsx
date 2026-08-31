import Link from 'next/link';
import { cookies } from 'next/headers';
import { ShieldCheck } from 'lucide-react';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

const ROOT_NAV = [
  ['/nvetcareapp/dashboard/gobernanza', 'Gobernanza'],
  ['/nvetcareapp/dashboard/usuarios', 'Usuarios'],
  ['/nvetcareapp/dashboard/veterinarios', 'Veterinarios'],
  ['/nvetcareapp/dashboard/citas-admin', 'Citas'],
  ['/nvetcareapp/dashboard/transacciones', 'Transacciones'],
  ['/nvetcareapp/dashboard/contabilidad', 'Excepciones'],
  ['/nvetcareapp/dashboard/auditoria', 'Auditoría'],
] as const;

export default async function NvetDashboardTemplate({ children }: { children: React.ReactNode }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  const userResult = accessToken ? await fetchNvetCurrentUser(accessToken) : null;
  const isSuperadmin = userResult?.ok === true && userResult.user.isSuperadmin;

  if (!isSuperadmin) return children;

  return (
    <>
      <section className="border-b border-white/10 bg-[#0D1B2A] px-4 py-4 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">Superadmin Nvet Care</p>
                  <span className="rounded-full border border-[#34B27A]/50 bg-[#34B27A]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8BE0B5]">Identidad raíz única</span>
                </div>
                <p className="mt-1 text-xs text-white/60">Plano de gobierno operativo, clínico, financiero y de seguridad.</p>
              </div>
            </div>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 text-[11px] font-semibold">
            {ROOT_NAV.map(([href, label]) => (
              <Link key={href} href={href} className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-white/80 transition hover:border-[#34B27A]/50 hover:bg-white/10 hover:text-white">{label}</Link>
            ))}
          </nav>
        </div>
      </section>
      {children}
    </>
  );
}
