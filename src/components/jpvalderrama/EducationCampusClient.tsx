'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  GraduationCap,
  LibraryBig,
  Presentation,
  School,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Offering = {
  id: string;
  slug: string;
  title: string;
  offering_type: 'conference' | 'book' | 'course' | 'class' | 'resource';
  summary: string;
  price_amount: number | null;
  currency: string;
  access_path: string | null;
};

type CatalogResponse = {
  ok?: boolean;
  offerings?: Offering[];
};

type AdvisoryResponse = {
  ok?: boolean;
};

const capabilities = [
  { title: 'Conferencias', text: 'Charlas en vivo, ciclos y encuentros de Valderrama Talks.', icon: Presentation },
  { title: 'Cursos', text: 'Programas formativos publicados progresivamente con acceso por cuenta.', icon: GraduationCap },
  { title: 'Clases', text: 'Clases, tutorías y acompañamiento académico con contratación identificada.', icon: School },
  { title: 'Libros', text: 'Publicaciones y futuras ediciones físicas o digitales de Valderrama Books.', icon: BookOpen },
  { title: 'Recursos', text: 'Materiales de estudio y contenidos exclusivos asignados a tu biblioteca.', icon: LibraryBig },
  { title: 'Instituciones', text: 'Diagnóstico y asesoría educativa para colegios y organizaciones.', icon: Building2 },
] as const;

