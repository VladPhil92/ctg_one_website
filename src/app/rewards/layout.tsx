import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: 'https://ctgone.com/rewards' },
};

export default function RewardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
