import { expect, test } from '@playwright/test';

async function preferSpanish(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('ctg-one-language', 'es');
    document.cookie = 'ctg_locale=es; path=/';
  });
}

function assertBrandTerms(text) {
  expect(text).toContain('CTG One');
  expect(text).toContain('Technology');
  expect(text).not.toContain('CTG Una');
  expect(text).not.toContain('Tecnología');
}

test.describe('CTG One immutable company name', () => {
  test('structural brand lockup stays CTG One Technology across locale changes', async ({ page }) => {
    await preferSpanish(page);
    await page.goto('/');

    const lockup = page.locator('[data-brand-lockup="ctg-one-technology"]').first();
    await expect(lockup).toBeVisible();
    await expect(lockup).toHaveAttribute('translate', 'no');
    assertBrandTerms((await lockup.textContent()) ?? '');

    await page.getByRole('button', { name: 'Inglés' }).click();
    assertBrandTerms((await lockup.textContent()) ?? '');

    await page.getByRole('button', { name: 'Spanish' }).click();
    assertBrandTerms((await lockup.textContent()) ?? '');
  });

  test('legacy privacy lockup cannot translate Technology independently', async ({ page }) => {
    await preferSpanish(page);
    await page.goto('/privacy');

    const homeLink = page.locator('nav a[href="/"]').first();
    await expect(homeLink).toBeVisible();
    const text = (await homeLink.textContent()) ?? '';
    assertBrandTerms(text);
  });
});
