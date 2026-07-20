import React from 'react';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="py-6 px-8">
        <a href="/" className="inline-flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full overflow-hidden">
            <Image src="/images/logo/CTGLOGO.jpeg" alt="CTG One Logo" fill className="object-cover" />
          </div>
          <span className="text-sm font-outfit font-medium text-white tracking-wide">CTG One</span>
        </a>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
