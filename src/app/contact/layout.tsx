import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact CTG One Technology',
  description: 'Get in touch with CTG One Technology — questions, projects, and partnerships.',
  alternates: { canonical: 'https://ctgone.com/contact' },
  openGraph: {
    title: 'Contact CTG One Technology',
    description: 'Get in touch with CTG One Technology.',
    url: 'https://ctgone.com/contact',
    type: 'website',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
