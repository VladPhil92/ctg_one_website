import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CTG One AI | Artificial Intelligence Architecture & Governance',
  description: 'AI architecture, agents, knowledge systems, governance, evaluation, security, and applied intelligence across the CTG One ecosystem.',
  alternates: { canonical: 'https://ctgone.com/ai' },
  openGraph: {
    title: 'CTG One AI | Artificial Intelligence Architecture & Governance',
    description: 'Explore how CTG One designs governed AI systems around authorized data, context, models, agents, workflows, evaluation, and human oversight.',
    url: 'https://ctgone.com/ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CTG One AI | Architecture & Governance',
    description: 'Governed AI architecture for the CTG One business ecosystem.',
  },
};

export default function AILayout({ children }: { children: React.ReactNode }) {
  return children;
}
