import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CTG One Wallet | Web Wallet y App',
  description: 'Accede a CTG One Wallet desde la web o instala la app usando la misma identidad CTG One, con Saldo CTG y activos digitales en una experiencia unificada.',
  alternates: {
    canonical: 'https://ctgone.com/wallet',
  },
  openGraph: {
    title: 'CTG One Wallet',
    description: 'Una cuenta CTG One, una identidad Wallet canónica y acceso desde web o app.',
    url: 'https://ctgone.com/wallet',
    siteName: 'CTG One Technology',
    type: 'website',
  },
};

export default function WalletLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
