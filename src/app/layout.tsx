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
    default: 'CTG One Technology | Software, AI & Infrastructure',
    template: '%s | CTG One Technology',
  },
  description:
    'CTG One Technology builds proprietary software, artificial intelligence, automation, and digital infrastructure for its own business ecosystem.',
  keywords: [
    'CTG One',
    'Software Engineering',
    'Artificial Intelligence',
    'Automation',
    'Digital Infrastructure',
    'Technology Architecture',
    'Internal Platforms',
    'Business Technology',
    'CTGO Token Utility',
    'Digital Transformation',
    'Cartagena Colombia',
  ],
  authors: [{ name: 'CTG One Technology' }],
  creator: 'CTG One Technology',
  publisher: 'CTG One Technology',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'es_CO',
    url: 'https://ctgone.com',
    siteName: 'CTG One Technology',
    title: 'CTG One Technology | Software, AI & Infrastructure',
    description:
      'Proprietary software, AI, automation, and digital infrastructure built for the CTG One business ecosystem.',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CTG One Technology - Software, AI & Infrastructure',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CTG One Technology | Software, AI & Infrastructure',
    description:
      'Proprietary software, AI, automation, and digital infrastructure built for the CTG One business ecosystem.',
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
  name: 'CTG One Technology',
  description:
    'Technology company building proprietary software, artificial intelligence, automation, and digital infrastructure for its own business ecosystem.',
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
    email: 'direccion@ctgone.com',
    contactType: 'general inquiries',
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
