import { test, expect } from '@playwright/test';

const runAuthenticatedSuite = process.env.E2E_AUTHENTICATED === '1';
const localSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const localSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const localSupabaseServiceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

async function provisionConfirmedUser(request, prefix) {
  expect(localSupabaseUrl).toBeTruthy();
  expect(localSupabaseAnonKey).toBeTruthy();
  expect(localSupabaseServiceRoleKey).toBeTruthy();

  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${prefix}-${unique}@example.com`;
  const password = 'E2E-Safe-Password!123';
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
  const created = await createUser.json();
  expect(created.id).toBeTruthy();
  return { email, password, userId: created.id };
}

async function grantAdminInvestmentRole(request, userId, investmentRole) {
  const headers = {
    apikey: localSupabaseServiceRoleKey,
    Authorization: `Bearer ${localSupabaseServiceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const promoteGlobal = await request.patch(`${localSupabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
    headers,
    data: { role: 'admin' },
  });
  expect(promoteGlobal.ok(), await promoteGlobal.text()).toBeTruthy();

  const createInvestmentProfile = await request.post(`${localSupabaseUrl}/rest/v1/investment_participant_profiles`, {
    headers,
    data: { user_id: userId, investment_role: investmentRole },
  });
  expect(createInvestmentProfile.ok(), await createInvestmentProfile.text()).toBeTruthy();
}

async function signIn(page, email, password, next) {
  await page.goto(`/iniciar-sesion?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

test.describe('CTG One authenticated critical journey', () => {
  test.skip(!runAuthenticatedSuite, 'Requires the isolated local Supabase stack from CI.');

  test('KYC survives a partial Storage failure and finalizes through the same resumable intake', async ({ page, request }) => {
    const { email, password } = await provisionConfirmedUser(request, 'e2e-kyc');

    await signIn(page, email, password, '/dashboard/kyc');

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

  test('SUPER_ADMIN can switch to user view and return without changing authority', async ({ page, request }) => {
    const { email, password, userId } = await provisionConfirmedUser(request, 'e2e-superadmin');
    await grantAdminInvestmentRole(request, userId, 'SUPER_ADMIN');

    await signIn(page, email, password, '/admin');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: /Superadmin Command Center/i })).toBeVisible();

    await page.getByRole('button', { name: 'Vista usuario' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Está navegando CTG One como usuario.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Volver a Superadmin' })).toBeVisible();

    // Simulate another tab clearing or expiring the session-bound effective
    // view. The mounted dashboard layout must not keep user mode alive during
    // the next client-side participant navigation.
    const clearedStatus = await page.evaluate(async () => {
      const response = await fetch('/api/admin/view-mode', { method: 'DELETE' });
      return response.status;
    });
    expect(clearedStatus).toBe(200);

    const walletLink = page.locator('a[href="/dashboard/wallet"]').first();
    await expect(walletLink).toBeVisible();
    await walletLink.click();
    await expect(page).toHaveURL(/\/admin$/);

    // Re-enter user view and verify the explicit return control still removes
    // effective-view state without changing the stored SUPER_ADMIN authority.
    await page.getByRole('button', { name: 'Vista usuario' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('button', { name: 'Volver a Superadmin' })).toBeVisible();

    await page.getByRole('button', { name: 'Volver a Superadmin' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: /Superadmin Command Center/i })).toBeVisible();

    // Returning to Superadmin deletes the effective-view cookie. A direct
    // dashboard visit therefore resolves back to the privileged command layer.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('non-superadmin admin cannot forge the user-view switch', async ({ page, request }) => {
    const { email, password, userId } = await provisionConfirmedUser(request, 'e2e-finance-admin');
    await grantAdminInvestmentRole(request, userId, 'FINANCE_ADMIN');

    await signIn(page, email, password, '/admin');
    await expect(page).toHaveURL(/\/admin$/);

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/admin/view-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'user' }),
      });
      return { status: response.status, body: await response.json() };
    });

    expect(result.status).toBe(403);
    expect(result.body.error).toContain('SUPER_ADMIN');

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/admin$/);
  });
});
