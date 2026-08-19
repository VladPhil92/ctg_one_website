import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Labs',
  description: 'Public experimentation framework for CTG One Technology research and technical validation.',
  alternates: { canonical: 'https://ctgone.com/labs' },
  openGraph: {
    url: 'https://ctgone.com/labs',
    title: 'Labs | CTG One Technology',
    description: 'Public experimentation framework for CTG One Technology research and technical validation.',
  },
};

export default function LabsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
