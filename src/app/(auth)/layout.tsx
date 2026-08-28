import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-primary">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-40 -top-48 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(212,162,89,0.075),transparent_68%)]" />
        <div className="absolute -bottom-56 -left-44 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.025),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(212,162,89,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(212,162,89,0.045)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
        <Link
          href="/"
          aria-label="CTG One Technology"
          className="inline-flex min-h-11 items-center gap-3 rounded-full pr-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="relative h-10 w-10 overflow-hidden rounded-full border border-white/[0.08]">
            <Image src="/images/logo/CTGLOGO.jpeg" alt="" fill className="object-cover" priority />
          </span>
          <span className="hidden font-outfit text-sm font-semibold tracking-wide text-white sm:inline">CTG One</span>
        </Link>
        <LanguageSwitcher compact />
      </header>

      <div className="relative z-10 flex min-h-[calc(100vh-84px)] items-center justify-center px-5 pb-16 pt-4 sm:px-6 sm:pb-20">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-[#080808]/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
