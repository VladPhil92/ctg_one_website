import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  FileClock,
  HeartPulse,
  PawPrint,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { fetchNvetClinicalRecord } from '@/lib/nvetcareapp/clinical-record';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(value?: string | null): string {
  if (!value) return 'Sin fecha registrada';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#0D1B2A]">{value}</p>
    </article>
  );
}

function OwnerReportedSummary({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[#0D1B2A]/8 bg-[#F8F9FA] px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#0D1B2A]">{value}</p>
    </div>
  );
}

export default async function NvetPetClinicalRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const next = `/nvetcareapp/dashboard/mascotas/${id}/expediente`;
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    redirect(`/nvetcareapp/iniciar-sesion?next=${encodeURIComponent(next)}`);
  }

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect(`/nvetcareapp/iniciar-sesion?next=${encodeURIComponent(next)}`);
  }
  if (!userResult.ok || userResult.user.role !== 'CLIENT') {
    redirect('/nvetcareapp/dashboard');
  }

  const recordResult = await fetchNvetClinicalRecord(accessToken, id);
  if (!recordResult.ok && recordResult.status === 401) {
    redirect(`/nvetcareapp/iniciar-sesion?next=${encodeURIComponent(next)}`);
  }
  if (!recordResult.ok && recordResult.status === 404) notFound();
  if (!recordResult.ok && recordResult.status === 403) redirect('/nvetcareapp/dashboard/mascotas');

  if (!recordResult.ok) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[#0D1B2A]/10 bg-white p-8 text-center">
          <FileClock className="mx-auto h-7 w-7 text-[#5B6670]" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-bold text-[#0D1B2A]">No pudimos sincronizar este expediente</h1>
          <p className="mt-2 text-sm leading-6 text-[#5B6670]">
            {recordResult.message}. Nvet Care no sustituirá datos clínicos reales por información simulada.
          </p>
          <Link
            href="/nvetcareapp/dashboard/mascotas"
            className="mt-5 inline-flex rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-xs font-bold text-white"
          >
            Volver a mis mascotas
          </Link>
        </div>
      </main>
    );
  }

  const record = recordResult.data;
  const profile = record.ownerReported.data;
  const documented = record.vetAuthored.records.filter((item) => item.hasClinicalNote);

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/nvetcareapp/dashboard/mascotas"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#237754] hover:text-[#1B6144]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Mis mascotas
            </Link>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#34B27A]">
              Nvet Care · Clinical Record V3
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0D1B2A] sm:text-3xl">
              Expediente clínico · {record.pet.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6670]">
              Una vista longitudinal que conserva por separado lo reportado por el responsable y la evidencia clínica documentada durante atenciones veterinarias completadas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/nvetcareapp/dashboard/mascotas/${record.pet.id}/salud`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#0D1B2A]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:border-[#34B27A]/30 hover:text-[#237754]"
            >
              <HeartPulse className="h-4 w-4" aria-hidden="true" /> Salud preventiva
            </Link>
            <Link
              href="/nvetcareapp/dashboard/historial"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <FileClock className="h-4 w-4" aria-hidden="true" /> Historial global
            </Link>
          </div>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <Metric label="Atenciones completadas" value={record.summary.completedAttendances} />
          <Metric label="Con nota clínica" value={record.summary.documentedAttendances} />
          <Metric
            label="Perfil reportado por responsable"
            value={record.summary.ownerReportedProfileAvailable ? 'Disponible' : 'Sin registrar'}
          />
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-[#34B27A]/20 bg-[#34B27A]/[0.06] p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#237754]" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#237754]">OWNER_REPORTED</p>
                <h2 className="mt-1 text-base font-bold text-[#0D1B2A]">Información declarada por el responsable</h2>
                <p className="mt-2 text-xs leading-5 text-[#5B6670]">{record.provenance.ownerReported}</p>
              </div>
            </div>
          </article>
          <article className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-5">
            <div className="flex items-start gap-3">
              <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-[#237754]" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#237754]">VET_AUTHORED</p>
                <h2 className="mt-1 text-base font-bold text-[#0D1B2A]">Evidencia clínica veterinaria</h2>
                <p className="mt-2 text-xs leading-5 text-[#5B6670]">{record.provenance.vetAuthored}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="mb-6 rounded-3xl border border-[#0D1B2A]/10 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">Identidad de la mascota</p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-[#0D1B2A]">
                <PawPrint className="h-5 w-5 text-[#237754]" aria-hidden="true" /> {record.pet.name}
              </h2>
            </div>
            <span className="rounded-full border border-[#0D1B2A]/10 bg-[#F7F8FA] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#5B6670]">
              {record.pet.species}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#F8F9FA] p-3 text-sm text-[#0D1B2A]">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">Raza</span>
              <span className="mt-1 block font-semibold">{record.pet.breed || 'Sin registrar'}</span>
            </div>
            <div className="rounded-xl bg-[#F8F9FA] p-3 text-sm text-[#0D1B2A]">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">Peso</span>
              <span className="mt-1 block font-semibold">{record.pet.weight ? `${record.pet.weight} kg` : 'Sin registrar'}</span>
            </div>
            <div className="rounded-xl bg-[#F8F9FA] p-3 text-sm text-[#0D1B2A]">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">Nacimiento</span>
              <span className="mt-1 block font-semibold">{record.pet.birthDate ? formatDate(record.pet.birthDate) : 'Sin registrar'}</span>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-[#0D1B2A]/10 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#237754]">OWNER_REPORTED</p>
              <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Contexto preventivo y antecedentes conocidos</h2>
            </div>
            <span className="text-xs text-[#5B6670]">
              {record.ownerReported.updatedAt ? `Actualizado ${formatDate(record.ownerReported.updatedAt)}` : 'Sin actualización registrada'}
            </span>
          </div>

          {!record.ownerReported.available || !profile ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#0D1B2A]/15 bg-[#F8F9FA] p-5 text-sm text-[#5B6670]">
              Todavía no existe un perfil preventivo OWNER_REPORTED válido para esta mascota.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <OwnerReportedSummary label="Alergias" value={profile.allergies.length} />
              <OwnerReportedSummary label="Medicamentos" value={profile.medications.length} />
              <OwnerReportedSummary label="Antecedentes" value={profile.conditions.length} />
              <OwnerReportedSummary label="Vacunas" value={profile.vaccinations.length} />
              <OwnerReportedSummary label="Desparasitación" value={profile.deworming.length} />
              <OwnerReportedSummary label="Controles preventivos" value={profile.preventiveCare.length} />
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#237754]">VET_AUTHORED</p>
              <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Atenciones clínicas completadas</h2>
              <p className="mt-1 text-xs leading-5 text-[#5B6670]">
                {documented.length} de {record.vetAuthored.records.length} atenciones completadas tienen diagnóstico o tratamiento persistido.
              </p>
            </div>
            <ClipboardCheck className="h-6 w-6 text-[#237754]" aria-hidden="true" />
          </div>

          {record.vetAuthored.records.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#0D1B2A]/15 bg-[#F8F9FA] p-6 text-center">
              <Stethoscope className="mx-auto h-6 w-6 text-[#5B6670]" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-[#0D1B2A]">Aún no hay atenciones completadas</p>
              <p className="mt-1 text-xs text-[#5B6670]">El expediente crecerá únicamente con eventos clínicos reales.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {record.vetAuthored.records.map((item) => (
                <article key={item.appointmentId} className="rounded-2xl border border-[#0D1B2A]/8 bg-[#F8F9FA] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#0D1B2A]">{item.serviceType}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5B6670]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {formatDate(item.date)} · {item.time}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5" aria-hidden="true" /> {item.veterinarian.name}
                        </span>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${item.hasClinicalNote ? 'border-[#34B27A]/25 bg-[#34B27A]/10 text-[#237754]' : 'border-[#FF8A3D]/25 bg-[#FF8A3D]/10 text-[#A6531B]'}`}>
                      {item.hasClinicalNote ? 'Nota clínica disponible' : 'Sin nota clínica'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-[#0D1B2A]/8 bg-white p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">Diagnóstico</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#0D1B2A]">
                        {item.diagnosis || 'No hay diagnóstico persistido para esta atención.'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#0D1B2A]/8 bg-white p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">Tratamiento / indicaciones</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#0D1B2A]">
                        {item.treatment || 'No hay tratamiento o indicaciones persistidas para esta atención.'}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
