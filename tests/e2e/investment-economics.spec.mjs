import { test, expect } from '@playwright/test';

test.describe('CTG Craft Beer authoritative economics', () => {
  test('public unit economics fails closed without a published lot snapshot', async ({ page }) => {
    await page.goto('/inversion');

    await expect(page.getByText('Cada lote publica su propio snapshot')).toBeVisible();
    await expect(page.getByText(/no hay un snapshot económico de lote disponible/i)).toBeVisible();
    await expect(page.getByText('$18.000', { exact: false })).toHaveCount(0);
    await expect(page.getByText('$8.000', { exact: false })).toHaveCount(0);
  });

  test('simulator refuses to invent financial projections without funding-open lot data', async ({ page }) => {
    await page.goto('/inversion/simulador');

    await expect(page.getByRole('heading', { name: 'Simulador por snapshot de lote' })).toBeVisible();
    await expect(page.getByText(/No hay lotes con financiación abierta y snapshot económico completo/i)).toBeVisible();
    await expect(page.getByText(/rentabilidad proyectada fija/i)).toBeVisible();
  });
});
