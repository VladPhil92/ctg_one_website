'use client';

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
    <nav
      aria-label="Explorar submarcas y campus JP Valderrama"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto border border-[#6f0d12]/20 bg-[#fffaf2]/95 p-1.5 shadow-[0_18px_55px_rgba(72,35,24,.14)] backdrop-blur-xl"
    >
      {routes.map(([href, label]) => (
        <a
          key={href}
          href={href}
          className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#6f0d12] transition hover:bg-[#6f0d12] hover:text-[#fffaf2] sm:px-4"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
