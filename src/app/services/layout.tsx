import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Technology & Services',
  description: "We build the technology that powers our own businesses — see what's available today and the technical architecture behind it.",
  alternates: { canonical: 'https://ctgone.com/services' },
  openGraph: {
    title: 'CTG One Technology | Technology & Services',
    description: 'We build the technology that powers our own businesses.',
    url: 'https://ctgone.com/services',
    type: 'website',
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
