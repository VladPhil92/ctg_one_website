import { test, expect } from '@playwright/test';

const authAlert = (page) => page.locator('form [role="alert"]');

async function blockExternalAuth(page) {
  const attempts = [];
  await page.route('**/auth/v1/**', async (route) => {
    const request = route.request();
    attempts.push({ method: request.method(), url: request.url() });
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'E2E_AUTH_NETWORK_BLOCKED' }),
    });
  });

  return {
    all: () => attempts,
    passwordLogins: () => attempts.filter(({ method, url }) => method === 'POST' && url.includes('/token') && url.includes('grant_type=password')),
    signups: () => attempts.filter(({ method, url }) => method === 'POST' && url.includes('/signup')),
    recoveries: () => attempts.filter(({ method, url }) => method === 'POST' && url.includes('/recover')),
  };
}

test.describe('CTG One authentication shell', () => {
  test('login validates locally before password-auth backend access', async ({ page }) => {
    const authAttempts = await blockExternalAuth(page);
    await page.goto('/iniciar-sesion');

    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    const email = page.getByLabel('Correo electrónico');
    const password = page.getByLabel('Contraseña');
    const submit = page.getByRole('button', { name: 'Iniciar sesión' });

    await expect(submit).toHaveAttribute('type', 'submit');
    await expect(password).not.toHaveAttribute('minlength', '12');
    await email.fill('correo-invalido');
    await password.fill('legacy-password');
    await password.press('Enter');

    await expect(authAlert(page)).toHaveText('Correo inválido');
    expect(authAttempts.passwordLogins()).toHaveLength(0);
    await expect(page).toHaveURL(/\/iniciar-sesion$/);
  });

  test('login fails closed and never renders the blocked provider message', async ({ page }) => {
    const authAttempts = await blockExternalAuth(page);
    await page.goto('/iniciar-sesion');

    await page.getByLabel('Correo electrónico').fill(' E2E@Example.COM ');
    await page.getByLabel('Contraseña').fill('not-a-production-password');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(authAlert(page)).toBeVisible();
    await expect(authAlert(page)).not.toContainText('E2E_AUTH_NETWORK_BLOCKED');
    expect(authAttempts.passwordLogins().length).toBeLessThanOrEqual(1);
  });

  test('registration enforces the shared new-password policy before signup traffic', async ({ page }) => {
    const authAttempts = await blockExternalAuth(page);
    await page.goto('/registro');

    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();
    const submit = page.getByRole('button', { name: 'Crear cuenta' });
    const password = page.getByLabel('Contraseña');
    await expect(submit).toHaveAttribute('type', 'submit');
    await expect(password).toHaveAttribute('minlength', '12');
    await expect(page.getByText('12 o más caracteres', { exact: true })).toBeVisible();
    await expect(page.getByText('una letra mayúscula', { exact: true })).toBeVisible();
    await expect(page.getByText('un símbolo', { exact: true })).toBeVisible();

    await page.getByLabel('Nombre completo').fill('E2E Test User');
    await page.getByLabel('Teléfono').fill('3001234567');
    await page.getByLabel('Correo electrónico').fill(' E2E@Example.COM ');
    await password.fill('short');
    await submit.click();

    await expect(authAlert(page)).toHaveText('La contraseña debe incluir 12 o más caracteres.');
    expect(authAttempts.signups()).toHaveLength(0);

    await password.fill('E2E-safe-password-123');
    await submit.click();
    await expect(authAlert(page)).toBeVisible();
    await expect(authAlert(page)).not.toContainText('E2E_AUTH_NETWORK_BLOCKED');
    expect(authAttempts.signups().length).toBeLessThanOrEqual(1);
  });

  test('recovery keeps account existence private and blocks provider error leakage', async ({ page }) => {
    const authAttempts = await blockExternalAuth(page);
    await page.goto('/recuperar-contrasena');

    const email = page.getByLabel('Correo electrónico');
    const submit = page.getByRole('button', { name: 'Enviar enlace' });
    await email.fill('correo-invalido');
    await submit.click();
    await expect(authAlert(page)).toHaveText('Ingresa un correo electrónico válido.');
    expect(authAttempts.recoveries()).toHaveLength(0);

    await email.fill(' recovery@example.com ');
    await submit.click();
    await expect(authAlert(page)).toBeVisible();
    await expect(authAlert(page)).not.toContainText('E2E_AUTH_NETWORK_BLOCKED');
    expect(authAttempts.recoveries().length).toBeLessThanOrEqual(1);
  });

  test('authentication shell switches between Spanish and English without changing routes', async ({ page }) => {
    await blockExternalAuth(page);
    await page.goto('/iniciar-sesion');

    await page.getByRole('button', { name: 'Inglés' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot your password?' })).toBeVisible();
    await expect(page).toHaveURL(/\/iniciar-sesion$/);
  });

  test('auth navigation links connect login and registration routes', async ({ page }) => {
    await blockExternalAuth(page);
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
