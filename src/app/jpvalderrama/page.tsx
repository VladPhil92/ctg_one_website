import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

const visual = (name: string) => `/api/jpvalderrama/assets/${name}`;

const subbrands = [
  {
    name: 'Valderrama Talks',
    shortName: 'Talks',
    label: 'CONFERENCIAS · CLASES · CONVERSACIONES',
    image: 'waveform',
    width: 1536,
    height: 1536,
    href: '/jpvalderrama/talks',
    copy: 'La palabra como espacio de formación: conferencias, clases y conversaciones para públicos diversos.',
  },
  {
    name: 'Valderrama Ideas',
    shortName: 'Ideas',
    label: 'ENSAYO · ANÁLISIS · PENSAMIENTO',
    image: 'ideas-button',
    width: 1536,
    height: 1536,
    href: '/jpvalderrama/ideas',
    copy: 'Ensayos y marcos conceptuales sobre filosofía, educación, sociedad, tecnología, empresa y cultura.',
  },
  {
    name: 'Valderrama Books',
    shortName: 'Books',
    label: 'LIBROS · INVESTIGACIÓN · PUBLICACIÓN',
    image: 'books-desk',
    width: 1536,
    height: 1536,
    href: '/jpvalderrama/books',
    copy: 'Investigación de largo aliento, manuscritos y proyectos editoriales concebidos para permanecer.',
  },
  {
    name: 'Valderrama Projects',
    shortName: 'Projects',
    label: 'IDEAS · TECNOLOGÍA · CONSTRUCCIÓN',
    image: 'projects-button',
    width: 1536,
    height: 1536,
    href: '/jpvalderrama/projects',
    copy: 'Ideas convertidas en proyectos mediante educación, investigación, tecnología y emprendimiento.',
  },
] as const;

const credentials = ['Filósofo', 'Educador', 'Escritor', 'Empresario', 'Desarrollador'] as const;

