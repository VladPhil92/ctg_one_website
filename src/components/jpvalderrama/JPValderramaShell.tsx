import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

const navItems = [
  { href: '/jpvalderrama/talks', label: 'Talks' },
  { href: '/jpvalderrama/ideas', label: 'Ideas' },
  { href: '/jpvalderrama/books', label: 'Books' },
  { href: '/jpvalderrama/projects', label: 'Projects' },
] as const;

export function JPValderramaHeader({ active }: { active?: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#6f0d12]/10 bg-[#f7f0e7]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <a href="/jpvalderrama" className="flex min-w-0 items-center gap-3 text-[#17110e]" aria-label="Volver a JP Valderrama">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#6f0d12]/35 text-xs font-semibold text-[#6f0d12]">JPV</span>
          <span className="hidden font-serif text-base tracking-[.18em] sm:inline">JUAN PABLO VALDERRAMA</span>
        </a>
        <nav className="flex items-center gap-3 overflow-x-auto text-[10px] font-bold uppercase tracking-[.13em] text-[#665950] sm:gap-5" aria-label="Submarcas JP Valderrama">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={active === item.label.toLowerCase() ? 'page' : undefined}
              className={active === item.label.toLowerCase() ? 'border-b border-[#6f0d12] pb-1 text-[#6f0d12]' : 'whitespace-nowrap hover:text-[#6f0d12]'}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a href="/" className="hidden text-[10px] font-bold uppercase tracking-[.15em] text-[#6f0d12] lg:inline-flex">CTG One</a>
      </div>
    </header>
  );
}

export function JPValderramaFooter() {
  return (
    <footer className="border-t border-[#6f0d12]/12 bg-[#efe3d7]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
        <div>
          <p className="font-serif text-lg tracking-[.12em] text-[#201712]">JP VALDERRAMA</p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[.16em] text-[#665950]">Filosofía · Educación · Escritura · Tecnología</p>
        </div>
        <div className="flex flex-wrap gap-5 text-[10px] font-bold uppercase tracking-[.14em] text-[#6f0d12]">
          <a href="/jpvalderrama">Perfil</a>
          <a href="/contact">Contacto</a>
          <a href="/">CTG One</a>
        </div>
      </div>
    </footer>
  );
}

type EditorialCard = {
  title: string;
  text: string;
};

type SubbrandLandingProps = {
  active: 'ideas' | 'books' | 'projects';
  image: string;
  imageAlt: string;
  eyebrow: string;
  headline: string;
  intro: string;
  cards: readonly EditorialCard[];
  statusTitle: string;
  statusText: string;
  children?: ReactNode;
};

export function JPSubbrandLanding({
  active,
  image,
  imageAlt,
  eyebrow,
  headline,
  intro,
  cards,
  statusTitle,
  statusText,
  children,
}: SubbrandLandingProps) {
  return (
    <main className="min-h-screen bg-[#f7f0e7] text-[#19130f] selection:bg-[#6f0d12] selection:text-[#fffaf2]">
      <a href="#contenido" className="sr-only z-[100] rounded bg-[#6f0d12] px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>
      <JPValderramaHeader active={active} />
      <div id="contenido">
        <section className="border-b border-[#6f0d12]/10">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:px-12 lg:py-24">
            <div className="mx-auto w-full max-w-[430px] border border-[#6f0d12]/14 bg-[#fbf7f1] p-6 shadow-[0_24px_70px_rgba(72,35,24,.06)]">
              <Image src={image} alt={imageAlt} width={560} height={560} priority className="h-auto w-full rounded-full mix-blend-multiply" sizes="(max-width: 1024px) 72vw, 430px" />
            </div>
            <div className="max-w-3xl">
              <a href="/jpvalderrama" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#6f0d12]"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> JP Valderrama</a>
              <p className="mt-8 text-[10px] font-bold uppercase tracking-[.22em] text-[#6f0d12]">{eyebrow}</p>
              <h1 className="mt-4 font-serif text-5xl leading-[.98] tracking-[-.035em] text-[#17110e] sm:text-6xl lg:text-[4.6rem]">{headline}</h1>
              <div className="mt-6 flex items-center gap-3" aria-hidden="true"><span className="h-px w-24 bg-[#6f0d12]" /><span className="h-2 w-2 rounded-full bg-[#6f0d12]" /></div>
              <p className="mt-7 max-w-2xl font-serif text-lg leading-8 text-[#564a42] sm:text-xl">{intro}</p>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
            <div className="grid gap-5 md:grid-cols-3">
              {cards.map((card, index) => (
                <article key={card.title} className="border border-[#6f0d12]/14 bg-[#fbf7f1] p-7">
                  <p className="text-[10px] font-bold tracking-[.18em] text-[#6f0d12]">0{index + 1}</p>
                  <h2 className="mt-5 font-serif text-2xl text-[#17110e]">{card.title}</h2>
                  <p className="mt-4 font-serif text-[16px] leading-7 text-[#665950]">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {children}

        <section className="border-y border-[#6f0d12]/10 bg-[#fbf7f1] py-16">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-5 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12">
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Estado editorial</p>
              <h2 className="mt-3 font-serif text-3xl text-[#17110e] sm:text-4xl">{statusTitle}</h2>
              <p className="mt-4 font-serif text-[16px] leading-7 text-[#665950]">{statusText}</p>
            </div>
            <a href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">Proponer colaboración <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
          </div>
        </section>
      </div>
      <JPValderramaFooter />
    </main>
  );
}
