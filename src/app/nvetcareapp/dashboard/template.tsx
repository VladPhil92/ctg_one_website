import Link from 'next/link';
import { cookies } from 'next/headers';
import { ShieldCheck } from 'lucide-react';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

export default async function NvetDashboardTemplate({ children }: { children: React.ReactNode }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  const userResult = accessToken ? await fetchNvetCurrentUser(accessToken) : null;
  const isSuperadmin = userResult?.ok === true && userResult.user.role === 'SUPERADMIN';

  if (!isSuperadmin) return children;

  return (
    <>
      <section className="border-b border-[#0D1B2A]/10 bg-[#0D1B2A] px-4 py-5 text-white sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">Superadmin Nvet Care</p>
                <span className="rounded-full border border-[#34B27A]/50 bg-[#34B27A]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8BE0B5]">
                  Identidad raíz única
                </span>
              </div>
              <p className="mt-1 text-xs text-white/65">
                Sesión vinculada a la identidad CTG One canónica. Ninguna otra cuenta obtiene autoridad SUPERADMIN.
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 text-xs font-semibold">
            <Link href="/nvetcareapp/dashboard" className="rounded-lg border border-white/15 px-3 py-2 text-white/85 hover:bg-white/10">
              Resumen
            </Link>
            <Link href="/nvetcareapp/dashboard/veterinarios" className="rounded-lg border border-white/15 px-3 py-2 text-white/85 hover:bg-white/10">
              Veterinarios
            </Link>
            <Link href="/nvetcareapp/dashboard/contabilidad" className="rounded-lg border border-white/15 px-3 py-2 text-white/85 hover:bg-white/10">
              Contabilidad
            </Link>
          </nav>
        </div>
      </section>
      {children}
    </>
  );
}
