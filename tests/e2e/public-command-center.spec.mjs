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

  test('home preserves native beer framing and emits energy from the CTG core', async ({ page }) => {
    await preferSpanish(page);
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);

    const viewport = page.locator('[data-ctg-photo-viewport="native-320x480"]').first();
    const photo = page.locator('img[data-ctg-photo="high-fidelity-source"][data-ctg-source-size="320x480"]').first();
    const caption = page.locator('[data-ctg-photo-caption="outside-image"]').first();
    await expect(viewport).toBeVisible();
    await expect(photo).toBeVisible();
    await expect(caption).toBeVisible();

    const photoState = await photo.evaluate((node) => ({
      naturalWidth: node.naturalWidth,
      naturalHeight: node.naturalHeight,
      renderedWidth: node.getBoundingClientRect().width,
      objectFit: getComputedStyle(node).objectFit,
      src: node.currentSrc,
    }));
    expect(photoState.naturalWidth).toBe(320);
    expect(photoState.naturalHeight).toBe(480);
    expect(photoState.renderedWidth).toBeLessThanOrEqual(321);
    expect(photoState.objectFit).toBe('contain');
    expect(photoState.src).toContain('/images/inversion/ctg-craft-beer-hefeweizen.webp');
    expect(photoState.src).not.toContain('/_next/image');

    const framing = await page.evaluate(() => {
      const imageViewport = document.querySelector('[data-ctg-photo-viewport="native-320x480"]');
      const imageCaption = document.querySelector('[data-ctg-photo-caption="outside-image"]');
      if (!imageViewport || !imageCaption) return null;
      const viewportRect = imageViewport.getBoundingClientRect();
      const captionRect = imageCaption.getBoundingClientRect();
      return { viewportBottom: viewportRect.bottom, captionTop: captionRect.top };
    });
    expect(framing).not.toBeNull();
    expect(framing.captionTop).toBeGreaterThanOrEqual(framing.viewportBottom - 1);

    const energy = page.locator('[data-core-energy="radial-emission"]').first();
    await expect(energy).toBeVisible();
    await expect(energy.locator('line')).toHaveCount(12);
    await expect(energy.locator('circle')).toHaveCount(12);

    const energyMotion = await energy.locator('line').first().evaluate((node) => ({
      animationName: getComputedStyle(node).animationName,
      animationDuration: getComputedStyle(node).animationDuration,
    }));
    expect(energyMotion.animationName).toContain('coreEnergyRayBurst');
    expect(energyMotion.animationDuration).not.toBe('0s');
    await expectNoHorizontalOverflow(page, '/');
  });

  test('ecosystem core exposes eight process links and beer routes to CTG Craft Beer Investment', async ({ page }) => {
    await preferSpanish(page);
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);

    const processLinks = page.locator('[data-ecosystem-process-link]');
    await expect(processLinks).toHaveCount(8);

    const beerLink = page.locator('[data-ecosystem-process-link="beer"]');
    await expect(beerLink).toHaveAttribute('href', '/ecosystem/process/beer');
    await expect(beerLink).toHaveAttribute('aria-label', /Cerveza/);

    const beerResponse = await page.goto('/ecosystem/process/beer');
    expect(beerResponse?.status()).toBeLessThan(400);
    await expect(page.getByText('Cerveza', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Abrir CTG Craft Beer Inversión/i })).toHaveAttribute('href', '/inversion');
    await expectNoHorizontalOverflow(page, '/ecosystem/process/beer');
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
