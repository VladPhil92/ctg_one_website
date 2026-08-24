import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';

// Nvet Care's own type system (per its brand kit) is Poppins end to end
// (H1-H3 and body copy). Scoped to this route only via a CSS variable on a
// wrapper div — the root layout's Outfit/DM Sans tokens on <html>/<body>
// are untouched.
const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-poppins-nvet',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  weight: ['400', '500', '600', '700', '800'],
});

const title = 'Nvet Care App | Marketplace veterinario a domicilio';
const description = 'Nvet Care App: marketplace veterinario a domicilio en Cartagena, en desarrollo. Conecta a dueños de mascotas con veterinarios verificados para visitas a domicilio.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://ctgone.com/nvetcareapp' },
  openGraph: {
    title,
    description,
    url: 'https://ctgone.com/nvetcareapp',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nvet Care App',
    description: 'Marketplace veterinario a domicilio en Cartagena, en desarrollo.',
  },
};

export default function NvetCareAppLayout({ children }: { children: React.ReactNode }) {
  return <div className={poppins.variable}>{children}</div>;
}
