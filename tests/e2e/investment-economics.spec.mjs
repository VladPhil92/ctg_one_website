import { test, expect } from '@playwright/test';

test.describe('CTG Craft Beer authoritative economics', () => {
  test('public unit economics fails closed without a published lot snapshot', async ({ page }) => {
    await page.goto('/inversion');

    await expect(page.getByText('Cada lote publica su propio snapshot')).toBeVisible();
    await expect(page.getByText(/no hay un snapshot económico de lote disponible/i)).toBeVisible();
    await expect(page.getByText('$18.000', { exact: false })).toHaveCount(0);
    await expect(page.getByText('$8.000', { exact: false })).toHaveCount(0);
  });

  test('snapshot disclosure is fully translated when English is selected', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('ctg-one-language', 'en'));
    await page.goto('/inversion');

    await expect(page.getByText('Each batch publishes its own snapshot')).toBeVisible();
    await expect(page.getByText(/There is currently no batch economics snapshot available for publication/i)).toBeVisible();
    await expect(page.getByText('Cada lote publica su propio snapshot')).toHaveCount(0);
  });

  test('simulator remains usable without an open lot and starts at the two-case minimum', async ({ page }) => {
    await page.goto('/inversion/simulador');

    await expect(page.getByRole('heading', { name: 'Simulador de participación' })).toBeVisible();
    await expect(page.getByText('Escenario ilustrativo de referencia')).toBeVisible();
    await expect(page.getByText(/no representa una oferta vigente/i)).toBeVisible();

    const cases = page.getByLabel(/Número de cajas · mínimo 2/i);
    await expect(cases).toHaveAttribute('min', '2');
    await expect(cases).toHaveValue('2');
    await expect(page.getByText('2 cajas · 48 botellas equivalentes')).toBeVisible();

    await cases.fill('3');
    await expect(cases).toHaveValue('3');
    await expect(page.getByText('3 cajas · 72 botellas equivalentes')).toBeVisible();
  });
});
