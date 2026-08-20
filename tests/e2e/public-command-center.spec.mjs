import { expect, test } from '@playwright/test';

async function preferSpanish(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('ctg-one-language', 'es');
    document.cookie = 'ctg_locale=es; path=/';
  });
}

const PUBLIC_SECTIONS = [
  '/about',
  '/services',
  '/products',
  '/ecosystem',
  '/ai',
  '/rewards',
  '/token',
  '/contact',
];

async function expectNoHorizontalOverflow(page, route) {
  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(layout.scrollWidth, `${route} document overflow`).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.bodyScrollWidth, `${route} body overflow`).toBeLessThanOrEqual(layout.innerWidth + 1);
}

test.describe('CTG One public command-center design system', () => {
  test('all primary public sections share the Home visual shell', async ({ page }) => {
    await preferSpanish(page);

    for (const route of PUBLIC_SECTIONS) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} response`).toBeLessThan(400);
      await expect(page.locator('[data-public-command-center="true"]'), `${route} command-center shell`).toBeVisible();
      await expect(page.locator('[data-brand-lockup="ctg-one-technology"]').first()).toBeVisible();
      await expectNoHorizontalOverflow(page, route);
    }
  });

  test('public command-center sections remain overflow-safe at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await preferSpanish(page);

    for (const route of PUBLIC_SECTIONS) {
      await page.goto(route);
      await expect(page.locator('[data-public-command-center="true"]')).toBeVisible();
      await expectNoHorizontalOverflow(page, `${route} @390px`);
    }
  });

  test('investment keeps its protected domain shell while inheriting command-center design', async ({ page }) => {
    await preferSpanish(page);
    const response = await page.goto('/inversion');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('[data-public-command-center="investment"]')).toBeVisible();
    await expectNoHorizontalOverflow(page, '/inversion');
  });

  test('restored CTG Craft Beer assets are detailed WebP sources, not tiny derivatives', async ({ request }) => {
    for (const asset of [
      '/images/inversion/ctg-craft-beer-miyagi.webp',
      '/images/inversion/ctg-craft-beer-golden-pale-ale.webp',
      '/images/inversion/ctg-craft-beer-hefeweizen.webp',
      '/images/inversion/ctg-craft-beer-porter.webp',
      '/images/inversion/ctg-craft-beer-irish-red-ale.webp',
    ]) {
      const response = await request.get(asset);
      expect(response.ok(), `${asset} should load`).toBeTruthy();
      const bytes = await response.body();
      expect(bytes.length, `${asset} should retain useful source detail`).toBeGreaterThanOrEqual(80_000);
      expect(bytes.length, `${asset} should stay within the web payload budget`).toBeLessThanOrEqual(180_000);
      expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
    }
  });
});
