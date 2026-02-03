import type { Metadata, Viewport } from 'next';
import { Outfit, DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Optimized font loading
const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
});

// SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL('https://ctgone.com'),
  title: {
    default: 'CTG One Corporation | AI Strategy & Infrastructure',
    template: '%s | CTG One Corporation',
  },
  description:
    'Technology is infrastructure. Strategy is architecture. We design both. CTG One Corporation designs, integrates, and scales strategic technological solutions.',
  keywords: [
    'CTG One',
    'AI Strategy',
    'Infrastructure',
    'Blockchain',
    'Technology Architecture',
    'LatAm',
    'Web3',
    'CTGO Token',
    'Digital Transformation',
    'Cartagena Colombia',
  ],
  authors: [{ name: 'CTG One Corporation' }],
  creator: 'CTG One Corporation',
  publisher: 'CTG One Corporation',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'es_CO',
    url: 'https://ctgone.com',
    siteName: 'CTG One Corporation',
    title: 'CTG One Corporation | AI Strategy & Infrastructure',
    description:
      'Technology is infrastructure. Strategy is architecture. We design both.',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CTG One Corporation - AI Strategy & Infrastructure',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CTG One Corporation | AI Strategy & Infrastructure',
    description:
      'Technology is infrastructure. Strategy is architecture. We design both.',
    images: ['/images/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a0f',
};

// JSON-LD Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Corporation',
  name: 'CTG One Corporation',
  description:
    'Technology is infrastructure. Strategy is architecture. We design both.',
  url: 'https://ctgone.com',
  logo: 'https://ctgone.com/images/logo/ctg-one-logo.png',
  foundingDate: '2024',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Cartagena de Indias',
    addressCountry: 'CO',
  },
  sameAs: [
    'https://twitter.com/ctgone',
    'https://linkedin.com/company/ctgone',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'ctgonecorporation@gmail.com',
    contactType: 'customer service',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
