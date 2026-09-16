import { expect, test } from '@playwright/test';

const route = '/nvetcareapp';

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe('Nvet Care responsive public landing', () => {
  test('desktop keeps the hero, service hierarchy and page width stable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#servicios')).toBeVisible();
    await expect(page.getByRole('link', { name: /iniciar sesión|sign in/i }).first()).toBeVisible();
    await expect(page.getByRole('complementary', { name: /acciones rápidas de nvet care/i })).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });

  test('mobile exposes a persistent conversion path without covering content', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route, { waitUntil: 'networkidle' });

    const actionBar = page.getByRole('complementary', { name: /acciones rápidas de nvet care/i });
    await expect(actionBar).toBeVisible();
    await expect(actionBar.getByRole('link', { name: /servicios/i })).toBeVisible();
    await expect(actionBar.getByRole('link', { name: /solicitar atención/i })).toBeVisible();

    await actionBar.getByRole('link', { name: /servicios/i }).click();
    await expect(page.locator('#servicios')).toBeInViewport();
    await expectNoHorizontalOverflow(page);

    const bodyPaddingBottom = await page.evaluate(() => {
      const pageRoot = document.querySelector('.nvet-care-page');
      return pageRoot ? Number.parseFloat(getComputedStyle(pageRoot).paddingBottom) : 0;
    });
    expect(bodyPaddingBottom).toBeGreaterThan(70);
  });

  test('tablet layout stays within the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(route, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
