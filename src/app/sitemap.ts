import type { MetadataRoute } from 'next';
import { ECOSYSTEM_PROCESSES } from '@/data/ecosystem-processes';

const siteUrl = 'https://ctgone.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '/', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/about', changeFrequency: 'monthly' as const, priority: 0.9 },
    { path: '/services', changeFrequency: 'monthly' as const, priority: 0.9 },
    { path: '/ecosystem', changeFrequency: 'monthly' as const, priority: 0.9 },
    ...ECOSYSTEM_PROCESSES.map(({ slug }) => ({
      path: `/ecosystem/process/${slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.72,
    })),
    { path: '/products', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: '/nvetcareapp', changeFrequency: 'monthly' as const, priority: 0.7 },
    { path: '/technology/status', changeFrequency: 'weekly' as const, priority: 0.9 },
    { path: '/changelog', changeFrequency: 'weekly' as const, priority: 0.7 },
    { path: '/labs', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/ai', changeFrequency: 'monthly' as const, priority: 0.8 },
    { path: '/rewards', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/token', changeFrequency: 'monthly' as const, priority: 0.4 },
    { path: '/contact', changeFrequency: 'yearly' as const, priority: 0.7 },
    { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.4 },
    // `/inversion` is an established product namespace and remains canonical.
    { path: '/inversion', changeFrequency: 'weekly' as const, priority: 0.9 },
    { path: '/inversion/lotes', changeFrequency: 'daily' as const, priority: 0.9 },
    { path: '/inversion/como-funciona', changeFrequency: 'monthly' as const, priority: 0.8 },
    { path: '/inversion/simulador', changeFrequency: 'monthly' as const, priority: 0.8 },
    { path: '/inversion/riesgos', changeFrequency: 'monthly' as const, priority: 0.7 },
    { path: '/inversion/legal', changeFrequency: 'monthly' as const, priority: 0.7 },
  ];

  // Do not synthesize `lastModified` from request/build time. Search engines
  // should receive that signal only when a route has an authoritative content
  // modification timestamp; otherwise omission is more truthful than "now".
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    changeFrequency,
    priority,
  }));
}
