import type { Metadata } from 'next';

// Defense in depth for environments where the Next.js redirect layer is
// bypassed: the legacy Spanish path must never self-canonicalize.
export const metadata: Metadata = {
  alternates: { canonical: 'https://ctgone.com/privacy' },
  robots: { index: false, follow: true },
};

export default function LegacyPrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
