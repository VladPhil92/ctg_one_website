import { test, expect } from '@playwright/test';

const runAuthenticatedSuite = process.env.E2E_AUTHENTICATED === '1';
const localSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const localSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test.describe('CTG One authenticated critical journey', () => {
  test.skip(!runAuthenticatedSuite, 'Requires the isolated local Supabase stack from CI.');

  test('KYC survives a partial Storage failure and finalizes exactly through retry', async ({ page, request }) => {
    expect(localSupabaseUrl).toBeTruthy();
    expect(localSupabaseAnonKey).toBeTruthy();

    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `e2e-kyc-${unique}@example.com`;
    const password = 'E2E-Safe-Password!123';

    // Provision a deterministic local identity independently from confirmation
    // email semantics. Registration UI/provider behavior has its own tests; this
    // journey is responsible for the authenticated KYC retry contract.
    const signup = await request.post(`${localSupabaseUrl}/auth/v1/signup`, {
      headers: {
        apikey: localSupabaseAnonKey,
        Authorization: `Bearer ${localSupabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        email,
        password,
        data: { full_name: 'Critical E2E User', phone: '3001234567' },
      },
    });
    expect(signup.ok(), await signup.text()).toBeTruthy();

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
    await expect(page.getByRole('alert')).toContainText('Puedes intentarlo de nuevo');
    expect(failBackUploadOnce).toBe(false);
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
