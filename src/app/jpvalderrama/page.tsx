import Image from 'next/image';
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
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

const brands = [
  {
    id: 'talks',
    name: 'Valderrama Talks',
    label: 'CONFERENCIAS · CLASES · CONVERSACIONES',
    image: '/jpvalderrama/talks.webp',
    description: 'Conferencias, clases, talleres y conversaciones para convertir ideas complejas en experiencias de aprendizaje claras, rigurosas y útiles.',
    cta: 'Ver conferencias',
    href: '#conferencia',
    icon: Mic2,
  },
  {
    id: 'ideas',
    name: 'Valderrama Ideas',
    label: 'ENSAYO · ANÁLISIS · PENSAMIENTO',
    image: '/jpvalderrama/ideas.webp',
    description: 'Ensayos, columnas y marcos conceptuales sobre filosofía, educación, sociedad, tecnología, empresa y cultura.',
    cta: 'Explorar ideas',
    href: '#contacto',
    icon: Lightbulb,
  },
  {
    id: 'books',
    name: 'Valderrama Books',
    label: 'LIBROS · INVESTIGACIÓN · PUBLICACIÓN',
    image: '/jpvalderrama/books.webp',
    description: 'Libros, manuscritos, investigación de largo aliento y proyectos editoriales para pensar, aprender y profundizar.',
    cta: 'Explorar libros',
    href: '#contacto',
    icon: BookOpen,
  },
  {
    id: 'projects',
    name: 'Valderrama Projects',
    label: 'INVESTIGACIÓN · DISEÑO · CONSTRUCCIÓN',
    image: '/jpvalderrama/projects.webp',
    description: 'Proyectos interdisciplinarios donde educación, investigación, tecnología y emprendimiento pasan de la idea a productos y acciones reales.',
    cta: 'Conocer proyectos',
    href: '#contacto',
    icon: Boxes,
  },
] as const;

const education = [
  { degree: 'Filósofo', institution: 'Universidad de Cartagena', icon: Building2 },
  { degree: 'Magíster en Filosofía', institution: 'Universidad del Norte', icon: GraduationCap },
  { degree: 'Leading Change', institution: 'Harvard Business School Online', icon: Building2 },
  { degree: 'TESOL / TEFL', institution: 'Google for Education · formación docente internacional', icon: GraduationCap },
] as const;

const pillars = [
  { label: 'Filosofía', icon: Building2 },
  { label: 'Educación', icon: GraduationCap },
  { label: 'Escritura', icon: PenLine },
  { label: 'Tecnología', icon: Code2 },
  { label: 'Investigación', icon: Lightbulb },
] as const;

const eventDetails = [
  ['Fecha', '17 de septiembre'],
  ['Hora', '7:00 p. m.'],
  ['Duración', '45 minutos'],
  ['Modalidad', 'Google Meet'],
  ['Ticket', '$10.000'],
  ['Inscripciones', '3186428218'],
] as const;

const serif = 'font-serif';
const eventLabel = 'text-[10px] font-bold uppercase tracking-[.18em] text-[#665950]';

