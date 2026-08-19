import type { Metadata, Viewport } from 'next';
import { Outfit, DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SkipLink } from '@/components/SkipLink';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-outfit',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-dm-sans',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  weight: ['400', '500', '600', '700'],
});

const verifiedDescription = 'CTG One Technology is the proprietary software, data and digital infrastructure layer of the CTG One business ecosystem. We build and operate applications, transactional platforms, identity, automation and shared technology for real operating companies.';

export const metadata: Metadata = {
  metadataBase: new URL('https://ctgone.com'),
  title: {
    default: 'CTG One Technology | Software, Data & Digital Infrastructure',
    template: '%s | CTG One Technology',
  },
  description: verifiedDescription,
  keywords: [
    'CTG One Technology',
    'Software Engineering',
    'Digital Infrastructure',
    'Internal Platforms',
    'Business Operating Systems',
    'PostgreSQL',
    'Supabase',
    'Automation',
    'Applied AI',
    'Cartagena Colombia',
  ],
  authors: [{ name: 'CTG One Technology' }],
  creator: 'CTG One Technology',
  publisher: 'CTG One Technology',
  alternates: { canonical: 'https://ctgone.com' },
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'es_CO',
    url: 'https://ctgone.com',
    siteName: 'CTG One Technology',
    title: 'CTG One Technology | Software, Data & Digital Infrastructure',
    description: verifiedDescription,
    images: [{ url: '/images/og-image.png', width: 1200, height: 630, alt: 'CTG One Technology - Software, Data & Digital Infrastructure' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CTG One Technology | Software, Data & Digital Infrastructure',
    description: verifiedDescription,
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
  themeColor: '#050505',
  colorScheme: 'dark',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CTG One Technology',
  alternateName: 'CTG One',
  description: verifiedDescription,
  url: 'https://ctgone.com',
  logo: 'https://ctgone.com/images/logo/ctg-one-logo.png',
  foundingDate: '2024',
  foundingLocation: { '@type': 'Place', name: 'Cartagena de Indias, Colombia' },
  address: { '@type': 'PostalAddress', addressLocality: 'Cartagena de Indias', addressCountry: 'CO' },
  contactPoint: { '@type': 'ContactPoint', email: 'direccion@ctgone.com', contactType: 'general inquiries' },
  knowsAbout: [
    'Software engineering',
    'Digital infrastructure',
    'Internal platforms',
    'Data systems',
    'Identity and authorization',
    'Transactional systems',
    'Automation',
    'Applied artificial intelligence',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${dmSans.variable}`}
      suppressHydrationWarning
      style={{ backgroundColor: '#050505', colorScheme: 'dark' }}
    >
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="antialiased" style={{ backgroundColor: '#050505', color: '#e5e5e5' }}>
        <ErrorBoundary>
          <LanguageProvider>
            <SkipLink />
            <AuthProvider>{children}</AuthProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