function formatPrice(amount: number | null, currency: string) {
  if (amount === null) return 'Consultar';
  if (amount === 0) return 'Sin costo';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function EducationCampusClient() {
  const { isAuthenticated, isLoading, profile, email } = useAuth();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [advisoryState, setAdvisoryState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      try {
        const response = await fetch('/api/education/catalog', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as CatalogResponse;
        if (cancelled) return;
        if (!response.ok || !payload.ok) {
          setCatalogState('unavailable');
          return;
        }
        setOfferings(payload.offerings ?? []);
        setCatalogState('ready');
      } catch {
        if (!cancelled) setCatalogState('unavailable');
      }
    }
    void loadCatalog();
    return () => { cancelled = true; };
  }, []);

  const accountHref = isAuthenticated
    ? '/dashboard/educacion'
    : '/iniciar-sesion?next=/jpvalderrama/campus';

  const accountLabel = isLoading
    ? 'Validando cuenta…'
    : isAuthenticated
      ? 'Abrir mi biblioteca'
      : 'Iniciar sesión con CTG One';

  const accountName = useMemo(() => {
    if (!isAuthenticated) return null;
    return profile?.full_name?.trim() || profile?.email || email || 'Cuenta CTG One';
  }, [email, isAuthenticated, profile]);

  async function submitAdvisory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated || advisoryState === 'submitting') return;

    setAdvisoryState('submitting');
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      institutionName: String(data.get('institutionName') ?? ''),
      contactName: String(data.get('contactName') ?? ''),
      contactEmail: String(data.get('contactEmail') ?? ''),
      contactPhone: String(data.get('contactPhone') ?? ''),
      serviceArea: String(data.get('serviceArea') ?? ''),
      message: String(data.get('message') ?? ''),
    };

    try {
      const response = await fetch('/api/education/advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as AdvisoryResponse;
      if (!response.ok || !result.ok) {
        setAdvisoryState('error');
        return;
      }
      form.reset();
      setAdvisoryState('success');
    } catch {
      setAdvisoryState('error');
    }
  }

  return (
    <>
      <section className="border-b border-[#6f0d12]/10">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-12 lg:py-24">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#6f0d12]">JP Valderrama · CTG One Education</p>
            <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[.96] tracking-[-.035em] text-[#17110e] sm:text-6xl lg:text-[4.8rem]">Una sola cuenta para aprender, comprar y acceder.</h1>
            <div className="mt-7 flex items-center gap-3" aria-hidden="true"><span className="h-px w-24 bg-[#6f0d12]" /><span className="h-2 w-2 rounded-full bg-[#6f0d12]" /></div>
            <p className="mt-7 max-w-3xl font-serif text-lg leading-8 text-[#564a42] sm:text-xl">Conferencias, libros, cursos, clases, recursos y servicios educativos viven dentro de la misma identidad de CTG One. Lo que adquieras o te sea asignado aparece en tu biblioteca personal.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={accountHref} aria-disabled={isLoading} className="inline-flex min-h-12 items-center gap-2 rounded-sm bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">{accountLabel}<ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
              {!isAuthenticated && !isLoading ? <a href="/registro?next=/jpvalderrama/campus" className="inline-flex min-h-12 items-center rounded-sm border border-[#6f0d12]/35 px-6 text-xs font-bold uppercase tracking-[.13em] text-[#6f0d12]">Crear cuenta CTG One</a> : null}
            </div>
          </div>

          <aside className="border border-[#6f0d12]/16 bg-[#fbf7f1] p-7 sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#6f0d12]/20 text-[#6f0d12]"><UserRoundCheck className="h-5 w-5" aria-hidden="true" /></div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Identidad educativa</p>
            <h2 className="mt-3 font-serif text-3xl text-[#17110e]">{isLoading ? 'Verificando sesión…' : accountName ?? 'Tu cuenta CTG One'}</h2>
            <p className="mt-4 font-serif text-[16px] leading-7 text-[#665950]">No creamos una cuenta paralela para JP Valderrama. Tus derechos de acceso quedan ligados al mismo usuario de CTG One.</p>
            <div className="mt-6 flex items-start gap-3 border-t border-[#6f0d12]/12 pt-5 text-sm leading-6 text-[#564a42]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6f0d12]" aria-hidden="true" /><span>Un intento de pago no desbloquea contenidos. El acceso se concede sólo después de una confirmación transaccional verificable.</span></div>
          </aside>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Ecosistema educativo</p>
          <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-tight text-[#17110e] sm:text-5xl">Productos y servicios bajo una misma biblioteca.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {capabilities.map(({ title, text, icon: Icon }) => (
              <article key={title} className="border border-[#6f0d12]/14 bg-[#fbf7f1] p-7">
                <Icon className="h-5 w-5 text-[#6f0d12]" aria-hidden="true" />
                <h3 className="mt-5 font-serif text-2xl text-[#17110e]">{title}</h3>
                <p className="mt-3 font-serif text-[16px] leading-7 text-[#665950]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="catalogo" className="border-y border-[#6f0d12]/10 bg-[#efe3d7] py-16 sm:py-20">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Catálogo publicado</p>
              <h2 className="mt-3 font-serif text-4xl text-[#17110e] sm:text-5xl">Disponibilidad real, no productos ficticios.</h2>
            </div>
            {isAuthenticated ? <a href="/dashboard/educacion" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-[#6f0d12]">Mi biblioteca <ArrowRight className="h-4 w-4" aria-hidden="true" /></a> : null}
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {catalogState === 'loading' ? <p className="font-serif text-[#665950]">Consultando el catálogo…</p> : null}
            {catalogState === 'unavailable' ? <p className="font-serif text-[#665950]">El catálogo transaccional se está sincronizando. Puedes explorar las submarcas o solicitar información mientras finaliza la conexión.</p> : null}
            {catalogState === 'ready' && offerings.length === 0 ? <p className="font-serif text-[#665950]">Aún no hay productos publicados para venta.</p> : null}
            {offerings.map((offering) => (
              <article key={offering.id} className="flex min-h-[290px] flex-col border border-[#6f0d12]/16 bg-[#fffaf2] p-7">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[9px] font-bold uppercase tracking-[.18em] text-[#6f0d12]">{offering.offering_type}</span>
                  <span className="font-serif text-lg text-[#6f0d12]">{formatPrice(offering.price_amount, offering.currency)}</span>
                </div>
                <h3 className="mt-6 font-serif text-2xl leading-tight text-[#17110e]">{offering.title}</h3>
                <p className="mt-4 flex-1 font-serif text-[15px] leading-7 text-[#665950]">{offering.summary}</p>
                <a href={offering.access_path ?? '/contact'} className="mt-6 inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#6f0d12]">Ver información <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="instituciones" className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Instituciones educativas</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-[#17110e] sm:text-5xl">Asesoría para colegios con trazabilidad desde CTG One.</h2>
            <p className="mt-6 font-serif text-[17px] leading-8 text-[#665950]">La solicitud inicia un flujo institucional: diagnóstico, alcance, propuesta, seguimiento y contratación. No se presenta como una compra genérica porque cada institución necesita un alcance distinto.</p>
            <div className="mt-7 flex items-start gap-3 border-l border-[#6f0d12]/30 pl-5 text-sm leading-7 text-[#564a42]"><CalendarDays className="mt-1 h-4 w-4 shrink-0 text-[#6f0d12]" aria-hidden="true" /><span>Las solicitudes quedan vinculadas a la cuenta CTG One que las envía y se muestran después en su biblioteca educativa.</span></div>
          </div>

          {!isLoading && !isAuthenticated ? (
            <div className="border border-[#6f0d12]/16 bg-[#fbf7f1] p-8">
              <Building2 className="h-7 w-7 text-[#6f0d12]" aria-hidden="true" />
              <h3 className="mt-5 font-serif text-3xl text-[#17110e]">Identifícate para solicitar asesoría.</h3>
              <p className="mt-4 font-serif text-[16px] leading-7 text-[#665950]">Así la institución conserva un historial único de solicitudes, propuestas y servicios dentro del ecosistema.</p>
              <a href="/iniciar-sesion?next=/jpvalderrama/campus%23instituciones" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-sm bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">Iniciar sesión <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            </div>
          ) : (
            <form onSubmit={submitAdvisory} className="border border-[#6f0d12]/16 bg-[#fbf7f1] p-7 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Institución" name="institutionName" autoComplete="organization" />
                <Field label="Persona de contacto" name="contactName" autoComplete="name" />
                <Field label="Correo" name="contactEmail" type="email" autoComplete="email" />
                <Field label="Teléfono" name="contactPhone" type="tel" autoComplete="tel" required={false} />
              </div>
              <label className="mt-5 grid gap-2 text-sm font-semibold text-[#3e342e]">Área o necesidad
                <select name="serviceArea" required defaultValue="" className="min-h-12 border border-[#6f0d12]/22 bg-[#fffaf2] px-4 font-normal text-[#17110e] outline-none focus:border-[#6f0d12]">
                  <option value="" disabled>Seleccionar</option>
                  <option value="Formación docente">Formación docente</option>
                  <option value="Currículo y diseño pedagógico">Currículo y diseño pedagógico</option>
                  <option value="Pensamiento crítico y humanidades">Pensamiento crítico y humanidades</option>
                  <option value="Tecnología educativa e IA">Tecnología educativa e IA</option>
                  <option value="Conferencias y talleres institucionales">Conferencias y talleres institucionales</option>
                  <option value="Otra necesidad educativa">Otra necesidad educativa</option>
                </select>
              </label>
              <label className="mt-5 grid gap-2 text-sm font-semibold text-[#3e342e]">Cuéntanos el reto
                <textarea name="message" required minLength={20} maxLength={4000} rows={6} className="border border-[#6f0d12]/22 bg-[#fffaf2] px-4 py-3 font-normal text-[#17110e] outline-none focus:border-[#6f0d12]" />
              </label>
              {advisoryState === 'success' ? <p role="status" className="mt-5 text-sm leading-6 text-[#315b35]">Solicitud registrada. Ya hace parte de tu historial educativo de CTG One.</p> : null}
              {advisoryState === 'error' ? <p role="alert" className="mt-5 text-sm leading-6 text-[#6f0d12]">No pudimos registrar la solicitud. Verifica los datos e inténtalo nuevamente.</p> : null}
              <button type="submit" disabled={advisoryState === 'submitting' || isLoading} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2] disabled:cursor-wait disabled:opacity-60">{advisoryState === 'submitting' ? 'Registrando…' : 'Solicitar diagnóstico'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#3e342e]">{label}
      <input name={name} type={type} autoComplete={autoComplete} required={required} maxLength={254} className="min-h-12 border border-[#6f0d12]/22 bg-[#fffaf2] px-4 font-normal text-[#17110e] outline-none focus:border-[#6f0d12]" />
    </label>
  );
}
