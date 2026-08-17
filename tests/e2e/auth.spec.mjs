import { test, expect } from '@playwright/test';

const authAlert = (page) => page.locator('form [role="alert"]');

async function blockExternalAuth(page) {
  let attempts = 0;
  await page.route('**/auth/v1/**', async (route) => {
    attempts += 1;
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'E2E_AUTH_NETWORK_BLOCKED' }),
    });
  });
  return () => attempts;
}

test.describe('CTG One authentication shell', () => {
  test('login uses the form submission path and validates credentials before backend access', async ({ page }) => {
    const authAttempts = await blockExternalAuth(page);
    await page.goto('/iniciar-sesion');

    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    const email = page.getByLabel('Correo electrónico');
    const password = page.getByLabel('Contraseña');
    const submit = page.getByRole('button', { name: 'Iniciar sesión' });

    await expect(submit).toHaveAttribute('type', 'submit');
    await email.fill('correo-invalido');
    await password.fill('password');
    await password.press('Enter');

    await expect(authAlert(page)).toHaveText('Correo inválido');
    expect(authAttempts()).toBe(0);
    await expect(page).toHaveURL(/\/iniciar-sesion$/);
  });

  test('login fails closed without allowing real Supabase auth traffic', async ({ page }) => {
    const authAttempts = await blockExternalAuth(page);
    await page.goto('/iniciar-sesion');

    await page.getByLabel('Correo electrónico').fill('e2e@example.com');
    await page.getByLabel('Contraseña').fill('not-a-production-password');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(authAlert(page)).toBeVisible();
    expect(authAttempts()).toBeLessThanOrEqual(1);
  });

  test('registration validates locally and blocks real signup traffic', async ({ page }) => {
    const authAttempts = await blockExternalAuth(page);
    await page.goto('/registro');

    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();
    const submit = page.getByRole('button', { name: 'Crear cuenta' });
    await expect(submit).toHaveAttribute('type', 'submit');

    await page.getByLabel('Nombre completo').fill('E2E Test User');
    await page.getByLabel('Teléfono').fill('3001234567');
    await page.getByLabel('Correo electrónico').fill('e2e@example.com');
    await page.getByLabel('Contraseña').fill('short');
    await submit.click();

    await expect(authAlert(page)).toHaveText('La contraseña debe tener al menos 8 caracteres');
    expect(authAttempts()).toBe(0);

    await page.getByLabel('Contraseña').fill('E2E-safe-password-123');
    await submit.click();
    await expect(authAlert(page)).toBeVisible();
    expect(authAttempts()).toBeLessThanOrEqual(1);
  });

  test('auth navigation links connect login and registration routes', async ({ page }) => {
    await page.goto('/iniciar-sesion');
    await page.getByRole('link', { name: 'Crea una' }).click();
    await expect(page).toHaveURL(/\/registro$/);

    await page.getByRole('link', { name: 'Inicia sesión' }).click();
    await expect(page).toHaveURL(/\/iniciar-sesion$/);
  });

  test('health endpoint remains public, non-cacheable, and does not expose privileged secrets', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');

    const body = await response.json();
    expect(body.service).toBe('ctg-one-web');
    expect(body).toHaveProperty('deployment');

    const serialized = JSON.stringify(body).toLowerCase();
    expect(serialized).not.toContain('service_role');
    expect(serialized).not.toContain('supabase_service_role_key');
  });
});
