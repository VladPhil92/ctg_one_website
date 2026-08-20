import { test, expect } from '@playwright/test';

test.describe('CTG One critical browser journeys', () => {
  test('participant KYC route fails closed and preserves the return target', async ({ page }) => {
    await page.goto('/dashboard/kyc');
    await expect(page).toHaveURL(/\/iniciar-sesion\?next=\/dashboard\/kyc$/);
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('investment control layer fails closed and preserves the return target', async ({ page }) => {
    await page.goto('/inversion/app');
    await expect(page).toHaveURL(/\/iniciar-sesion\?next=\/inversion\/app$/);
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('admin surface never renders privileged UI without configured authenticated infrastructure', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('body')).not.toContainText('Panel administrativo');
  });

  test('login and registration navigation remains deterministic from a protected KYC return target', async ({ page }) => {
    await page.goto('/iniciar-sesion?next=/dashboard/kyc');
    await page.getByRole('link', { name: 'Crea una' }).click();
    await expect(page).toHaveURL(/\/registro$/);
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();
  });

  test('public health stays reachable while protected surfaces fail closed', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');
  });
});
