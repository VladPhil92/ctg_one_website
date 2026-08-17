import type { MetadataRoute } from 'next';

const siteUrl = 'https://ctgone.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    { path: '/', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/about', changeFrequency: 'monthly' as const, priority: 0.9 },
    { path: '/services', changeFrequency: 'monthly' as const, priority: 0.9 },
    { path: '/ecosystem', changeFrequency: 'monthly' as const, priority: 0.9 },
    { path: '/products', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: '/ai', changeFrequency: 'monthly' as const, priority: 0.8 },
    { path: '/rewards', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/token', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/contact', changeFrequency: 'yearly' as const, priority: 0.7 },
    { path: '/privacidad', changeFrequency: 'yearly' as const, priority: 0.4 },
    { path: '/inversion', changeFrequency: 'weekly' as const, priority: 0.9 },
    { path: '/inversion/lotes', changeFrequency: 'daily' as const, priority: 0.9 },
    { path: '/inversion/como-funciona', changeFrequency: 'monthly' as const, priority: 0.8 },
    { path: '/inversion/simulador', changeFrequency: 'monthly' as const, priority: 0.8 },
    { path: '/inversion/riesgos', changeFrequency: 'monthly' as const, priority: 0.7 },
    { path: '/inversion/legal', changeFrequency: 'monthly' as const, priority: 0.7 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
