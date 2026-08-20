import { test, expect } from '@playwright/test';

const protectedCases = [
  { path: '/dashboard/kyc', next: '/dashboard/kyc' },
  { path: '/dashboard/inversion', next: '/inversion/app' },
];

test.describe('CTG One critical authenticated boundaries', () => {
  for (const scenario of protectedCases) {
    test(`${scenario.path} fails closed for an unauthenticated browser`, async ({ page }) => {
      await page.goto(scenario.path);
      await expect(page).toHaveURL(/\/iniciar-sesion/);
      const url = new URL(page.url());
      expect(url.searchParams.get('next')).toBe(scenario.next);
      await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    });
  }

  test('KYC capture is never rendered before validated identity exists', async ({ page }) => {
    await page.goto('/dashboard/kyc');
    await expect(page).toHaveURL(/\/iniciar-sesion/);
    await expect(page.getByText('Registrar documento')).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  });

  test('admin KYC review surface fails closed when server identity/configuration is unavailable', async ({ page }) => {
    await page.goto('/admin/kyc');
    await expect(page).not.toHaveURL(/\/admin\/kyc(?:\?|$)/);
    await expect(page.getByText('Revisión de KYC')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /aprobar/i })).toHaveCount(0);
  });
});
