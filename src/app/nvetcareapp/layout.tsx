import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nvet Care App',
  description: 'Nvet Care App: marketplace veterinario a domicilio en Cartagena, en desarrollo. Conecta a dueños de mascotas con veterinarios verificados para visitas a domicilio.',
  alternates: { canonical: 'https://ctgone.com/nvetcareapp' },
};

export default function NvetCareAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
