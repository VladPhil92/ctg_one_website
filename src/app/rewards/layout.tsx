import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CTG Rewards | Loyalty Program Roadmap',
  description: 'CTG Rewards is a planned loyalty and referral program for the CTG One ecosystem — not yet active. See what is planned and how we are building it.',
  alternates: { canonical: 'https://ctgone.com/rewards' },
  openGraph: {
    title: 'CTG Rewards | Loyalty Program Roadmap',
    description: 'CTG Rewards is a planned loyalty and referral program — not yet active.',
    url: 'https://ctgone.com/rewards',
    type: 'website',
  },
};

export default function RewardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
