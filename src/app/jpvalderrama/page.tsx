import {
  ArrowRight,
  BookOpen,
  Boxes,
  Building2,
  Code2,
  GraduationCap,
  Lightbulb,
  Mic2,
  PenLine,
  Quote,
  Sparkles,
} from 'lucide-react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { Container } from '@/components/ui';

const brands = [
  {
    id: 'talks',
    name: 'Valderrama Talks',
    eyebrow: 'VOZ · FORMACIÓN · CONVERSACIÓN',
    description:
      'Conferencias, clases, talleres y conversaciones para convertir ideas complejas en experiencias de aprendizaje claras, rigurosas y útiles.',
    focus: ['Filosofía y humanidades', 'Educación y pensamiento crítico', 'Liderazgo, cambio y tecnología'],
    icon: Mic2,
  },
  {
    id: 'ideas',
    name: 'Valderrama Ideas',
    eyebrow: 'ENSAYO · ANÁLISIS · PENSAMIENTO',
    description:
      'Laboratorio editorial para ensayos, columnas, análisis y marcos conceptuales sobre sociedad, educación, tecnología, empresa y cultura.',
    focus: ['Ensayos y artículos', 'Análisis de coyuntura', 'Marcos conceptuales y pensamiento aplicado'],
    icon: Lightbulb,
  },
  {
    id: 'books',
    name: 'Valderrama Books',
    eyebrow: 'LIBROS · INVESTIGACIÓN · PUBLICACIÓN',
    description:
      'Espacio para libros, manuscritos, investigación de largo aliento y proyectos editoriales que conectan filosofía, experiencia y transformación social.',
    focus: ['Obra filosófica y ensayística', 'Proyectos editoriales', 'Investigación y publicaciones'],
    icon: BookOpen,
  },
  {
    id: 'projects',
    name: 'Valderrama Projects',
    eyebrow: 'INVESTIGACIÓN · DISEÑO · CONSTRUCCIÓN',
    description:
      'Proyectos interdisciplinarios donde educación, investigación, tecnología y emprendimiento pasan de la formulación conceptual a prototipos y productos reales.',
    focus: ['Investigación aplicada', 'EdTech y productos digitales', 'Diseño y desarrollo de proyectos'],
    icon: Boxes,
  },
] as const;

const education = [
  {
    degree: 'Filosofía',
    institution: 'Universidad de Cartagena',
    detail: 'Formación de pregrado orientada a investigación, lectura crítica, argumentación y escritura filosófica.',
  },
  {
    degree: 'Maestría en Filosofía',
    institution: 'Universidad del Norte',
    detail: 'Profundización académica en investigación filosófica, problemas contemporáneos y producción de conocimiento.',
  },
  {
    degree: 'Leading Change',
    institution: 'Harvard Business School Online',
    detail: 'Formación ejecutiva enfocada en liderazgo, transformación organizacional y gestión del cambio.',
  },
  {
    degree: 'Formación docente internacional',
    institution: 'TESOL / TEFL · Google for Education',
    detail: 'Certificaciones y herramientas aplicadas a enseñanza, aprendizaje digital y diseño de experiencias educativas.',
  },
] as const;

const capabilities = [
  {
    icon: GraduationCap,
    title: 'Educación',
    text: 'Diseño de clases, tutorías, talleres, programas formativos y experiencias de aprendizaje centradas en comprensión, pensamiento crítico y aplicación.',
  },
  {
    icon: PenLine,
    title: 'Escritura',
    text: 'Investigación, ensayo, producción editorial y comunicación de ideas complejas mediante estructuras claras y argumentación rigurosa.',
  },
  {
    icon: Code2,
    title: 'Tecnología',
    text: 'Construcción y dirección de productos digitales, integración de inteligencia artificial y desarrollo de herramientas para educación y empresa.',
  },
  {
    icon: Building2,
    title: 'Emprendimiento',
    text: 'Creación y gestión de proyectos que conectan conocimiento, estrategia, tecnología, servicios y modelos de negocio dentro del ecosistema CTG One.',
  },
] as const;

