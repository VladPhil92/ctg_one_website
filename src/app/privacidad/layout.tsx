import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: 'https://ctgone.com/privacidad' },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
