import { expect, test } from '@playwright/test';

test.describe('CTG One ecosystem access layer', () => {
  test('PISÁO launch remains behind the canonical CTG One session boundary', async ({ request }) => {
    const response = await request.get('/api/ecosystem/launch?app=pisao', { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    const location = response.headers().location ?? '';
    expect(location).toContain('/iniciar-sesion');
    expect(location).toContain('next=');
    expect(decodeURIComponent(location)).toContain('/api/ecosystem/launch?app=pisao');
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('unknown ecosystem targets fail closed', async ({ request }) => {
    const response = await request.get('/api/ecosystem/launch?app=unknown', { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: 'ECOSYSTEM_APP_NOT_AVAILABLE' });
  });
});
