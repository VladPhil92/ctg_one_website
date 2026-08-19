import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Public record of relevant CTG One Technology product, architecture, and capability changes.',
  alternates: { canonical: 'https://ctgone.com/changelog' },
  openGraph: {
    url: 'https://ctgone.com/changelog',
    title: 'Changelog | CTG One Technology',
    description: 'Public record of relevant CTG One Technology product, architecture, and capability changes.',
  },
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
