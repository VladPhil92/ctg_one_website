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

const ECOSYSTEM_PROCESS_ROUTES = [
  'ai',
  'commerce',
  'hospitality',
  'education',
  'health',
  'legal',
  'beer',
  'fintech',
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

  test('home exposes the interactive ecosystem hero and keeps real Craft Beer and Nvet Care media in the product showcases', async ({ page }) => {
    await preferSpanish(page);
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);

    const ecosystem = page.locator('section#home [data-ecosystem-diagram]');
    await expect(ecosystem).toBeVisible();
    await expect(ecosystem.getByRole('link')).toHaveCount(8);
    await expect(ecosystem.getByRole('link', { name: 'Abrir proceso de Cerveza' })).toHaveAttribute('href', '/ecosystem/process/beer');

    const beerLink = page.getByRole('link', { name: 'Conocer CTG Craft Beer' });
    const nvetLink = page.getByRole('link', { name: 'Conocer Nvet Care' });
    await expect(beerLink).toBeVisible();
    await expect(nvetLink).toBeVisible();

    const irishRedPhoto = page.getByRole('img', { name: 'Botella Irish Red Ale de CTG Craft Beer' });
    const porterPhoto = page.getByRole('img', { name: 'Botella Porter de CTG Craft Beer' });
    const nvetMockup = page.getByRole('img', { name: /Campaña de Nvet Care/i });
    await expect(irishRedPhoto).toBeVisible();
    await expect(porterPhoto).toBeVisible();
    await expect(nvetMockup).toBeVisible();

    const irishState = await irishRedPhoto.evaluate((node) => ({
      naturalWidth: node.naturalWidth,
      naturalHeight: node.naturalHeight,
      src: node.currentSrc,
    }));
    expect(irishState.naturalWidth).toBeGreaterThan(0);
    expect(irishState.naturalHeight).toBeGreaterThan(0);
    expect(irishState.src).toContain('/images/inversion/ctg-craft-beer-irish-red-ale.webp');
    expect(irishState.src).not.toContain('/_next/image');

    const porterState = await porterPhoto.evaluate((node) => ({
      naturalWidth: node.naturalWidth,
      naturalHeight: node.naturalHeight,
      src: node.currentSrc,
    }));
    expect(porterState.naturalWidth).toBeGreaterThan(0);
    expect(porterState.naturalHeight).toBeGreaterThan(0);
    expect(porterState.src).toContain('/images/inversion/ctg-craft-beer-porter.webp');
    expect(porterState.src).not.toContain('/_next/image');

    const nvetState = await nvetMockup.evaluate((node) => ({
      naturalWidth: node.naturalWidth,
      naturalHeight: node.naturalHeight,
      src: node.currentSrc,
    }));
    expect(nvetState.naturalWidth).toBeGreaterThan(0);
    expect(nvetState.naturalHeight).toBeGreaterThan(0);
    expect(nvetState.src).toContain('data:image/webp;base64,');

    await expect(page.getByText('Cerveza artesanal. Producción real.', { exact: true })).toBeVisible();
    await expect(page.getByText('Nvet Care · En desarrollo', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, '/');
  });

  test('all ecosystem process routes resolve and beer keeps the investment journey explicit', async ({ page }) => {
    await preferSpanish(page);

    for (const slug of ECOSYSTEM_PROCESS_ROUTES) {
      const route = `/ecosystem/process/${slug}`;
      const response = await page.goto(route);
      expect(response?.status(), `${route} response`).toBeLessThan(400);
      await expectNoHorizontalOverflow(page, route);
    }

    await page.goto('/ecosystem/process/beer');
    await expect(page.getByText('Cerveza', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Abrir CTG Craft Beer Inversión/i })).toHaveAttribute('href', '/inversion');
  });

  test('investment keeps its protected domain shell and sticky navigation while inheriting command-center design', async ({ page }) => {
    await preferSpanish(page);
    const response = await page.goto('/inversion');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('[data-public-command-center="investment"]')).toBeVisible();
    await expectNoHorizontalOverflow(page, '/inversion');

    const nav = page.locator('[data-public-command-center="investment"] > nav').first();
    await expect(nav).toBeVisible();
    const before = await nav.evaluate((node) => ({
      position: getComputedStyle(node).position,
      zIndex: Number(getComputedStyle(node).zIndex),
      top: node.getBoundingClientRect().top,
    }));
    expect(before.position).toBe('sticky');
    expect(before.zIndex).toBeGreaterThanOrEqual(50);

    await page.evaluate(() => window.scrollTo(0, Math.min(700, document.documentElement.scrollHeight - window.innerHeight)));
    await page.waitForTimeout(100);
    const afterTop = await nav.evaluate((node) => node.getBoundingClientRect().top);
    expect(Math.abs(afterTop)).toBeLessThanOrEqual(1);
  });

  test('CTG Craft Beer assets remain valid WebP sources within the web payload budget', async ({ request }) => {
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
      expect(bytes.length, `${asset} should not be unexpectedly truncated`).toBeGreaterThanOrEqual(10_000);
      expect(bytes.length, `${asset} should stay within the web payload budget`).toBeLessThanOrEqual(180_000);
      expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
    }
  });
});
