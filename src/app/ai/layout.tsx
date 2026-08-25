import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CTG One AI | Artificial Intelligence at CTG One',
  description: 'How CTG One uses artificial intelligence today — starting with CTG Knowledge, our AI-powered documentation search — and what is still in development.',
  alternates: { canonical: 'https://ctgone.com/ai' },
  openGraph: {
    title: 'CTG One AI | Artificial Intelligence at CTG One',
    description: 'See what AI does for you today at CTG One, and the technical architecture behind it.',
    url: 'https://ctgone.com/ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CTG One AI | Artificial Intelligence at CTG One',
    description: 'How CTG One uses AI today, and what is still in development.',
  },
};

export default function AILayout({ children }: { children: React.ReactNode }) {
  return children;
}
