import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: 'https://ctgone.com/token' },
};

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
