import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: 'https://ctgone.com/ecosystem' },
};

export default function EcosystemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
