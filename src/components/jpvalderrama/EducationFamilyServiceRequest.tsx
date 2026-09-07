'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, UserRoundCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type AdvisoryResponse = { ok?: boolean };

const serviceOptions = [
  'Tutorías privadas',
  'Refuerzo académico',
  'Preparación de exámenes',
  'Preparación de exposiciones y trabajos',
  'Acompañamiento bilingüe',
] as const;

export function EducationFamilyServiceRequest() {
  const { isAuthenticated, isLoading, profile, email } = useAuth();
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const defaultName = useMemo(() => profile?.full_name?.trim() || '', [profile]);
  const defaultEmail = useMemo(() => profile?.email || email || '', [email, profile]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated || state === 'submitting') return;

    setState('submitting');
    const form = event.currentTarget;
    const data = new FormData(form);
    const serviceArea = String(data.get('serviceArea') ?? 'Tutorías privadas');
    const studentName = String(data.get('studentName') ?? '').trim();
    const grade = String(data.get('grade') ?? '').trim();
    const subject = String(data.get('subject') ?? '').trim();
    const modality = String(data.get('modality') ?? '').trim();
    const city = String(data.get('city') ?? '').trim();
    const objective = String(data.get('objective') ?? '').trim();

    const message = [
      `Estudiante: ${studentName || 'Por definir'}.`,
      `Grado/curso: ${grade || 'Por definir'}.`,
      `Área: ${subject || 'Por definir'}.`,
      `Modalidad: ${modality || 'Por definir'}.`,
      `Ciudad: ${city || 'Por definir'}.`,
      `Necesidad: ${objective}`,
    ].join(' ');

    try {
      const response = await fetch('/api/education/advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestKind: 'family',
          institutionName: 'Familia / usuario individual',
          contactName: String(data.get('contactName') ?? ''),
          contactEmail: String(data.get('contactEmail') ?? ''),
          contactPhone: String(data.get('contactPhone') ?? ''),
          serviceArea,
          message,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as AdvisoryResponse;
      if (!response.ok || !payload.ok) {
        setState('error');
        return;
      }
      form.reset();
      setState('success');
    } catch {
      setState('error');
    }
  }

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="border border-[#6f0d12]/16 bg-[#fbf7f1] p-8">
        <UserRoundCheck className="h-7 w-7 text-[#6f0d12]" aria-hidden="true" />
        <h3 className="mt-5 font-serif text-3xl text-[#17110e]">Identifícate para solicitar el servicio.</h3>
        <p className="mt-4 font-serif text-[16px] leading-7 text-[#665950]">La cuenta permite conservar la solicitud, su estado y la contratación posterior dentro de Mi aprendizaje.</p>
        <a href="/iniciar-sesion?next=/jpvalderrama/learningcenter%23solicitud" className="mt-7 inline-flex min-h-12 items-center gap-2 bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">Iniciar sesión <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="border border-[#6f0d12]/16 bg-[#fbf7f1] p-8">
        <CheckCircle2 className="h-7 w-7 text-[#6f0d12]" aria-hidden="true" />
        <h3 className="mt-5 font-serif text-3xl text-[#17110e]">Solicitud registrada.</h3>
        <p className="mt-4 font-serif text-[16px] leading-7 text-[#665950]">La solicitud ya quedó asociada a tu cuenta. El siguiente paso es definir disponibilidad, alcance y cotización antes de contratar.</p>
        <a href="/dashboard/educacion/servicios" className="mt-6 inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#6f0d12]">Ver solicitud, cotizaciones y agenda <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-[#6f0d12]/16 bg-[#fbf7f1] p-7 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre del acudiente o solicitante" name="contactName" defaultValue={defaultName} autoComplete="name" />
        <Field label="Correo" name="contactEmail" type="email" defaultValue={defaultEmail} autoComplete="email" />
        <Field label="Teléfono" name="contactPhone" autoComplete="tel" />
        <label className="text-sm text-[#4c4038]">Servicio<select name="serviceArea" className="mt-2 min-h-12 w-full border border-[#6f0d12]/18 bg-[#fffaf2] px-3 text-[#241a15] outline-none focus:border-[#6f0d12]">{serviceOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <Field label="Nombre del estudiante" name="studentName" />
        <Field label="Grado / curso" name="grade" />
        <Field label="Área o asignatura" name="subject" />
        <label className="text-sm text-[#4c4038]">Modalidad<select name="modality" className="mt-2 min-h-12 w-full border border-[#6f0d12]/18 bg-[#fffaf2] px-3 text-[#241a15] outline-none focus:border-[#6f0d12]"><option value="Virtual">Virtual</option><option value="A domicilio">A domicilio</option><option value="Por definir">Por definir</option></select></label>
        <Field label="Ciudad" name="city" />
        <label className="text-sm text-[#4c4038] sm:col-span-2">Objetivo o necesidad<textarea name="objective" required minLength={20} maxLength={2500} rows={5} className="mt-2 w-full border border-[#6f0d12]/18 bg-[#fffaf2] p-3 text-[#241a15] outline-none focus:border-[#6f0d12]" placeholder="Cuéntanos qué necesita reforzar o preparar el estudiante, fechas relevantes y cualquier contexto útil." /></label>
      </div>
      <button type="submit" disabled={isLoading || state === 'submitting'} className="mt-6 inline-flex min-h-12 items-center gap-2 bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2] disabled:opacity-60">{state === 'submitting' ? 'Registrando…' : 'Solicitar diagnóstico y cotización'} <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
      {state === 'error' ? <p role="alert" className="mt-4 text-sm leading-6 text-[#6f0d12]">No fue posible registrar la solicitud. No se creó ninguna contratación ni cobro; intenta nuevamente.</p> : null}
    </form>
  );
}

function Field({ label, name, type = 'text', defaultValue, autoComplete }: { label: string; name: string; type?: string; defaultValue?: string; autoComplete?: string }) {
  return <label className="text-sm text-[#4c4038]">{label}<input name={name} type={type} defaultValue={defaultValue} required={name !== 'contactPhone' && name !== 'studentName' && name !== 'grade' && name !== 'subject' && name !== 'city'} autoComplete={autoComplete} className="mt-2 min-h-12 w-full border border-[#6f0d12]/18 bg-[#fffaf2] px-3 text-[#241a15] outline-none focus:border-[#6f0d12]" /></label>;
}
