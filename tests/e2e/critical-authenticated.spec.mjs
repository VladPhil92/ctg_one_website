import { test, expect } from '@playwright/test';

const runAuthenticatedSuite = process.env.E2E_AUTHENTICATED === '1';
const localSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const localSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const localSupabaseServiceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

test.describe('CTG One authenticated critical journey', () => {
  test.skip(!runAuthenticatedSuite, 'Requires the isolated local Supabase stack from CI.');

  test('KYC survives a partial Storage failure and finalizes through the same resumable intake', async ({ page, request }) => {
    expect(localSupabaseUrl).toBeTruthy();
    expect(localSupabaseAnonKey).toBeTruthy();
    expect(localSupabaseServiceRoleKey).toBeTruthy();

    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `e2e-kyc-${unique}@example.com`;
    const password = 'E2E-Safe-Password!123';

    // Provision a confirmed identity through the service-role-only admin API of
    // the isolated local Supabase stack. The key never reaches the browser and
    // no production credential is involved. Registration UX has separate tests;
    // this journey is responsible for authenticated KYC recovery semantics.
    const createUser = await request.post(`${localSupabaseUrl}/auth/v1/admin/users`, {
      headers: {
        apikey: localSupabaseServiceRoleKey,
        Authorization: `Bearer ${localSupabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Critical E2E User', phone: '3001234567' },
      },
    });
    expect(createUser.ok(), await createUser.text()).toBeTruthy();

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
    const retryError = page.locator('p.accountError[role="alert"]');
    await expect(retryError).toContainText('Puedes volver a intentar');
    expect(failBackUploadOnce).toBe(false);
    await expect(page.getByRole('heading', { name: 'Registrar documento' })).toBeVisible();

    // The second click must reuse the original unfinished submission. The
    // already-durable front object may return 409; the client treats that as a
    // resumable state and the RPC registration remains idempotent.
    await page.getByRole('button', { name: 'Enviar para revisión' }).click();
    await expect(page.getByText('Verificación en revisión')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Registrar documento' })).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard\/kyc$/);
    await expect(page.getByText('Verificación en revisión')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Registrar documento' })).toHaveCount(0);
  });
});
