import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About CTG One | Technology Company in Cartagena',
  description: 'CTG One Technology creates the technology behind our own businesses — software, digital products, and infrastructure built and used in real operations.',
  alternates: { canonical: 'https://ctgone.com/about' },
  openGraph: {
    title: 'About CTG One | Technology Company in Cartagena',
    description: 'We create the technology behind our own businesses.',
    url: 'https://ctgone.com/about',
    type: 'website',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
