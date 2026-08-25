import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CTG One Ecosystem | Our Businesses & Technology',
  description: 'The CTG One ecosystem brings together our businesses, brands, products, and platforms — see where real software exists today.',
  alternates: { canonical: 'https://ctgone.com/ecosystem' },
  openGraph: {
    title: 'CTG One Ecosystem | Our Businesses & Technology',
    description: 'The CTG One ecosystem brings together our businesses, brands, products, and platforms.',
    url: 'https://ctgone.com/ecosystem',
    type: 'website',
  },
};

export default function EcosystemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
