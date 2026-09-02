'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

const routes = [
  ['/jpvalderrama/campus', 'Campus'],
  ['/jpvalderrama/talks', 'Talks'],
  ['/jpvalderrama/ideas', 'Ideas'],
  ['/jpvalderrama/books', 'Books'],
  ['/jpvalderrama/projects', 'Projects'],
] as const;

export function SubbrandLauncher() {
  const pathname = usePathname();
  if (pathname !== '/jpvalderrama') return null;

  return (
    <>
      <a
        href="/jpvalderrama/ideas"
        aria-label="Abrir Valderrama Ideas"
        className="fixed bottom-24 right-4 z-[70] flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#681F27]/25 bg-[#FCFBF8]/95 p-1.5 shadow-[0_18px_55px_rgba(40,22,18,.20)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.03] sm:bottom-28 sm:right-6 sm:h-24 sm:w-24"
      >
        <Image
          src="/api/jpvalderrama/assets/ideas-button"
          alt="Valderrama Ideas"
          width={1536}
          height={1536}
          priority
          unoptimized
          className="h-full w-full object-contain"
        />
      </a>

      <nav
        aria-label="Explorar submarcas y campus JP Valderrama"
        className="fixed inset-x-4 bottom-4 z-60 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto border border-[#151515]/15 bg-[#FCFBF8]/95 p-1.5 shadow-[0_18px_55px_rgba(40,22,18,.14)] backdrop-blur-xl"
      >
        {routes.map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="whitespace-nowrap px-3 py-2 text-[9px] font-bold uppercase tracking-[.13em] text-[#681F27] transition hover:bg-[#681F27] hover:text-[#FCFBF8] sm:px-4 sm:text-[10px]"
          >
            {label}
          </a>
        ))}
      </nav>
    </>
  );
}
