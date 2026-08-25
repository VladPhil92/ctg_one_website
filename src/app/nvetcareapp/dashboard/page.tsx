import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE, getNvetApiUrl } from '@/lib/nvetcareapp/session';
import { LogoutButton } from './logout-button';

// Minimal placeholder — proves the login -> middleware -> BFF -> NestJS
// pipe works end to end (ADR-002/ROADMAP Phase 2). The real dashboard
// pages (AdminDashboard first) are ported natively in Phase 3
// (ADR-003) — this page gets replaced wholesale then, not extended.
export default async function NvetDashboardPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    redirect('/nvetcareapp/iniciar-sesion');
  }

  const res = await fetch(`${getNvetApiUrl()}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    redirect('/nvetcareapp/iniciar-sesion');
  }

  const user = await res.json();

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-6 py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[#0D1B2A] mb-1">Panel de Nvet Care</h1>
        <p className="text-sm text-[#4A5A68] mb-6">
          Sesión activa. Las páginas reales del panel (métricas, agenda, tarifas) llegan en la
          siguiente fase — esto solo confirma que el inicio de sesión funciona.
        </p>
        <dl className="space-y-2 text-sm mb-6">
          <div className="flex justify-between border-b border-black/5 pb-2">
            <dt className="text-[#4A5A68]">Correo</dt>
            <dd className="text-[#0D1B2A] font-medium">{user.email}</dd>
          </div>
          <div className="flex justify-between border-b border-black/5 pb-2">
            <dt className="text-[#4A5A68]">Rol</dt>
            <dd className="text-[#0D1B2A] font-medium">{user.role}</dd>
          </div>
        </dl>
        <LogoutButton />
      </div>
    </main>
  );
}
