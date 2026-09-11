import type { MetadataRoute } from 'next';
import { adventures } from './portal-data';

const siteUrl = 'https://worldmakers.ctgone.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/how-to-play`, changeFrequency: 'monthly', priority: 0.86 },
    { url: `${siteUrl}/adventures`, changeFrequency: 'weekly', priority: 0.92 },
    ...adventures.map((adventure) => ({
      url: `${siteUrl}/adventures/${adventure.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.78,
    })),
    { url: `${siteUrl}/development`, changeFrequency: 'daily', priority: 0.84 },
    { url: `${siteUrl}/media`, changeFrequency: 'weekly', priority: 0.74 },
    { url: `${siteUrl}/families`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/educators`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/community`, changeFrequency: 'weekly', priority: 0.88 },
    { url: `${siteUrl}/privacy`, changeFrequency: 'monthly', priority: 0.62 },
  ];
}
