import { test, expect } from '@playwright/test';

const runAuthenticatedSuite = process.env.E2E_AUTHENTICATED === '1';

test.describe('CTG One authenticated critical journey', () => {
  test.skip(!runAuthenticatedSuite, 'Requires the isolated local Supabase stack from CI.');

  test('KYC survives a partial Storage failure and finalizes exactly through retry', async ({ page }) => {
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `e2e-kyc-${unique}@example.com`;
    const password = 'E2E-Safe-Password!123';

    await page.goto('/registro');
    await page.getByLabel('Nombre completo').fill('Critical E2E User');
    await page.getByLabel('Teléfono').fill('3001234567');
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();

    await page.goto('/iniciar-sesion?next=/dashboard/kyc');
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/dashboard\/kyc$/);
    await expect(page.getByRole('heading', { name: 'Verificación de identidad' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Registrar documento' })).toBeVisible();

    await page.getByLabel('Cédula — lado frontal').setInputFiles({
      name: 'front.png',
      mimeType: 'image/png',
      buffer: Buffer.from('critical-e2e-front'),
    });
    await page.getByLabel('Cédula — lado posterior').setInputFiles({
      name: 'back.png',
      mimeType: 'image/png',
      buffer: Buffer.from('critical-e2e-back'),
    });

    let failBackUploadOnce = true;
    await page.route('**/storage/v1/object/kyc-documents/**', async (route) => {
      const url = decodeURIComponent(route.request().url());
      if (failBackUploadOnce && url.endsWith('/cedula_back')) {
        failBackUploadOnce = false;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'E2E_TRANSIENT_STORAGE_FAILURE' }),
        });
        return;
      }
      await route.continue();
    });

    await page.getByRole('button', { name: 'Enviar para revisión' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'No se pudo completar el envío. Puedes intentarlo de nuevo sin duplicar tu presentación.',
    );
    await expect(page.getByRole('heading', { name: 'Registrar documento' })).toBeVisible();

    await page.getByRole('button', { name: 'Enviar para revisión' }).click();
    await expect(page.getByText('Verificación en revisión')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Registrar documento' })).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard\/kyc$/);
    await expect(page.getByText('Verificación en revisión')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Registrar documento' })).toHaveCount(0);
  });
});
