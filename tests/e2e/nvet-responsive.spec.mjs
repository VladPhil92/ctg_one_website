import { expect, test } from '@playwright/test';

const route = '/nvetcareapp';

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function expectVisualLibraryImagesLoaded(page) {
  const visualLibrary = page.getByTestId('nvet-visual-library');
  await visualLibrary.scrollIntoViewIfNeeded();

  const images = visualLibrary.locator('img');
  const count = await images.count();

  for (let index = 0; index < count; index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(
        () => image.evaluate((element) => ({ complete: element.complete, naturalWidth: element.naturalWidth })),
        { timeout: 10000 },
      )
      .toMatchObject({ complete: true });
    const naturalWidth = await image.evaluate((element) => element.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  }
}

test.describe('Nvet Care responsive public landing', () => {
  test('desktop keeps the hero, service hierarchy and visual library stable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#servicios')).toBeVisible();
    await expect(page.getByRole('link', { name: /iniciar sesión|sign in/i }).first()).toBeVisible();
    await expect(page.getByRole('complementary', { name: /acciones rápidas de nvet care|nvet care quick actions/i })).toBeHidden();

    const visualLibrary = page.getByTestId('nvet-visual-library');
    await expect(visualLibrary).toBeVisible();
    await expect(visualLibrary.locator('[data-nvet-visual-card]')).toHaveCount(4);
    await expectVisualLibraryImagesLoaded(page);
    await expectNoHorizontalOverflow(page);
  });

  test('mobile exposes persistent conversion plus a swipeable visual rail', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route, { waitUntil: 'networkidle' });

    const actionBar = page.getByRole('complementary', { name: /acciones rápidas de nvet care|nvet care quick actions/i });
    await expect(actionBar).toBeVisible();
    await expect(actionBar.getByRole('link', { name: /servicios|services/i })).toBeVisible();
    await expect(actionBar.getByRole('link', { name: /solicitar atención|request care/i })).toBeVisible();

    await actionBar.getByRole('link', { name: /servicios|services/i }).click();
    await expect(page.locator('#servicios')).toBeInViewport();
    await expectNoHorizontalOverflow(page);

    const landingPaddingBottom = await page.evaluate(() => {
      const landing = document.querySelector('.nvet-care-landing');
      return landing ? Number.parseFloat(getComputedStyle(landing).paddingBottom) : 0;
    });
    expect(landingPaddingBottom).toBeGreaterThan(70);

    const rail = page.locator('.nvet-visual-rail');
    await rail.scrollIntoViewIfNeeded();
    await expect(rail).toBeVisible();
    const railDimensions = await rail.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(railDimensions.scrollWidth).toBeGreaterThan(railDimensions.clientWidth);
    await expectVisualLibraryImagesLoaded(page);
  });

  test('tablet layout stays within the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(route, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('nvet-visual-library')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
