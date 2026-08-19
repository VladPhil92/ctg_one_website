import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Technology Status',
  description: 'Public maturity and evidence registry for CTG One Technology capabilities.',
  alternates: { canonical: 'https://ctgone.com/technology/status' },
  openGraph: {
    url: 'https://ctgone.com/technology/status',
    title: 'Technology Status | CTG One Technology',
    description: 'Public maturity and evidence registry for CTG One Technology capabilities.',
  },
};

export default function TechnologyStatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
