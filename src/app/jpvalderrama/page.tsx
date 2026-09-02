import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

const visual = (name: string) => `/api/jpvalderrama/assets/${name}`;

const subbrands = [
  {
    name: 'Valderrama Talks',
    label: 'CONFERENCIAS · CLASES · CONVERSACIONES',
    image: 'waveform',
    width: 1536,
    height: 512,
    href: '/jpvalderrama/talks',
    copy: 'La palabra como espacio de formación: conferencias, clases y conversaciones para públicos diversos.',
  },
  {
    name: 'Valderrama Ideas',
    label: 'ENSAYO · ANÁLISIS · PENSAMIENTO',
    image: 'ideas-button',
    width: 1536,
    height: 1536,
    href: '/jpvalderrama/ideas',
    copy: 'Ensayos y marcos conceptuales sobre filosofía, educación, sociedad, tecnología, empresa y cultura.',
  },
  {
    name: 'Valderrama Books',
    label: 'LIBROS · INVESTIGACIÓN · PUBLICACIÓN',
    image: 'books-desk',
    width: 1536,
    height: 1024,
    href: '/jpvalderrama/books',
    copy: 'Investigación de largo aliento, manuscritos y proyectos editoriales concebidos para permanecer.',
  },
  {
    name: 'Valderrama Projects',
    label: 'IDEAS · TECNOLOGÍA · CONSTRUCCIÓN',
    image: 'philosophy-technology',
    width: 1536,
    height: 864,
    href: '/jpvalderrama/projects',
    copy: 'Ideas convertidas en proyectos mediante educación, investigación, tecnología y emprendimiento.',
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
    founder: { '@type': 'Organization', name: 'CTG One', url: 'https://ctgone.com' },
  };

  return (
    <main className="min-h-screen bg-[#f7f0e7] text-[#19130f] selection:bg-[#6f0d12] selection:text-[#fffaf2]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <a href="#contenido" className="sr-only z-[100] rounded bg-[#6f0d12] px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>

      <header className="sticky top-0 z-50 border-b border-[#6f0d12]/10 bg-[#f7f0e7]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-[1500px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <a href="/" aria-label="CTG One, ir al inicio" className="flex min-h-12 items-center"><BrandLogo priority tone="light" /></a>
          <nav className="hidden items-center gap-7 text-[10px] font-semibold uppercase tracking-[.16em] text-[#665950] lg:flex" aria-label="Navegación JP Valderrama">
            <a href="#mapa" className="hover:text-[#6f0d12]">Pensamiento</a>
            <a href="#marcas" className="hover:text-[#6f0d12]">Marcas</a>
            <a href="#perfil" className="hover:text-[#6f0d12]">Perfil</a>
            <a href="#conferencia" className="hover:text-[#6f0d12]">Conferencia</a>
            <a href="#contacto" className="hover:text-[#6f0d12]">Contacto</a>
          </nav>
          <a href="#contenido" className="flex items-center gap-2 border-b border-[#6f0d12] pb-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#6f0d12]">
            <Image src={visual('jp-icon')} alt="" width={1536} height={1536} unoptimized className="h-7 w-7 rounded-full object-cover" aria-hidden="true" />
            JP Valderrama
          </a>
        </div>
      </header>

      <div id="contenido">
        <section className="border-b border-[#6f0d12]/10 bg-[#efe3d7]">
          <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[.88fr_1.12fr] lg:items-stretch">
            <div className="flex flex-col justify-center px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:pl-20">
              <div className="mb-7 flex items-center gap-4">
                <Image src={visual('jp-icon')} alt="Símbolo original JP Valderrama" width={1536} height={1536} priority unoptimized className="h-16 w-16 rounded-full object-cover shadow-[0_10px_30px_rgba(72,35,24,.10)]" />
                <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#6f0d12]">CTG One · Educación · Ideas · Proyectos</p>
              </div>
              <p className="text-[10px] font-semibold uppercase leading-6 tracking-[.16em] text-[#665950] sm:text-[11px]">Filósofo · Educador · Escritor · Empresario · Fundador de CTG One · Desarrollador</p>
              <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[.96] tracking-[-.04em] text-[#15100d] sm:text-6xl lg:text-[4.8rem] xl:text-[5.3rem]">Pensar el presente. <span className="text-[#6f0d12]">Construir futuro.</span></h1>
              <div className="mt-6 flex items-center gap-3" aria-hidden="true"><span className="h-px w-24 bg-[#6f0d12]" /><span className="h-2 w-2 rounded-full bg-[#6f0d12]" /><span className="h-px w-16 bg-[#6f0d12]/35" /></div>
              <p className="mt-7 max-w-2xl font-serif text-lg leading-8 text-[#534941] sm:text-xl">Filosofía, educación, escritura y tecnología reunidas en una práctica intelectual orientada a comprender, comunicar y transformar.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#mapa" className="inline-flex min-h-12 items-center gap-2 bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">Explorar <ArrowRight className="h-4 w-4" /></a>
                <a href="/jpvalderrama/ideas" className="inline-flex min-h-12 items-center gap-2 border border-[#6f0d12]/45 px-6 text-xs font-bold uppercase tracking-[.13em] text-[#6f0d12]">Valderrama Ideas <ArrowRight className="h-4 w-4" /></a>
              </div>
            </div>
            <div className="relative min-h-[430px] overflow-hidden lg:min-h-[650px]">
              <Image src={visual('conference-hero')} alt="Juan Pablo Valderrama en conferencia" fill priority unoptimized className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 58vw" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#efe3d7]/70 via-transparent to-transparent" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section id="mapa" className="scroll-mt-24 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
            <div className="mb-8 grid gap-5 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
              <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#6f0d12]">Método intelectual</p><h2 className="mt-3 font-serif text-4xl leading-tight text-[#17110e] sm:text-5xl">Mapa del pensamiento</h2></div>
              <p className="max-w-3xl font-serif text-[17px] leading-8 text-[#665950]">De la persona que pregunta al argumento, la contradicción y el concepto; y del concepto nuevamente a la sociedad. Una cartografía visual de la filosofía entendida como práctica viva.</p>
            </div>
            <div className="overflow-hidden border border-[#6f0d12]/12 bg-[#fbf7f1] shadow-[0_22px_70px_rgba(72,35,24,.07)]">
              <Image src={visual('thought-map')} alt="Mapa del Pensamiento: persona, pregunta, argumento, contradicción, concepto y sociedad" width={1536} height={864} unoptimized className="h-auto w-full" sizes="100vw" />
            </div>
          </div>
        </section>

        <section id="marcas" className="scroll-mt-24 border-y border-[#6f0d12]/10 bg-[#fbf7f1] py-20 sm:py-24">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <div className="mb-12 flex items-center gap-5"><span className="h-px flex-1 bg-[#6f0d12]/15" /><h2 className="text-center text-[11px] font-semibold uppercase tracking-[.28em] text-[#4c4038]">Universo JP Valderrama</h2><span className="h-px flex-1 bg-[#6f0d12]/15" /></div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {subbrands.map((brand) => (
                <a key={brand.name} href={brand.href} className="group flex min-h-full flex-col overflow-hidden border border-[#6f0d12]/14 bg-[#f7f0e7] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(72,35,24,.10)]">
                  <div className="flex min-h-[230px] items-center justify-center overflow-hidden bg-[#efe3d7]">
                    <Image src={visual(brand.image)} alt={`Identidad visual de ${brand.name}`} width={brand.width} height={brand.height} unoptimized className={brand.image === 'ideas-button' ? 'h-auto w-[78%] max-w-[260px] object-contain' : 'h-full min-h-[230px] w-full object-cover'} sizes="(max-width: 640px) 92vw, (max-width: 1280px) 45vw, 330px" />
                  </div>
                  <div className="flex flex-1 flex-col p-6"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#6f0d12]">{brand.label}</p><h3 className="mt-3 font-serif text-2xl text-[#17110e]">{brand.name}</h3><p className="mt-4 flex-1 font-serif text-[15px] leading-7 text-[#665950]">{brand.copy}</p><span className="mt-6 inline-flex items-center gap-2 border-t border-[#6f0d12]/12 pt-5 text-[10px] font-bold uppercase tracking-[.14em] text-[#6f0d12]">Entrar <ArrowRight className="h-3.5 w-3.5" /></span></div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="perfil" className="scroll-mt-24 py-20 sm:py-24 lg:py-28">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:px-12">
            <div className="overflow-hidden border border-[#6f0d12]/12 bg-[#fbf7f1]"><Image src={visual('philosophy-technology')} alt="Filosofía, libros, tecnología y ciudad contemporánea" width={1536} height={864} unoptimized className="h-auto w-full" sizes="(max-width: 1024px) 100vw, 55vw" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#6f0d12]">Perfil</p><h2 className="mt-4 font-serif text-4xl leading-tight text-[#17110e] sm:text-5xl">La tradición intelectual interrogando el presente tecnológico.</h2><div className="mt-5 h-px w-16 bg-[#6f0d12]" /><p className="mt-6 font-serif text-[17px] leading-8 text-[#564a42]">Juan Pablo Valderrama Pino es filósofo, educador, escritor y empresario. Fundador de CTG One y desarrollador de proyectos interdisciplinarios en educación, tecnología y cultura.</p><p className="mt-4 font-serif text-[17px] leading-8 text-[#564a42]">Su trabajo integra reflexión filosófica, práctica educativa, escritura, pensamiento empresarial e innovación para convertir preguntas rigurosas en aprendizaje, comunicación, producto y acción.</p></div>
          </div>
        </section>

        <section className="border-y border-[#6f0d12]/10 bg-[#efe3d7] py-20 sm:py-24">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-12">
            <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#6f0d12]">Filosofía y empresa</p><h2 className="mt-4 font-serif text-4xl leading-tight text-[#17110e] sm:text-5xl">¿Qué lugar ocupan las ideas dentro de la actividad económica?</h2><p className="mt-6 font-serif text-[17px] leading-8 text-[#564a42]">Ética, trabajo, dinero, empresa y formación humana no aparecen como una oposición simple, sino como un campo de problemas: qué producimos, para quién, bajo qué valores y qué clase de vida queremos hacer posible.</p><a href="/jpvalderrama/ideas" className="mt-8 inline-flex min-h-12 items-center gap-2 border border-[#6f0d12]/40 px-6 text-xs font-bold uppercase tracking-[.13em] text-[#6f0d12]">Leer Ideas <ArrowRight className="h-4 w-4" /></a></div>
            <div className="overflow-hidden border border-[#6f0d12]/12 bg-[#fbf7f1]"><Image src={visual('philosophy-money')} alt="Ilustración editorial sobre filosofía, libros, dinero y actividad económica" width={1536} height={864} unoptimized className="h-auto w-full" sizes="(max-width: 1024px) 100vw, 58vw" /></div>
          </div>
        </section>

        <section className="border-b border-[#6f0d12]/10 bg-[#fbf7f1] py-16 sm:py-20">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-12">
            <div className="overflow-hidden border border-[#6f0d12]/12 bg-[#19130f]"><Image src={visual('books-desk')} alt="Biblioteca, cuadernos y manuscritos" width={1536} height={1024} unoptimized className="h-auto w-full" sizes="(max-width: 1024px) 100vw, 55vw" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#6f0d12]">Valderrama Books</p><h2 className="mt-4 font-serif text-4xl leading-tight text-[#17110e] sm:text-5xl">Leer, investigar, escribir.</h2><p className="mt-6 font-serif text-[17px] leading-8 text-[#564a42]">La escritura de largo aliento necesita tiempo, archivo y método. Valderrama Books convierte notas, lecturas e investigación en argumentos, manuscritos y libros.</p><a href="/jpvalderrama/books" className="mt-8 inline-flex min-h-12 items-center gap-2 bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">Explorar Books <ArrowRight className="h-4 w-4" /></a></div>
          </div>
        </section>

        <section id="conferencia" className="scroll-mt-24 py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <div className="grid overflow-hidden border border-[#6f0d12]/16 bg-[#fbf7f1] lg:grid-cols-[.82fr_1.18fr]">
              <div className="p-7 sm:p-10 lg:p-14">
                <Image src={visual('waveform')} alt="Lenguaje visual de Valderrama Talks" width={1536} height={512} unoptimized className="mb-8 h-auto w-full border-y border-[#6f0d12]/10 py-3" sizes="(max-width: 1024px) 90vw, 480px" />
                <p className="text-[10px] font-bold uppercase tracking-[.23em] text-[#6f0d12]">Conferencia destacada · Valderrama Talks</p><h2 className="mt-4 font-serif text-4xl leading-none text-[#17110e] sm:text-5xl lg:text-6xl">¿Filosofía o <span className="text-[#6f0d12]">Dinero?</span></h2><p className="mt-3 font-serif text-2xl italic text-[#4e4038]">El arte de comer papel</p><div className="mt-7 h-px w-32 bg-[#6f0d12]" />
                <div className="mt-8 grid gap-4 text-sm text-[#665950] sm:grid-cols-2"><p><strong className="text-[#241b16]">Fecha:</strong> 17 de septiembre</p><p><strong className="text-[#241b16]">Hora:</strong> 7:00 p. m.</p><p><strong className="text-[#241b16]">Duración:</strong> 45 minutos</p><p><strong className="text-[#241b16]">Modalidad:</strong> Google Meet</p><p><strong className="text-[#241b16]">Ticket:</strong> $10.000</p><p><strong className="text-[#241b16]">Inscripciones:</strong> 3186428218</p></div>
                <a href="/jpvalderrama/talks#inscripcion" className="mt-9 inline-flex min-h-12 items-center gap-2 bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.14em] text-[#fffaf2]">Inscribirme <ArrowRight className="h-4 w-4" /></a>
              </div>
              <div className="flex items-center justify-center border-t border-[#6f0d12]/12 bg-[#f4eadf] p-5 lg:border-l lg:border-t-0 lg:p-8"><Image src={visual('conference-poster')} alt="Afiche oficial de la conferencia ¿Filosofía o Dinero?" width={1536} height={1536} unoptimized className="h-auto w-full max-w-[650px] shadow-[0_18px_55px_rgba(75,32,22,.12)]" sizes="(max-width: 1024px) 92vw, 650px" /></div>
            </div>
          </div>
        </section>

        <section id="contacto" className="px-5 pb-12 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[1440px] bg-[#650b10] px-7 py-10 text-[#fff7ed] sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-14"><div className="max-w-3xl"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#f1d8cf]">Educación · contenido · proyectos</p><h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">¿Colaboramos en educación, contenido o proyectos con impacto?</h2><p className="mt-3 font-serif text-lg text-[#f1e4dd]">Conversemos sobre conferencias, proyectos editoriales, educación y desarrollo institucional.</p></div><a href="/contact" className="mt-7 inline-flex min-h-12 shrink-0 items-center gap-2 bg-[#fff7ed] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#650b10] lg:mt-0">Escribir mensaje <ArrowRight className="h-4 w-4" /></a></div>
        </section>
      </div>

      <footer className="border-t border-[#6f0d12]/10 bg-[#f7f0e7]"><div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-7 text-[9px] font-semibold uppercase tracking-[.2em] text-[#665950] sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><p>CTG One · Educación · Tecnología · Desarrollo humano</p><p className="text-[#6f0d12]">ctgone.com/jpvalderrama</p></div></footer>
    </main>
  );
}
