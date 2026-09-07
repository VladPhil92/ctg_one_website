import { ArrowRight, CheckCircle2, CircleDollarSign, GraduationCap, MessagesSquare } from 'lucide-react';

const rails = [
  {
    icon: CircleDollarSign,
    title: 'Producto pagado',
    examples: 'Talks con ticket, libros y recursos de pago',
    steps: ['Explora la oferta', 'Inicia sesión con CTG One', 'Crea una orden con precio server-side', 'Completa y reporta el pago', 'Tras la verificación recibes el entitlement y acceso'],
  },
  {
    icon: GraduationCap,
    title: 'Aprendizaje gratuito',
    examples: 'Cursos y recursos sin costo',
    steps: ['Explora la oferta', 'Inicia sesión', 'Activa el acceso gratuito', 'Se crea entitlement + matrícula', 'Continúa desde Mi aprendizaje'],
  },
  {
    icon: MessagesSquare,
    title: 'Servicio a medida',
    examples: 'Tutorías, conferencias privadas, proyectos y asesoría institucional',
    steps: ['Describe la necesidad', 'Registramos la solicitud', 'Definimos alcance, agenda y cotización', 'Se formaliza la contratación', 'El seguimiento vive en tu dashboard educativo'],
  },
] as const;

export function EducationCommerceJourney({ compact = false }: { compact?: boolean }) {
  return (
    <section id="como-comprar" className={compact ? 'py-10' : 'bg-[#17110e] px-5 py-16 text-[#fffaf2] sm:px-8 lg:px-12 lg:py-24'}>
      <div className="mx-auto max-w-[1180px]">
        {!compact ? (
          <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#d8b56a]">Una sola cuenta · tres carriles</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight tracking-[-.025em] sm:text-5xl">De la intención al acceso, sin rutas paralelas.</h2>
            </div>
            <p className="max-w-2xl font-serif text-[17px] leading-8 text-[#d7ccc3] lg:justify-self-end">
              La naturaleza de la oferta determina el flujo. Ningún pago pendiente se presenta como acceso concedido y ningún servicio a medida se fuerza dentro de un checkout con precio ficticio.
            </p>
          </div>
        ) : null}

        <div className={`grid gap-4 ${compact ? 'md:grid-cols-3' : 'mt-10 md:grid-cols-3'}`}>
          {rails.map((rail, index) => {
            const Icon = rail.icon;
            return (
              <article key={rail.title} className={compact ? 'border border-white/10 bg-white/[.035] p-5' : 'border border-white/10 bg-white/[.035] p-6 sm:p-7'}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8b56a]/35 text-[#d8b56a]"><Icon className="h-4 w-4" aria-hidden="true" /></div>
                  <span className="font-serif text-2xl text-[#d8b56a]/55">0{index + 1}</span>
                </div>
                <h3 className="mt-5 font-serif text-2xl">{rail.title}</h3>
                <p className="mt-2 min-h-12 text-xs leading-5 text-[#bcaea4]">{rail.examples}</p>
                <ol className="mt-5 space-y-3">
                  {rail.steps.map((step, stepIndex) => (
                    <li key={step} className="flex gap-3 text-sm leading-6 text-[#e2d8cf]">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#d8b56a]" aria-hidden="true" />
                      <span><strong className="font-semibold text-[#fffaf2]">{stepIndex + 1}.</strong> {step}</span>
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </div>

        {!compact ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/jpvalderrama/campus#catalogo" className="inline-flex min-h-11 items-center gap-2 bg-[#d8b56a] px-5 text-[10px] font-bold uppercase tracking-[.14em] text-[#17110e]">
              Explorar catálogo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="/dashboard/educacion" className="inline-flex min-h-11 items-center gap-2 border border-white/18 px-5 text-[10px] font-bold uppercase tracking-[.14em] text-[#fffaf2]">
              Ir a Mi aprendizaje <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
