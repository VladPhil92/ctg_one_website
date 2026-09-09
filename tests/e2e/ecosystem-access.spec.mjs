import { expect, test } from '@playwright/test';

test.describe('CTG One ecosystem access layer', () => {
  test('PISÁO launch fails closed before any external redirect when the identity backend is unavailable', async ({ request }) => {
    const response = await request.get('/api/ecosystem/launch?app=pisao', { maxRedirects: 0 });
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ error: 'ECOSYSTEM_FEDERATION_UNAVAILABLE' });
    expect(response.headers().location).toBeUndefined();
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('unknown ecosystem targets fail closed', async ({ request }) => {
    const response = await request.get('/api/ecosystem/launch?app=unknown', { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: 'ECOSYSTEM_APP_NOT_AVAILABLE' });
  });
});