export default function JPValderramaPage() {
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Juan Pablo Valderrama Pino',
    alternateName: 'JP Valderrama',
    url: 'https://ctgone.com/jpvalderrama',
    jobTitle: ['Philosopher', 'Educator', 'Writer', 'Entrepreneur', 'Developer'],
    knowsAbout: ['Philosophy', 'Education', 'Writing', 'Technology', 'Entrepreneurship'],
    founder: { '@type': 'Organization', name: 'CTG One', url: 'https://ctgone.com' },
  };

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#151515] selection:bg-[#681F27] selection:text-[#FCFBF8]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <a href="#contenido" className="sr-only z-[100] rounded bg-[#681F27] px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>

      <header className="sticky top-0 z-50 border-b border-[#151515]/10 bg-[#FCFBF8]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-[1500px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <a href="/" aria-label="CTG One, ir al inicio" className="flex min-h-12 items-center"><BrandLogo priority tone="light" /></a>
          <nav className="hidden items-center gap-7 text-[10px] font-semibold uppercase tracking-[.16em] text-[#414141] lg:flex" aria-label="Navegación JP Valderrama">
            <a href="#pensamiento" className="transition hover:text-[#681F27]">Pensamiento</a>
            <a href="#universo" className="transition hover:text-[#681F27]">Universo</a>
            <a href="#talks" className="transition hover:text-[#681F27]">Talks</a>
            <a href="#perfil" className="transition hover:text-[#681F27]">Perfil</a>
          </nav>
          <a href="#contacto" className="border border-[#681F27] px-3 py-2.5 text-[9px] font-bold uppercase tracking-[.16em] text-[#681F27] transition hover:bg-[#681F27] hover:text-[#FCFBF8] sm:px-4 sm:text-[10px]">Contacto</a>
        </div>
      </header>

      <div id="contenido">
        <section className="border-b border-[#151515]/10 bg-[#F3EFE6]">
          <div className="mx-auto grid max-w-[1500px] gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[760px] lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:gap-14 lg:px-12 lg:py-20">
            <div className="order-2 lg:order-1">
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.22em] text-[#681F27] sm:text-[11px]">
                <span className="h-px w-10 bg-[#681F27]" aria-hidden="true" />
                Filosofía aplicada al presente
              </div>
              <h1 className="mt-7 max-w-[680px] font-serif text-5xl font-normal leading-[.98] tracking-[-.035em] text-[#151515] sm:text-6xl lg:text-[4.5rem] xl:text-[5rem]">Ideas que piensan. Proyectos que transforman.</h1>
              <p className="mt-7 max-w-[610px] text-base leading-8 text-[#414141] sm:text-lg">Un espacio editorial para filosofía, educación, escritura, conferencias y proyectos interdisciplinarios. La tradición intelectual como herramienta para comprender y construir el presente.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#universo" className="inline-flex min-h-12 items-center gap-2 bg-[#151515] px-6 text-[10px] font-bold uppercase tracking-[.15em] text-white transition hover:bg-[#681F27] sm:text-xs">Explorar universo <ArrowRight className="h-4 w-4" /></a>
                <a href="#perfil" className="inline-flex min-h-12 items-center gap-2 border border-[#151515]/70 px-6 text-[10px] font-bold uppercase tracking-[.15em] text-[#151515] transition hover:border-[#681F27] hover:text-[#681F27] sm:text-xs">Conocer perfil <ArrowRight className="h-4 w-4" /></a>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-5 gap-y-3 border-t border-[#151515]/12 pt-5 text-[9px] font-semibold uppercase tracking-[.14em] text-[#666] sm:text-[10px]">
                {credentials.map((credential) => <span key={credential}>{credential}</span>)}
              </div>
            </div>

            <figure className="relative order-1 lg:order-2">
              <div className="pointer-events-none absolute -bottom-5 -right-4 left-8 top-5 border border-[#681F27]/25" aria-hidden="true" />
              <div className="relative overflow-hidden bg-[#FCFBF8] shadow-[0_26px_70px_rgba(40,22,18,.10)]">
                <Image src={visual('philosophy-technology')} alt="Filosofía clásica, libros, tecnología y ciudad contemporánea" width={1536} height={864} priority unoptimized className="aspect-[4/3] h-auto w-full object-cover lg:aspect-[16/10]" sizes="(max-width: 1024px) 100vw, 58vw" />
                <figcaption className="absolute bottom-3 right-3 bg-[#FCFBF8]/92 px-3 py-2 text-[8px] font-semibold uppercase tracking-[.14em] text-[#414141] sm:bottom-5 sm:right-5 sm:text-[9px]">Tradición intelectual · presente tecnológico</figcaption>
              </div>
            </figure>
          </div>
        </section>

        <section id="pensamiento" className="scroll-mt-24 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <div className="mb-9 grid gap-5 lg:grid-cols-[.55fr_1.45fr] lg:gap-16">
              <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#681F27]">Método intelectual</p></div>
              <div><h2 className="font-serif text-4xl font-normal leading-[1.06] tracking-[-.025em] text-[#151515] sm:text-5xl">Mapa del pensamiento</h2><p className="mt-5 max-w-3xl text-base leading-8 text-[#414141] sm:text-[17px]">De la persona que pregunta al argumento, la contradicción y el concepto; y del concepto nuevamente a la sociedad. Una cartografía de la filosofía entendida como práctica viva.</p></div>
            </div>
            <figure className="border border-[#151515]/12 bg-[#F3EFE6] p-2.5 sm:p-4">
              <Image src={visual('thought-map')} alt="Mapa del Pensamiento: persona, pregunta, argumento, contradicción, concepto y sociedad" width={1536} height={864} unoptimized className="h-auto w-full" sizes="100vw" />
              <figcaption className="flex flex-col gap-2 px-1 pt-3 text-[10px] uppercase tracking-[.12em] text-[#777] sm:flex-row sm:items-center sm:justify-between"><span>Persona → Pregunta → Argumento → Contradicción → Concepto → Sociedad</span><span>Pensar es ordenar lo invisible</span></figcaption>
            </figure>
          </div>
        </section>

        <section id="universo" className="scroll-mt-24 border-y border-[#151515]/10 bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <div className="mb-10 grid gap-5 lg:grid-cols-[.55fr_1.45fr] lg:gap-16">
              <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#681F27]">Universo JP Valderrama</p></div>
              <div><h2 className="font-serif text-4xl font-normal leading-[1.06] tracking-[-.025em] text-[#151515] sm:text-5xl">Cuatro líneas de trabajo. Una misma identidad intelectual.</h2><p className="mt-5 max-w-3xl text-base leading-8 text-[#414141] sm:text-[17px]">Talks, Ideas, Books y Projects forman una colección editorial coherente: palabra, pensamiento, escritura y construcción.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {subbrands.map((brand) => (
                <a key={brand.name} href={brand.href} className="group flex min-h-full flex-col border border-[#151515]/12 bg-[#FCFBF8] p-4 transition duration-300 hover:-translate-y-1 hover:border-[#681F27]/35 hover:shadow-[0_20px_55px_rgba(40,22,18,.08)]">
                  <div className="flex aspect-square items-center justify-center overflow-hidden bg-[#F3EFE6] p-2">
                    <Image src={visual(brand.image)} alt={`Identidad oficial de ${brand.name}`} width={brand.width} height={brand.height} unoptimized className="h-full w-full object-contain" sizes="(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 320px" />
                  </div>
                  <div className="flex flex-1 flex-col px-1 pb-1 pt-5">
                    <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#681F27]">{brand.label}</p>
                    <h3 className="mt-2 font-serif text-3xl font-normal text-[#151515]">{brand.shortName}</h3>
                    <p className="mt-3 flex-1 text-[13px] leading-6 text-[#5B5B5B]">{brand.copy}</p>
                    <span className="mt-6 inline-flex items-center gap-2 border-t border-[#151515]/10 pt-4 text-[9px] font-bold uppercase tracking-[.14em] text-[#151515] transition group-hover:text-[#681F27]">Entrar <ArrowRight className="h-3.5 w-3.5" /></span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="talks" className="scroll-mt-24 bg-[#151515] py-16 text-[#FCFBF8] sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 sm:px-8 lg:grid-cols-[1.18fr_.82fr] lg:items-center lg:gap-14 lg:px-12">
            <div className="overflow-hidden border border-white/10 bg-black">
              <Image src={visual('conference-hero')} alt="Escenario editorial de Valderrama Talks" width={1536} height={864} unoptimized className="h-auto w-full object-cover" sizes="(max-width: 1024px) 100vw, 60vw" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#D4AEB3]">Valderrama Talks · Conferencia destacada</p>
              <h2 className="mt-4 font-serif text-4xl font-normal leading-[1.02] tracking-[-.025em] text-white sm:text-5xl lg:text-6xl">¿Filosofía o Dinero?</h2>
              <p className="mt-3 font-serif text-2xl italic text-[#D6D0CB]">El arte de comer papel</p>
              <p className="mt-6 text-base leading-8 text-[#D0D0D0]">Una conversación sobre vocación, expectativas sociales, economía y el lugar que siguen ocupando las ideas en una vida práctica.</p>
              <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-4">
                {[
                  ['Fecha', '17 de septiembre'],
                  ['Hora', '7:00 p. m.'],
                  ['Duración', '45 minutos'],
                  ['Modalidad', 'Google Meet'],
                  ['Ticket', '$10.000'],
                  ['Inscripciones', '3186428218'],
                ].map(([label, value]) => <div key={label} className="border-t border-white/15 pt-3"><span className="block text-[9px] uppercase tracking-[.14em] text-[#A8A8A8]">{label}</span><strong className="mt-1 block text-sm font-medium text-white sm:text-[15px]">{value}</strong></div>)}
              </div>
              <a href="/jpvalderrama/talks#inscripcion" className="mt-8 inline-flex min-h-12 items-center gap-2 bg-[#681F27] px-6 text-[10px] font-bold uppercase tracking-[.15em] text-white transition hover:bg-[#7A252F] sm:text-xs">Inscribirme <ArrowRight className="h-4 w-4" /></a>
            </div>
          </div>
        </section>

        <section id="perfil" className="scroll-mt-24 bg-[#F3EFE6] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 sm:px-8 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:gap-16 lg:px-12">
            <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden border border-[#151515]/12 bg-[#FCFBF8] p-6 sm:min-h-[420px] sm:p-10 lg:min-h-[500px]">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#681F27]/20" aria-hidden="true" />
              <div className="pointer-events-none absolute bottom-8 left-8 h-28 w-28 rounded-full bg-[#681F27]/[.06]" aria-hidden="true" />
              <Image src={visual('jp-icon')} alt="Juan Pablo Valderrama — filósofo, escritor y conferencista" width={1536} height={768} unoptimized className="relative z-10 h-auto w-full object-contain" sizes="(max-width: 1024px) 90vw, 44vw" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#681F27]">Perfil</p>
              <h2 className="mt-4 font-serif text-4xl font-normal leading-[1.05] tracking-[-.025em] text-[#151515] sm:text-5xl lg:text-6xl">Pensamiento, educación y construcción.</h2>
              <p className="mt-6 text-base leading-8 text-[#414141] sm:text-[17px]">Juan Pablo Valderrama Pino es filósofo, educador, escritor y empresario. Fundador de CTG One y desarrollador de proyectos interdisciplinarios en educación, tecnología y cultura.</p>
              <p className="mt-4 text-base leading-8 text-[#414141] sm:text-[17px]">Su trabajo integra reflexión filosófica, práctica educativa, escritura, pensamiento empresarial e innovación para convertir preguntas rigurosas en aprendizaje, comunicación, producto y acción.</p>
              <div className="mt-7 flex flex-wrap gap-2">
                {credentials.map((credential) => <span key={credential} className="border border-[#151515]/15 bg-white/40 px-3 py-2 text-[9px] font-semibold uppercase tracking-[.10em] text-[#414141]">{credential}</span>)}
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="border-t border-[#151515]/12 pt-3"><strong className="font-serif text-lg font-normal">Filosofía</strong><span className="mt-1 block text-[10px] text-[#666]">Universidad de Cartagena</span></div>
                <div className="border-t border-[#151515]/12 pt-3"><strong className="font-serif text-lg font-normal">Magíster en Filosofía</strong><span className="mt-1 block text-[10px] text-[#666]">Universidad del Norte</span></div>
                <div className="border-t border-[#151515]/12 pt-3"><strong className="font-serif text-lg font-normal">Leading Change</strong><span className="mt-1 block text-[10px] text-[#666]">Harvard Business School Online</span></div>
                <div className="border-t border-[#151515]/12 pt-3"><strong className="font-serif text-lg font-normal">Educación bilingüe</strong><span className="mt-1 block text-[10px] text-[#666]">TESOL / TEFL · Google for Education</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-20 text-center sm:py-24 lg:py-28">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <Image src={visual('jp-icon')} alt="Marca Juan Pablo Valderrama" width={1536} height={768} unoptimized className="mx-auto h-auto w-[220px] object-contain sm:w-[260px]" sizes="260px" />
            <blockquote className="mx-auto mt-8 max-w-4xl font-serif text-3xl font-normal leading-[1.18] tracking-[-.02em] text-[#151515] sm:text-4xl lg:text-5xl">“La filosofía no explica el mundo, lo transforma.”</blockquote>
            <p className="mt-6 text-[9px] font-semibold uppercase tracking-[.18em] text-[#777]">Juan Pablo Valderrama</p>
          </div>
        </section>

        <section id="contacto" className="border-t border-white/10 bg-[#111] py-14 text-[#FCFBF8] sm:py-16">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12">
            <div className="max-w-3xl"><p className="text-[10px] font-semibold uppercase tracking-[.20em] text-[#D4AEB3]">Educación · contenido · proyectos</p><h2 className="mt-4 font-serif text-3xl font-normal leading-tight text-white sm:text-4xl">Conferencias, proyectos editoriales, educación y desarrollo institucional.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[#AAA] sm:text-base">Un punto de encuentro para convertir ideas en conversaciones, aprendizaje y proyectos concretos.</p></div>
            <a href="/contact" className="inline-flex min-h-12 shrink-0 items-center gap-2 border border-white px-6 text-[10px] font-bold uppercase tracking-[.15em] text-white transition hover:border-[#681F27] hover:bg-[#681F27] sm:text-xs">Escribir mensaje <ArrowRight className="h-4 w-4" /></a>
          </div>
        </section>
      </div>

      <footer className="border-t border-white/10 bg-[#111] text-[#EEE]"><div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-8 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-12"><div><p className="font-serif text-2xl tracking-[.04em] text-white">Juan Pablo Valderrama</p><p className="mt-1 text-[10px] text-[#999]">Filosofía · Educación · Escritura · Proyectos</p></div><div className="flex flex-wrap gap-4 text-[9px] font-semibold uppercase tracking-[.14em] text-[#BBB]"><a href="/jpvalderrama/talks" className="hover:text-white">Talks</a><a href="/jpvalderrama/ideas" className="hover:text-white">Ideas</a><a href="/jpvalderrama/books" className="hover:text-white">Books</a><a href="/jpvalderrama/projects" className="hover:text-white">Projects</a><a href="/contact" className="hover:text-white">Contacto</a></div></div></footer>
    </main>
  );
}
