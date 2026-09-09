import Image from 'next/image';
import { ArrowRight, CheckCircle2, FileSearch, Layers3, Route, Wrench } from 'lucide-react';
import { EducationAxisCatalog } from '@/components/jpvalderrama/EducationAxisCatalog';
import { JPSubbrandLanding } from '@/components/jpvalderrama/JPValderramaShell';

const cards = [
  {
    title: 'Investigación aplicada',
    text: 'Preguntas y marcos teóricos transformados en diagnósticos, metodologías y soluciones que puedan probarse en contextos educativos, sociales u organizacionales.',
  },
  {
    title: 'EdTech y producto',
    text: 'Diseño y desarrollo de herramientas digitales que conectan aprendizaje, inteligencia artificial, experiencia de usuario y necesidades operativas reales.',
  },
  {
    title: 'Diseño interdisciplinario',
    text: 'Proyectos donde filosofía, educación, escritura, tecnología y emprendimiento se combinan para construir nuevas experiencias, servicios o sistemas.',
  },
] as const;

const colombiaBilingueFacts = [
  ['Niveles', 'A1 a B2'],
  ['Frecuencia', 'Dos clases semanales'],
  ['Horario', 'Martes y jueves · 6:00 p. m.'],
  ['Duración', '1 hora por clase'],
  ['Modalidad', 'Online vía Google Meet'],
  ['Participantes', 'Sin límite de cupos'],
] as const;

const classroomBenefits = [
  'Acceso con correo Gmail para ingresar a Google Classroom.',
  'Actividades de refuerzo para consolidar lo trabajado en clase.',
  'Actividades de profundización para ampliar competencias y práctica.',
  'Evaluaciones para hacer seguimiento al progreso de cada participante.',
] as const;

const projectPath = [
  { icon: FileSearch, title: 'Diagnóstico', text: 'Se define el problema, los usuarios, la evidencia disponible y las restricciones antes de ofrecer una solución.' },
  { icon: Route, title: 'Diseño de alcance', text: 'Objetivos, entregables, cronograma, responsabilidades y criterios de éxito quedan explícitos en una propuesta.' },
  { icon: Wrench, title: 'Construcción', text: 'La intervención puede combinar investigación, formación, diseño de servicio, contenidos o tecnología según el caso.' },
  { icon: Layers3, title: 'Evidencia y continuidad', text: 'El resultado se documenta y, cuando corresponde, se convierte en recurso, programa o caso publicable.' },
] as const;

