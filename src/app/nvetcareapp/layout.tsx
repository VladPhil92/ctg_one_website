import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './nvetcareapp.css';

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-poppins-nvet',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  weight: ['400', '500', '600', '700', '800'],
});

const title = 'Nvet Care | Atención veterinaria conectada en Cartagena';
const description = 'Nvet Care conecta familias y profesionales veterinarios para coordinar atención a domicilio, seguimiento e historial de mascotas desde una experiencia digital unificada.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://ctgone.com/nvetcareapp' },
  openGraph: {
    title,
    description,
    url: 'https://ctgone.com/nvetcareapp',
    type: 'website',
    images: [
      {
        url: '/images/nvetcareapp/mission-banner.jpg',
        alt: 'Nvet Care',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nvet Care',
    description: 'Atención veterinaria conectada para familias y profesionales. Beta en Cartagena.',
    images: ['/images/nvetcareapp/mission-banner.jpg'],
  },
};

export default function NvetCareAppLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${poppins.variable} nvet-care-page`}>{children}</div>;
}
