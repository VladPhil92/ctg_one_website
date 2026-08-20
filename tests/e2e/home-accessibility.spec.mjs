import { expect, test } from '@playwright/test';

async function preferSpanish(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('ctg-one-language', 'es');
    document.cookie = 'ctg_locale=es; path=/';
  });
}

const ECOSYSTEM_LABELS_ES = [
  'Estrategia de IA',
  'Comercio',
  'Hospitalidad',
  'Educación',
  'Salud',
  'Legal',
  'Diseño',
  'Fintech',
];

const RESPONSIVE_VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1600, height: 1000 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

async function expectImmutableBrandName(page) {
  const lockup = page.locator('[data-brand-lockup="ctg-one-technology"]').first();
  await expect(lockup).toBeVisible();
  await expect(lockup).toHaveAttribute('translate', 'no');
  const text = (await lockup.textContent()) ?? '';
  expect(text).toContain('CTG One');
  expect(text).toContain('Technology');
  expect(text).not.toContain('CTG Una');
  expect(text).not.toContain('Tecnología');
}

test.describe('CTG One home UI/UX accessibility contract', () => {
  test('Spanish home renders explicit localized card copy without English fallback', async ({ page }) => {
    await preferSpanish(page);
    await page.goto('/');

    await expectImmutableBrandName(page);
    await expect(page.getByText('Fundada en 2024 en Cartagena, Colombia', { exact: false })).toBeVisible();
    await expect(page.getByText('CTG One construye la base tecnológica', { exact: false })).toBeVisible();
    await expect(page.getByText(/\d+ negocios operativos ofrecen entornos reales de aplicación para CTG One Technology/i)).toBeVisible();
    await expect(page.getByText('Conoce cómo CTG One construye y despliega', { exact: false })).toBeVisible();

    await expect(page.getByText('Founded in 2024 in Cartagena, Colombia', { exact: false })).toHaveCount(0);
    await expect(page.getByText('CTG One builds the technological foundation', { exact: false })).toHaveCount(0);
    await expect(page.getByText('See more', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Ver más', { exact: true })).toHaveCount(0);

    for (const label of [
      'Conocer CTG One',
      'Ver qué construimos',
      'Explorar el portafolio',
      'Ver CTG Recompensas',
      'Ver estrategia Web3',
      'Hablar con el equipo',
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    await expect(page.getByText('Núcleo en línea', { exact: true })).toBeVisible();
    await expect(page.getByText('PRODUCTO OPERATIVO / CASO-001', { exact: true })).toBeVisible();
    await expect(page.getByText('Cartagena · Capa de producción física', { exact: true })).toBeVisible();
    await expect(page.getByText('Core online', { exact: true })).toHaveCount(0);
    await expect(page.getByText('LIVE PRODUCT / CASE-001', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Cartagena · Physical production layer', { exact: true })).toHaveCount(0);
  });

  test('CTG One Technology brand name never changes with the site locale', async ({ page }) => {
    await preferSpanish(page);
    await page.goto('/');

    await expectImmutableBrandName(page);
    await page.getByRole('button', { name: 'Inglés' }).click();
    await expectImmutableBrandName(page);
    await page.getByRole('button', { name: 'Spanish' }).click();
    await expectImmutableBrandName(page);
  });

  test('public positioning remains technology-first and Rewards honors Spanish locale', async ({ page }) => {
    await preferSpanish(page);

    await page.goto('/about');
    await expect(page.getByText('Construimos desde dentro de los negocios', { exact: false })).toBeVisible();
    await expect(page.getByText(/agencia/i)).toHaveCount(0);
    await expect(page.getByText(/agency/i)).toHaveCount(0);
    await expect(page.getByText('Negocios operativos', { exact: true })).toBeVisible();

    await page.goto('/rewards');
    await expect(page.getByText('CTG Rewards · Hoja de ruta', { exact: true })).toBeVisible();
    await expect(page.getByText('Reconocimiento por participación', { exact: true })).toBeVisible();
    await expect(page.getByText('Redención entre unidades', { exact: true })).toBeVisible();
    await expect(page.getByText('Engagement Recognition', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Gana al participar|Gana al referir/i)).toHaveCount(0);
  });

  test('skip link is first keyboard target and bypasses public navigation on multiple routes', async ({ page }) => {
    await preferSpanish(page);

    for (const path of ['/', '/about']) {
      await page.goto(path);
      await page.keyboard.press('Tab');
      const skip = page.getByRole('link', { name: 'Saltar al contenido' });
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(page.locator('#after-primary-navigation')).toBeFocused();
    }
  });

  test('reduced motion keeps every reveal section visible and removes diagram motion', async ({ page }) => {
    await preferSpanish(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const revealStates = await page.locator('[data-reveal]').evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        return { opacity: Number(style.opacity), transform: style.transform };
      }),
    );
    expect(revealStates.length).toBeGreaterThan(3);
    for (const state of revealStates) {
      expect(state.opacity).toBeGreaterThan(0.95);
      expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(state.transform);
    }

    await expect(page.locator('[data-ecosystem-diagram] animateMotion')).toHaveCount(0);
    await expect(page.locator('[data-ecosystem-diagram] animateTransform')).toHaveCount(0);
  });

  test('390px mobile layout puts the message before the diagram and keeps touch targets at 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await preferSpanish(page);
    await page.goto('/');

    const headingBox = await page.getByRole('heading', { level: 1 }).boundingBox();
    const diagramBox = await page.locator('[data-ecosystem-diagram]').boundingBox();
    expect(headingBox).not.toBeNull();
    expect(diagramBox).not.toBeNull();
    expect(headingBox.y).toBeLessThan(diagramBox.y);

    const menuButton = page.getByRole('button', { name: 'Abrir menú' });
    const menuButtonBox = await menuButton.boundingBox();
    expect(menuButtonBox.width).toBeGreaterThanOrEqual(44);
    expect(menuButtonBox.height).toBeGreaterThanOrEqual(44);

    for (const language of ['Español', 'Inglés']) {
      const box = await page.getByRole('button', { name: language }).boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    await menuButton.click();
    const dialog = page.getByRole('dialog', { name: 'Navegación móvil' });
    await expect(dialog).toBeVisible();
    const undersizedTargets = await dialog.locator('a, button').evaluateAll((nodes) =>
      nodes
        .map((node) => ({
          text: node.textContent?.trim() ?? '',
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        }))
        .filter(({ width, height }) => width < 44 || height < 44),
    );
    expect(undersizedTargets).toEqual([]);
  });

  test('command center preserves all eight ecosystem nodes without horizontal overflow across target breakpoints', async ({ page }) => {
    await preferSpanish(page);

    for (const viewport of RESPONSIVE_VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.goto('/');

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('[data-ecosystem-diagram]')).toBeVisible();

      const layout = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(layout.scrollWidth, `${viewport.width}px document overflow`).toBeLessThanOrEqual(layout.clientWidth + 1);
      expect(layout.bodyScrollWidth, `${viewport.width}px body overflow`).toBeLessThanOrEqual(layout.innerWidth + 1);

      for (const label of ECOSYSTEM_LABELS_ES) {
        await expect(page.locator('[data-ecosystem-diagram] text', { hasText: label }), `${viewport.width}px missing node ${label}`).toHaveCount(1);
      }
    }
  });

  test('canonical privacy route redirects legacy path without disturbing product namespace', async ({ page }) => {
    const privacyResponse = await page.goto('/privacidad');
    expect(privacyResponse?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/privacy$/);

    const investmentResponse = await page.goto('/investment');
    expect(investmentResponse?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/inversion$/);
  });
});