export default function ValderramaProjectsPage() {
  return (
    <JPSubbrandLanding
      active="projects"
      image="/jpvalderrama/projects.webp"
      imageAlt="Logo Valderrama Projects"
      eyebrow="Valderrama Projects · Investigación · Diseño · Construcción"
      headline="Ideas que se convierten en sistemas, productos y acción."
      intro="Valderrama Projects es el laboratorio aplicado de JP Valderrama: el punto donde investigación, educación, tecnología y emprendimiento dejan de ser categorías separadas y pasan a construir soluciones concretas."
      cards={cards}
      statusTitle="Portafolio basado en evidencia, no en promesas."
      statusText="Cada caso se incorpora cuando existe información suficiente para describir problema, proceso, alcance y resultado. Los servicios a medida permanecen separados del checkout de productos con precio fijo y comienzan siempre por un brief verificable."
    >
      <section className="border-y border-[#6f0d12]/10 bg-[#fffaf2] px-5 py-14 text-[#17110e] sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-8 flex flex-col gap-3 border-b border-[#6f0d12]/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Primer Project · Inscripciones abiertas</p>
              <h2 className="mt-3 font-serif text-4xl leading-[1.02] sm:text-5xl lg:text-6xl">Colombia Bilingüe</h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#665a53] sm:text-right">Más idiomas, más oportunidades y una educación accesible para aprender de forma constante.</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[.92fr_1.08fr] lg:items-start lg:gap-12">
            <figure className="mx-auto w-full max-w-[360px] overflow-hidden border border-[#6f0d12]/12 bg-white p-2 shadow-[0_24px_70px_rgba(70,36,24,.10)] lg:max-w-[420px]">
              <Image
                src="/jpvalderrama/colombia-bilingue.webp"
                alt="Proyecto Colombia Bilingüe, clases de inglés online de A1 a B2"
                width={240}
                height={240}
                className="h-auto w-full"
                sizes="(max-width: 1024px) 100vw, 46vw"
              />
            </figure>

            <div>
              <p className="font-serif text-2xl leading-9 sm:text-3xl sm:leading-10">
                Dos clases semanales de inglés online por <strong className="font-semibold text-[#6f0d12]">$25.000 COP al mes</strong> por participante.
              </p>
              <p className="mt-5 text-sm leading-7 text-[#665a53]">
                Colombia Bilingüe está diseñado como un programa abierto: no hay límite de participantes. Cada estudiante accede con su correo Gmail para utilizar Google Classroom y mantener un proceso continuo entre las sesiones en vivo.
              </p>

              <div className="mt-7 grid gap-px overflow-hidden border border-[#6f0d12]/12 bg-[#6f0d12]/12 sm:grid-cols-2">
                {colombiaBilingueFacts.map(([label, value]) => (
                  <div key={label} className="bg-[#fffaf2] p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#8a6d61]">{label}</p>
                    <p className="mt-1.5 text-sm font-semibold leading-6 text-[#2a211d]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-7 border-l-2 border-[#6f0d12] pl-5">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#6f0d12]">Google Classroom</p>
                <div className="mt-4 grid gap-3">
                  {classroomBenefits.map((benefit) => (
                    <div key={benefit} className="flex items-start gap-3 text-sm leading-6 text-[#544842]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6f0d12]" aria-hidden="true" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-4 border-t border-[#6f0d12]/15 pt-7 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#8a6d61]">Mensualidad por persona</p>
                  <p className="mt-1 font-serif text-4xl text-[#6f0d12]">$25.000 COP</p>
                  <p className="mt-2 font-serif text-xl italic text-[#2a211d]">Educación para todos.</p>
                </div>
                <a
                  href="https://wa.me/573186428218?text=Hola%2C%20quiero%20inscribirme%20en%20Colombia%20Biling%C3%BCe"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#6f0d12] px-6 text-[10px] font-bold uppercase tracking-[.14em] text-white transition hover:bg-[#581014]"
                >
                  Inscribirme
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#6f0d12]/10 bg-[#17110e] px-5 py-16 text-[#fffaf2] sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#d8b56a]">Ruta de contratación</p><h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Un proyecto no se compra como un ticket.</h2></div>
            <p className="max-w-2xl font-serif text-[17px] leading-8 text-[#d7ccc3] lg:justify-self-end">El valor depende del problema, el alcance y los entregables. Por eso Projects usa un flujo de solicitud y propuesta antes de cualquier contratación, en lugar de inventar un precio uniforme.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {projectPath.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="border border-white/10 bg-white/[.035] p-6"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-[#d8b56a]" aria-hidden="true" /><span className="font-serif text-xl text-[#d8b56a]/55">0{index + 1}</span></div><h3 className="mt-5 font-serif text-xl">{title}</h3><p className="mt-3 text-sm leading-7 text-[#c9bdb4]">{text}</p></article>
            ))}
          </div>
          <a href="/jpvalderrama/campus#instituciones" className="mt-8 inline-flex min-h-12 items-center gap-2 bg-[#d8b56a] px-6 text-[10px] font-bold uppercase tracking-[.14em] text-[#17110e]">Plantear un proyecto <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
        </div>
      </section>

      <EducationAxisCatalog axis="projects" title="Otros programas publicados" intro="Los proyectos que evolucionan hacia programas con alcance y condiciones estandarizadas aparecen aquí. Colombia Bilingüe queda destacado como el primer Project activo con condiciones de acceso publicadas." />
    </JPSubbrandLanding>
  );
}