export default function JPValderramaPage() {
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Juan Pablo Valderrama Pino',
    alternateName: 'JP Valderrama',
    url: 'https://ctgone.com/jpvalderrama',
    jobTitle: ['Philosopher', 'Educator', 'Writer', 'Entrepreneur', 'Developer'],
    knowsAbout: [
      'Philosophy',
      'Education',
      'Writing',
      'Technology',
      'Artificial Intelligence',
      'Entrepreneurship',
      'Project Development',
    ],
    founder: {
      '@type': 'Organization',
      name: 'CTG One',
      url: 'https://ctgone.com',
    },
  };

  return (
    <PublicPageShell contentClassName="overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />

      <section className="relative pb-20 sm:pb-24 lg:pb-28">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] opacity-70"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at 78% 18%, rgba(36,140,255,.12), transparent 31%), radial-gradient(circle at 20% 22%, rgba(214,174,86,.13), transparent 36%)',
          }}
        />
        <Container size="large">
          <div className="grid items-center gap-12 lg:grid-cols-[1.12fr_.88fr] lg:gap-16">
            <div className="max-w-4xl">
              <div className="mb-7 flex flex-wrap items-center gap-3">
                <span className="inline-flex min-h-8 items-center rounded-full border border-[#d6ae56]/25 bg-[#d6ae56]/[.07] px-3.5 font-mono text-[9px] font-semibold uppercase tracking-[.19em] text-[#f1c75b]">
                  CTG ONE · EDUCATION & IDEAS
                </span>
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/[.08] bg-white/[.025] px-3.5 font-mono text-[9px] uppercase tracking-[.16em] text-text-dim">
                  <Sparkles className="h-3.5 w-3.5 text-[#d6ae56]" aria-hidden="true" />
                  Knowledge into action
                </span>
              </div>

              <p className="mb-4 text-sm font-semibold uppercase tracking-[.18em] text-text-muted sm:text-base">
                Juan Pablo Valderrama Pino
              </p>
              <h1 className="max-w-5xl font-outfit text-5xl font-semibold tracking-[-.055em] text-white sm:text-6xl lg:text-7xl xl:text-[5.4rem] xl:leading-[.95]">
                Pensar. Enseñar. Escribir. <span className="text-[#e6bd61]">Construir.</span>
              </h1>
              <p className="mt-7 max-w-3xl text-base leading-8 text-text-muted sm:text-lg">
                Filósofo, educador, escritor, empresario, fundador de CTG One y desarrollador. Una plataforma personal para convertir conocimiento, investigación e ideas en experiencias educativas, publicaciones y proyectos reales.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  href="#marcas"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#e7bd5d]/25 bg-[#d6ae56] px-5 text-sm font-semibold text-[#071018] transition-transform hover:-translate-y-px"
                >
                  Explorar la plataforma <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href="/contact"
                  className="inline-flex min-h-12 items-center rounded-xl border border-white/[.11] bg-white/[.035] px-5 text-sm font-semibold text-white transition-colors hover:bg-white/[.07]"
                >
                  Consultar servicios educativos
                </a>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="absolute -inset-8 -z-10 rounded-full bg-[#d6ae56]/[.055] blur-3xl" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-[2rem] border border-[#d6ae56]/20 bg-[#050a10]/80 p-7 shadow-[0_32px_100px_rgba(0,0,0,.35)] backdrop-blur-xl sm:p-9">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#d6ae56]/[.065] via-transparent to-[#248cff]/[.045]" aria-hidden="true" />
                <div className="relative">
                  <div className="mb-8 flex items-center justify-between gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#d6ae56]/25 bg-[#d6ae56]/[.08] font-outfit text-2xl font-semibold tracking-[-.04em] text-[#f1c75b]">
                      JPV
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-[.2em] text-text-dim">PROFILE · 001</span>
                  </div>
                  <blockquote className="border-l border-[#d6ae56]/35 pl-5">
                    <Quote className="mb-3 h-5 w-5 text-[#d6ae56]" aria-hidden="true" />
                    <p className="font-outfit text-2xl font-medium leading-snug tracking-[-.025em] text-white sm:text-3xl">
                      El conocimiento adquiere valor cuando transforma la manera en que comprendemos y construimos el mundo.
                    </p>
                  </blockquote>
                  <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
                    {['Filosofía', 'Educación', 'Escritura', 'Tecnología'].map((item) => (
                      <div key={item} className="rounded-xl border border-white/[.07] bg-black/20 px-4 py-3 text-text-muted">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-white/[.06] bg-white/[.012] py-20 sm:py-24">
        <Container size="large">
          <div className="grid gap-12 lg:grid-cols-[.78fr_1.22fr] lg:gap-20">
            <div>
              <p className="mb-4 font-mono text-[9px] font-semibold uppercase tracking-[.2em] text-[#f1c75b]">PERFIL</p>
              <h2 className="font-outfit text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
                Humanidades, educación y tecnología en una misma práctica.
              </h2>
              <p className="mt-5 text-sm leading-7 text-text-muted sm:text-base">
                JP Valderrama integra formación filosófica, experiencia docente, escritura, liderazgo de proyectos y desarrollo tecnológico. La propuesta educativa no separa teoría y práctica: parte de preguntas rigurosas y termina en aprendizaje, comunicación, producto o acción.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-2xl border border-white/[.07] bg-[#050a10]/65 p-6">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6ae56]/20 bg-[#d6ae56]/[.065] text-[#f1c75b]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-outfit text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24 lg:py-28">
        <Container size="large">
          <div className="mb-12 max-w-3xl">
            <p className="mb-4 font-mono text-[9px] font-semibold uppercase tracking-[.2em] text-[#f1c75b]">FORMACIÓN ACADÉMICA</p>
            <h2 className="font-outfit text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
              Base académica para una práctica interdisciplinaria.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {education.map((item, index) => (
              <article key={`${item.degree}-${item.institution}`} className="group rounded-2xl border border-white/[.07] bg-[#050a10]/55 p-6 sm:p-7">
                <div className="flex gap-5">
                  <span className="mt-1 font-mono text-[10px] tracking-[.16em] text-[#d6ae56]">0{index + 1}</span>
                  <div>
                    <h3 className="font-outfit text-xl font-semibold text-white sm:text-2xl">{item.degree}</h3>
                    <p className="mt-1 text-sm font-semibold text-[#e6bd61]">{item.institution}</p>
                    <p className="mt-4 text-sm leading-6 text-text-muted">{item.detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="marcas" className="border-y border-white/[.06] bg-[#03070b]/60 py-20 sm:py-24 lg:py-28 scroll-mt-28">
        <Container size="large">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="mb-4 font-mono text-[9px] font-semibold uppercase tracking-[.2em] text-[#f1c75b]">JP VALDERRAMA · PLATFORM</p>
              <h2 className="font-outfit text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl md:text-5xl">
                Cuatro marcas. Un mismo sistema de conocimiento.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-text-muted">
              Cada submarca ocupa una función específica: hablar, pensar, publicar y construir. Juntas forman la vertical educativa y editorial de CTG One.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {brands.map(({ icon: Icon, ...brand }, index) => (
              <article
                id={brand.id}
                key={brand.id}
                className="group relative scroll-mt-28 overflow-hidden rounded-[1.75rem] border border-white/[.075] bg-[#050a10]/75 p-7 sm:p-8"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#d6ae56]/[.045] via-transparent to-[#248cff]/[.025] opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
                <div className="relative">
                  <div className="mb-8 flex items-start justify-between gap-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d6ae56]/20 bg-[#d6ae56]/[.065] text-[#f1c75b]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="font-mono text-[9px] tracking-[.18em] text-text-dim">0{index + 1}</span>
                  </div>
                  <p className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#d6ae56]">{brand.eyebrow}</p>
                  <h3 className="mt-3 font-outfit text-3xl font-semibold tracking-[-.035em] text-white">{brand.name}</h3>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-text-muted">{brand.description}</p>
                  <div className="mt-7 flex flex-wrap gap-2">
                    {brand.focus.map((item) => (
                      <span key={item} className="rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5 text-xs text-text-muted">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24 lg:py-28">
        <Container size="large">
          <div className="relative overflow-hidden rounded-[2rem] border border-[#d6ae56]/20 bg-[#050a10]/80 px-7 py-10 sm:px-10 sm:py-12 lg:px-14">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#d6ae56]/[.075] via-transparent to-[#248cff]/[.045]" aria-hidden="true" />
            <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl">
                <p className="mb-4 font-mono text-[9px] font-semibold uppercase tracking-[.2em] text-[#f1c75b]">SERVICIOS EDUCATIVOS</p>
                <h2 className="font-outfit text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">
                  Aprender, pensar y construir con propósito.
                </h2>
                <p className="mt-5 text-sm leading-7 text-text-muted sm:text-base">
                  La plataforma está preparada para ofrecer clases y tutorías, conferencias, talleres, acompañamiento académico, investigación, escritura, diseño de proyectos educativos y desarrollo de iniciativas interdisciplinarias para personas e instituciones.
                </p>
              </div>
              <a
                href="/contact"
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e7bd5d]/25 bg-[#d6ae56] px-5 text-sm font-semibold text-[#071018] transition-transform hover:-translate-y-px"
              >
                Contactar <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </Container>
      </section>
    </PublicPageShell>
  );
}
