import Link from 'next/link';
import { FileClock, ShieldAlert } from 'lucide-react';
import { fetchNvetGovernanceAudit } from '@/lib/nvetcareapp/governance';
import { requireNvetSuperadmin } from '@/lib/nvetcareapp/require-superadmin';
import { LogoutButton } from '../logout-button';

const SEVERITIES = ['INFO', 'WARN', 'CRITICAL'] as const;

const TONES: Record<string, string> = {
  INFO: 'border-[#0D1B2A]/10 bg-[#0D1B2A]/[0.03] text-[#5B6670]',
  WARN: 'border-[#FF8A3D]/30 bg-[#FF8A3D]/[0.06] text-[#B75B1C]',
  CRITICAL: 'border-red-300 bg-red-50 text-red-700',
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string; severity?: string }>;
}) {
  const { accessToken } = await requireNvetSuperadmin();
  const params = await searchParams;
  const rawOffset = Number(params.offset ?? 0);
  const offset = Number.isInteger(rawOffset) && rawOffset > 0 ? rawOffset : 0;
  const severity = SEVERITIES.includes(params.severity as (typeof SEVERITIES)[number]) ? params.severity : undefined;
  const result = await fetchNvetGovernanceAudit(accessToken, offset, severity);

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/nvetcareapp/dashboard/gobernanza" className="text-xs font-semibold text-[#5B6670] hover:text-[#0D1B2A]">← Gobernanza</Link>
            <div className="mt-2 flex items-center gap-2">
              <FileClock className="h-5 w-5 text-[#34B27A]" />
              <h1 className="text-2xl font-bold text-[#0D1B2A]">Auditoría y seguridad</h1>
            </div>
            <p className="mt-1 text-sm text-[#5B6670]">Trazabilidad redactada de eventos administrativos y de seguridad.</p>
          </div>
          <LogoutButton />
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          <Link href="/nvetcareapp/dashboard/auditoria" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${!severity ? 'border-[#0D1B2A] bg-[#0D1B2A] text-white' : 'border-[#0D1B2A]/10 bg-white text-[#5B6670]'}`}>Todos</Link>
          {SEVERITIES.map((item) => (
            <Link key={item} href={`/nvetcareapp/dashboard/auditoria?severity=${item}`} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${severity === item ? 'border-[#0D1B2A] bg-[#0D1B2A] text-white' : 'border-[#0D1B2A]/10 bg-white text-[#5B6670]'}`}>{item}</Link>
          ))}
        </div>

        {!result.ok ? (
          <div className="rounded-2xl border border-[#FF8A3D]/30 bg-white p-8 text-center">
            <ShieldAlert className="mx-auto h-6 w-6 text-[#FF8A3D]" />
            <p className="mt-3 text-sm text-[#0D1B2A]">No se pudo cargar la bitácora de auditoría.</p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-[#0D1B2A]/10 bg-white shadow-sm">
              <div className="hidden grid-cols-[150px_120px_minmax(180px,1fr)_170px_minmax(220px,1.3fr)] gap-3 border-b border-[#0D1B2A]/8 bg-[#F8F9FA] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670] lg:grid">
                <span>Fecha</span><span>Severidad</span><span>Acción</span><span>Recurso</span><span>Motivo</span>
              </div>
              <div className="divide-y divide-[#0D1B2A]/7">
                {result.data.results.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-1 gap-2 px-5 py-4 text-xs lg:grid-cols-[150px_120px_minmax(180px,1fr)_170px_minmax(220px,1.3fr)] lg:items-center lg:gap-3">
                    <span className="text-[#5B6670]">{new Date(entry.createdAt).toLocaleString('es-CO')}</span>
                    <span><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${TONES[entry.severity]}`}>{entry.severity}</span></span>
                    <div>
                      <p className="font-semibold text-[#0D1B2A]">{entry.action}</p>
                      <p className="mt-0.5 text-[10px] text-[#7C8791]">Actor: {entry.actorRole ?? 'SYSTEM'}</p>
                    </div>
                    <span className="text-[#5B6670]">{entry.targetType ?? '—'}{entry.targetId ? ` · ${entry.targetId.slice(0, 8)}…` : ''}</span>
                    <span className="leading-5 text-[#5B6670]">{entry.reason ?? 'Sin motivo adicional'}</span>
                  </div>
                ))}
                {result.data.results.length === 0 && <div className="p-8 text-center text-sm text-[#5B6670]">No hay eventos para este filtro.</div>}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-[#5B6670]">
              <span>{result.data.total ? `Mostrando ${offset + 1}–${offset + result.data.results.length} de ${result.data.total}` : 'Sin eventos'}</span>
              <div className="flex gap-3 font-bold uppercase tracking-[0.08em] text-[#34B27A]">
                {offset > 0 && <Link href={`/nvetcareapp/dashboard/auditoria?offset=${Math.max(0, offset - result.data.limit)}${severity ? `&severity=${severity}` : ''}`}>← Anteriores</Link>}
                {result.data.hasMore && <Link href={`/nvetcareapp/dashboard/auditoria?offset=${offset + result.data.limit}${severity ? `&severity=${severity}` : ''}`}>Siguientes →</Link>}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