export default function JPValderramaPage() {
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Juan Pablo Valderrama Pino',
    alternateName: 'JP Valderrama',
    url: 'https://ctgone.com/jpvalderrama',
    jobTitle: ['Philosopher', 'Educator', 'Writer', 'Entrepreneur', 'Developer'],
    knowsAbout: ['Philosophy', 'Education', 'Writing', 'Technology', 'Artificial Intelligence', 'Entrepreneurship', 'Project Development'],
    founder: { '@type': 'Organization', name: 'CTG One', url: 'https://ctgone.com' },
  };

  return (
    <main className="min-h-screen bg-[#f7f0e7] text-[#19130f] selection:bg-[#6f0d12] selection:text-[#fffaf2]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <a href="#contenido" className="sr-only z-[100] rounded bg-[#6f0d12] px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>

      <header className="sticky top-0 z-50 border-b border-[#6f0d12]/10 bg-[#f7f0e7]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <a
            href="/"
            className="flex min-h-12 shrink-0 items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6f0d12]"
            aria-label="CTG One Technology, ir al inicio"
          >
            <BrandLogo priority tone="light" className="transition-transform duration-300 hover:-translate-y-px" />
          </a>
          <nav className="hidden items-center gap-7 text-[10px] font-semibold uppercase tracking-[.16em] text-[#665950] lg:flex" aria-label="Navegación JP Valderrama">
            <a href="#perfil" className="hover:text-[#6f0d12]">Perfil</a>
            <a href="#formacion" className="hover:text-[#6f0d12]">Formación</a>
            <a href="#marcas" className="hover:text-[#6f0d12]">Marcas</a>
            <a href="#conferencia" className="hover:text-[#6f0d12]">Conferencia</a>
            <a href="/contact" className="hover:text-[#6f0d12]">Contacto</a>
          </nav>
          <a href="#contenido" className="border-b border-[#6f0d12] pb-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#6f0d12]">JP Valderrama</a>
        </div>
      </header>

      <div id="contenido">
        <section className="relative overflow-hidden border-b border-[#6f0d12]/10">
          <div className="pointer-events-none absolute -right-32 top-16 h-[440px] w-[440px] rounded-full border border-[#6f0d12]/10" aria-hidden="true" />
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pb-24 lg:grid-cols-[1.03fr_.97fr] lg:items-center lg:px-12 lg:pb-28 lg:pt-20">
            <div className="max-w-3xl">
              <p className="mb-6 text-[10px] font-semibold uppercase tracking-[.25em] text-[#6f0d12]">CTG One · Educación · Ideas · Proyectos</p>
              <Image src="/jpvalderrama/brand.webp" alt="Juan Pablo Valderrama — filósofo, escritor y conferencista" width={1320} height={660} priority unoptimized className="mb-8 h-auto w-full max-w-[660px]" sizes="(max-width: 1024px) 90vw, 660px" />
              <p className="mb-5 text-[10px] font-semibold uppercase leading-6 tracking-[.16em] text-[#665950] sm:text-[11px]">Filósofo · Educador · Escritor · Empresario · Fundador de CTG One · Desarrollador</p>
              <h1 className={`${serif} text-5xl leading-[.98] tracking-[-.04em] text-[#15100d] sm:text-6xl lg:text-[4.9rem]`}>Filosofía, educación, escritura y <span className="text-[#6f0d12]">proyectos.</span></h1>
              <div className="mt-6 flex items-center gap-3" aria-hidden="true"><span className="h-px w-24 bg-[#6f0d12]" /><span className="h-2 w-2 rounded-full bg-[#6f0d12]" /><span className="h-px w-16 bg-[#6f0d12]/35" /></div>
              <p className={`${serif} mt-7 max-w-2xl text-lg leading-8 text-[#534941] sm:text-xl`}>Ideas que piensan. Educación que transforma. Escritura que permanece. Proyectos que construyen futuro.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#marcas" className="inline-flex min-h-12 items-center gap-2 rounded-sm bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2] hover:-translate-y-0.5">Explorar <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
                <a href="/contact" className="inline-flex min-h-12 items-center gap-2 rounded-sm border border-[#6f0d12]/45 px-6 text-xs font-bold uppercase tracking-[.13em] text-[#6f0d12] hover:bg-[#6f0d12]/5">Contacto <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="relative border border-[#6f0d12]/15 bg-[#fbf7f1] p-5 shadow-[0_24px_80px_rgba(72,35,24,.08)] sm:p-8">
                <div className="absolute -left-3 -top-3 h-6 w-6 border-l border-t border-[#6f0d12]/50" aria-hidden="true" />
                <div className="absolute -bottom-3 -right-3 h-6 w-6 border-b border-r border-[#6f0d12]/50" aria-hidden="true" />
                <Image src="/jpvalderrama/conference.webp" alt="Conferencia Filosofía o Dinero — El arte de comer papel" width={640} height={640} unoptimized className="mx-auto h-auto w-full max-w-[320px] sm:max-w-[360px]" sizes="(max-width: 640px) 78vw, 360px" />
              </div>
            </div>
          </div>
        </section>

        <section id="marcas" className="scroll-mt-24 py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <div className="mb-12 flex items-center gap-5"><span className="h-px flex-1 bg-[#6f0d12]/15" /><h2 className="text-center text-[11px] font-semibold uppercase tracking-[.28em] text-[#4c4038]">Mi universo de contenidos</h2><span className="h-px flex-1 bg-[#6f0d12]/15" /></div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {brands.map((brand) => (
                <article key={brand.id} id={brand.id} className="group flex h-full flex-col border border-[#6f0d12]/15 bg-[#fbf7f1] p-5 transition-transform duration-300 hover:-translate-y-1 sm:p-6">
                  <Image src={brand.image} alt={`Logo ${brand.name}`} width={420} height={420} unoptimized className="mx-auto aspect-square w-full max-w-[200px] object-contain" sizes="200px" />
                  <p className="mt-6 text-center text-[10px] font-semibold uppercase leading-5 tracking-[.18em] text-[#6f0d12]">{brand.label}</p>
                  <h3 className={`${serif} mt-3 text-center text-2xl tracking-[.05em] text-[#17110e]`}>{brand.name}</h3>
                  <p className={`${serif} mt-4 flex-1 text-center text-[15px] leading-7 text-[#665950]`}>{brand.description}</p>
                  <a href={brand.href} className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 border-t border-[#6f0d12]/12 pt-5 text-[10px] font-bold uppercase tracking-[.15em] text-[#6f0d12]">{brand.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="perfil" className="scroll-mt-24 border-y border-[#6f0d12]/10 bg-[#fbf7f1] py-20 sm:py-24">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-8 lg:grid-cols-[.95fr_1.15fr_.7fr] lg:gap-10 lg:px-12">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#6f0d12]">Perfil</p>
              <h2 className={`${serif} mt-4 text-3xl leading-tight tracking-[.04em] text-[#17110e] sm:text-4xl`}>Sobre Juan Pablo Valderrama Pino</h2>
              <div className="mt-5 h-px w-16 bg-[#6f0d12]" />
              <p className={`${serif} mt-6 text-[16px] leading-8 text-[#564a42]`}>Filósofo, educador, escritor y empresario. Fundador de CTG One y desarrollador de proyectos interdisciplinarios en educación, tecnología y cultura.</p>
              <p className={`${serif} mt-4 text-[16px] leading-8 text-[#564a42]`}>Su trabajo integra reflexión filosófica, práctica educativa, escritura, pensamiento empresarial e innovación para convertir preguntas rigurosas en aprendizaje, comunicación, producto y acción.</p>
            </div>
            <div id="formacion" className="scroll-mt-24 border-y border-[#6f0d12]/12 py-8 lg:border-x lg:border-y-0 lg:px-8 lg:py-0">
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#6f0d12]">Formación y credenciales</p>
              <div className="mt-5 divide-y divide-[#6f0d12]/10">
                {education.map(({ degree, institution, icon: Icon }) => (
                  <div key={`${degree}-${institution}`} className="flex gap-4 py-5 first:pt-0"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#6f0d12] text-[#fffaf2]"><Icon className="h-5 w-5" aria-hidden="true" /></div><div><h3 className={`${serif} text-lg text-[#1c1511]`}>{degree}</h3><p className="mt-1 text-sm leading-6 text-[#665950]">{institution}</p></div></div>
                ))}
              </div>
            </div>
            <aside className="border border-[#6f0d12]/15 bg-[#f7f0e7] p-6">
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#6f0d12]">Áreas de práctica</p>
              <div className="mt-5 divide-y divide-[#6f0d12]/10">{pillars.map(({ label, icon: Icon }) => <div key={label} className="flex items-center gap-4 py-4 first:pt-0"><Icon className="h-5 w-5 text-[#6f0d12]" aria-hidden="true" /><span className={`${serif} text-lg text-[#2b211b]`}>{label}</span></div>)}</div>
            </aside>
          </div>
        </section>

        <section id="conferencia" className="scroll-mt-24 py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <div className="grid overflow-hidden border border-[#6f0d12]/16 bg-[#fbf7f1] lg:grid-cols-[1.15fr_.85fr]">
              <div className="p-7 sm:p-10 lg:p-14">
                <p className="text-[10px] font-bold uppercase tracking-[.23em] text-[#6f0d12]">Conferencia destacada · Valderrama Talks</p>
                <h2 className={`${serif} mt-4 text-4xl leading-none tracking-[-.02em] text-[#17110e] sm:text-5xl lg:text-6xl`}>¿Filosofía o <span className="text-[#6f0d12]">Dinero?</span></h2>
                <p className={`${serif} mt-3 text-2xl italic text-[#4e4038]`}>El arte de comer papel</p>
                <div className="mt-7 h-px w-32 bg-[#6f0d12]" />
                <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {eventDetails.map(([label, value]) => (
                    <div key={label}><dt className={eventLabel}>{label}</dt><dd className={`${serif} mt-1 text-lg ${label === 'Ticket' ? 'text-[#6f0d12]' : 'text-[#241b16]'}`}>{value}</dd></div>
                  ))}
                </dl>
                <a href="/contact" className="mt-9 inline-flex min-h-12 items-center gap-2 bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.14em] text-[#fffaf2]">Solicitar información <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
              </div>
              <div className="relative flex items-center justify-center border-t border-[#6f0d12]/12 bg-[#f4eadf] p-7 lg:border-l lg:border-t-0 lg:p-10">
                <Image src="/jpvalderrama/conference.webp" alt="Pieza visual de la conferencia ¿Filosofía o Dinero?" width={640} height={640} unoptimized className="h-auto w-full max-w-[360px] shadow-[0_18px_55px_rgba(75,32,22,.12)]" sizes="360px" />
              </div>
            </div>
          </div>
        </section>

        <section id="contacto" className="scroll-mt-24 px-5 pb-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[1440px] bg-[#650b10] px-7 py-10 text-[#fff7ed] sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-14">
            <div className="max-w-3xl"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#f1d8cf]">Educación · contenido · proyectos</p><h2 className={`${serif} mt-3 text-3xl leading-tight sm:text-4xl`}>¿Colaboramos en educación, contenido o proyectos con impacto?</h2><p className={`${serif} mt-3 text-lg text-[#f1e4dd]`}>Escríbeme y conversemos sobre nuevas ideas.</p></div>
            <div className="mt-7 flex shrink-0 flex-col items-start gap-3 lg:mt-0 lg:items-end"><a href="/contact" className="inline-flex min-h-12 items-center gap-2 bg-[#fff7ed] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#650b10]">Escribir mensaje <ArrowRight className="h-4 w-4" aria-hidden="true" /></a><p className="text-sm text-[#f1e4dd]">ctgone.com/jpvalderrama · 3186428218</p></div>
          </div>
        </section>
      </div>

      <footer className="border-t border-[#6f0d12]/10 bg-[#f7f0e7]"><div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-7 text-[9px] font-semibold uppercase tracking-[.2em] text-[#665950] sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><p>CTG One · Educación · Tecnología · Desarrollo humano</p><p className="text-[#6f0d12]">ctgone.com/jpvalderrama</p></div></footer>
    </main>
  );
}
