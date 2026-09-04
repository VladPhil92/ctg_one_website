import { BetaOperationsPanel } from './beta-operations-panel';
import { fetchNvetBetaOperations } from '@/lib/nvetcareapp/beta-operations';
import { requireNvetSuperadmin } from '@/lib/nvetcareapp/require-superadmin';

export const dynamic = 'force-dynamic';

export default async function NvetBetaOperationsPage() {
  const { accessToken } = await requireNvetSuperadmin();
  const result = await fetchNvetBetaOperations(accessToken);

  return (
    <main className="min-h-screen bg-[#F6F8FA] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Phase 12G · Cartagena Closed Beta</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0D1B2A]">Operaciones Beta</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Control plane canónico para readiness, evidencia, cohorte y autorización operacional. La autoridad permanece en el backend Nvet y todas las escrituras se revalidan server-side.
          </p>
        </header>

        {!result.ok ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-bold text-red-950">No fue posible cargar el Control Plane</h2>
            <p className="mt-2 text-sm text-red-800">
              El backend Nvet respondió con estado {result.status}. No se muestran datos parciales ni simulados; verifica el deployment y la sesión SUPERADMIN antes de operar la beta.
            </p>
          </section>
        ) : (
          <BetaOperationsPanel snapshot={result.data} />
        )}
      </div>
    </main>
  );
}
