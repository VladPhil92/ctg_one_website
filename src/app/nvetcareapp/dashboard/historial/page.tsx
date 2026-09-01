import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  FileClock,
  PawPrint,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { fetchNvetAppointments, type NvetAppointment } from '@/lib/nvetcareapp/appointments';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function clinicalText(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function hasClinicalRecord(appointment: NvetAppointment): boolean {
  return Boolean(clinicalText(appointment.diagnosis) || clinicalText(appointment.treatment));
}

export default async function NvetClinicalHistoryPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/historial');
  }

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/historial');
  }
  if (!userResult.ok || userResult.user.role !== 'CLIENT') {
    redirect('/nvetcareapp/dashboard');
  }

  const appointmentsResult = await fetchNvetAppointments(accessToken);
  if (!appointmentsResult.ok && appointmentsResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/historial');
  }

  const completedAppointments = appointmentsResult.ok
    ? appointmentsResult.appointments.filter((appointment) => Boolean(appointment.completedAt))
    : [];
  const documentedAppointments = completedAppointments.filter(hasClinicalRecord);
  const petsWithHistory = new Set(completedAppointments.map((appointment) => appointment.pet.id)).size;

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#34B27A]">
              Nvet Care · Expediente clínico
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0D1B2A] sm:text-3xl">
              Historial clínico
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6670]">
              Consulta la trazabilidad de las atenciones que alcanzaron el cierre clínico. Una disputa posterior no borra del expediente la evidencia ya documentada durante la atención.
            </p>
          </div>
          <Link
            href="/nvetcareapp/dashboard/citas"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16293D]"
          >
            Ver citas y pagos <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">Atenciones completadas</p>
            <p className="mt-1 text-2xl font-bold text-[#0D1B2A]">
              {appointmentsResult.ok ? completedAppointments.length : '—'}
            </p>
          </article>
          <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
              <PawPrint className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">Mascotas con historial</p>
            <p className="mt-1 text-2xl font-bold text-[#0D1B2A]">
              {appointmentsResult.ok ? petsWithHistory : '—'}
            </p>
          </article>
          <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
              <FileClock className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">Registros clínicos</p>
            <p className="mt-1 text-2xl font-bold text-[#0D1B2A]">
              {appointmentsResult.ok ? documentedAppointments.length : '—'}
            </p>
          </article>
        </section>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#34B27A]/20 bg-[#34B27A]/[0.06] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#237754]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[#0D1B2A]">Historial basado en evidencia clínica real</p>
            <p className="mt-1 text-xs leading-5 text-[#5B6670]">
              Nvet Care no inventa diagnósticos, tratamientos ni antecedentes. Una atención entra al historial únicamente cuando tiene `completedAt`; si después queda en disputa, la evidencia clínica permanece visible y la cita conserva su estado actual por separado.
            </p>
          </div>
        </div>

        {!appointmentsResult.ok ? (
          <section className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-8 text-center">
            <FileClock className="mx-auto h-7 w-7 text-[#5B6670]" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-[#0D1B2A]">No pudimos sincronizar tu historial</h2>
            <p className="mt-2 text-sm leading-6 text-[#5B6670]">
              El servicio de citas está temporalmente no disponible. Tus datos no se sustituyen por información simulada.
            </p>
          </section>
        ) : completedAppointments.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-[#34B27A]/30 bg-white p-8 text-center">
            <Stethoscope className="mx-auto h-7 w-7 text-[#34B27A]" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-[#0D1B2A]">Tu historial clínico comenzará con la primera atención completada</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5B6670]">
              Las citas pendientes, confirmadas o en curso permanecen en el módulo de citas. Aquí aparecerán cuando el backend registre efectivamente su finalización.
            </p>
            <Link
              href="/nvetcareapp/dashboard/citas"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#34B27A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#289463]"
            >
              Ir a mis citas <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <section className="space-y-4" aria-label="Historial de atenciones completadas">
            {completedAppointments.map((appointment) => {
              const diagnosis = clinicalText(appointment.diagnosis);
              const treatment = clinicalText(appointment.treatment);
              const documented = Boolean(diagnosis || treatment);

              return (
                <article
                  key={appointment.id}
                  className="overflow-hidden rounded-3xl border border-[#0D1B2A]/10 bg-white shadow-[0_1px_3px_rgba(13,27,42,0.04)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#0D1B2A]/5 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#34B27A]/10 text-[#237754]">
                        <PawPrint className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-bold text-[#0D1B2A]">{appointment.pet.name}</h2>
                          <span className="rounded-full border border-[#0D1B2A]/10 bg-[#F7F8FA] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#5B6670]">
                            {appointment.pet.species}
                          </span>
                          {appointment.status === 'DISPUTED' && (
                            <span className="rounded-full border border-[#FF8A3D]/25 bg-[#FF8A3D]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#A6531B]">
                              Cita en disputa
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-[#0D1B2A]">{appointment.serviceType}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5B6670]">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatDate(appointment.date)} · {appointment.time}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                            {appointment.vet.user.firstName} {appointment.vet.user.lastName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                          documented
                            ? 'border-[#34B27A]/25 bg-[#34B27A]/10 text-[#237754]'
                            : 'border-[#FF8A3D]/25 bg-[#FF8A3D]/10 text-[#A6531B]'
                        }`}
                      >
                        {documented ? 'Registro clínico disponible' : 'Sin nota clínica registrada'}
                      </span>
                      <Link
                        href={`/nvetcareapp/dashboard/mascotas/${appointment.pet.id}/expediente`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#0D1B2A]/10 bg-white px-3 py-1.5 text-[10px] font-bold text-[#237754] transition hover:border-[#34B27A]/30"
                      >
                        Ver expediente <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[#0D1B2A]/8 bg-[#F8F9FA] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">Diagnóstico</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#0D1B2A]">
                        {diagnosis ?? 'No hay un diagnóstico clínico persistido para esta atención.'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#0D1B2A]/8 bg-[#F8F9FA] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">Tratamiento / indicaciones</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#0D1B2A]">
                        {treatment ?? 'No hay tratamiento o indicaciones clínicas persistidas para esta atención.'}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
