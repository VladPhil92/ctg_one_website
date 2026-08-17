import { test, expect } from '@playwright/test';

test.describe('CTG One authentication shell', () => {
  test('login uses the form submission path and validates credentials before backend access', async ({ page }) => {
    await page.goto('/iniciar-sesion');

    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    const email = page.getByLabel('Correo electrónico');
    const password = page.getByLabel('Contraseña');
    const submit = page.getByRole('button', { name: 'Iniciar sesión' });

    await expect(submit).toHaveAttribute('type', 'submit');
    await email.fill('correo-invalido');
    await password.fill('password');
    await password.press('Enter');

    await expect(page.getByRole('alert')).toHaveText('Correo inválido');
    await expect(page).toHaveURL(/\/iniciar-sesion$/);
  });

  test('login fails closed when the CI runtime has no Supabase browser configuration', async ({ page }) => {
    await page.goto('/iniciar-sesion');

    await page.getByLabel('Correo electrónico').fill('e2e@example.com');
    await page.getByLabel('Contraseña').fill('not-a-production-password');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByRole('alert')).toHaveText(
      'El inicio de sesión no está disponible todavía. Vuelve a intentarlo más tarde.'
    );
  });

  test('registration validates locally and remains non-destructive without backend configuration', async ({ page }) => {
    await page.goto('/registro');

    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();
    const submit = page.getByRole('button', { name: 'Crear cuenta' });
    await expect(submit).toHaveAttribute('type', 'submit');

    await page.getByLabel('Nombre completo').fill('E2E Test User');
    await page.getByLabel('Teléfono').fill('3001234567');
    await page.getByLabel('Correo electrónico').fill('e2e@example.com');
    await page.getByLabel('Contraseña').fill('short');
    await submit.click();

    await expect(page.getByRole('alert')).toHaveText('La contraseña debe tener al menos 8 caracteres');

    await page.getByLabel('Contraseña').fill('E2E-safe-password-123');
    await submit.click();
    await expect(page.getByRole('alert')).toHaveText(
      'El registro no está disponible todavía. Vuelve a intentarlo más tarde.'
    );
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
