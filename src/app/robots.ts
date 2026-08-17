import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/dashboard/',
        '/inversion/app/',
        '/inversion/admin/',
        '/api/',
        '/iniciar-sesion',
        '/registro',
      ],
    },
    sitemap: 'https://ctgone.com/sitemap.xml',
    host: 'https://ctgone.com',
  };
}
