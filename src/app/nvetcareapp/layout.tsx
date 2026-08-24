import type { Metadata } from 'next';

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
  return children;
}
