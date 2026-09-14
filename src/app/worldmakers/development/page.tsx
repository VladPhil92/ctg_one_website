import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'World Makers',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DevelopmentPage() {
  redirect('/worldmakers');
}
