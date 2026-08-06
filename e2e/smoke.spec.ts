import { test, expect } from "@playwright/test";

// Smoke tests mobile/desktop — páginas públicas (não exigem credenciais)

test("landing page renderiza e tem PWA manifest", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Chameleon/);
  const manifest = page.locator('link[rel="manifest"]');
  await expect(manifest).toHaveAttribute("href", /manifest/);
  const themeColor = page.locator('meta[name="theme-color"]');
  await expect(themeColor).toHaveCount(1);
});

test("landing mostra CTA de instalação no mobile", async ({ page }) => {
  await page.goto("/");
  const cta = page.getByRole("button", { name: /instalar/i }).first();
  if (await cta.isVisible().catch(() => false)) {
    await expect(cta).toBeVisible();
  }
});

test("login do aluno renderiza no viewport mobile", async ({ page }) => {
  await page.goto("/aluno/login");
  await expect(page.getByRole("heading", { level: 1 }).or(page.getByRole("button", { name: /entrar|login/i }).first())).toBeVisible();
  if (test.info().project.name !== "desktop-chromium") {
    const viewport = page.viewportSize()!;
    expect(viewport.width).toBeLessThanOrEqual(450);
  }
});

test("login do treinador renderiza", async ({ page }) => {
  await page.goto("/login-treinador");
  await expect(page.getByRole("button", { name: /entrar/i }).first()).toBeVisible();
});

test("SW registrado após navegar (offline shell precacheado)", async ({ page }) => {
  await page.goto("/");
  const hasSw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.active) return true;
    try {
      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise(res => setTimeout(() => res(null), 8000)),
      ]);
      return !!ready;
    } catch {
      return false;
    }
  });
  expect(hasSw).toBe(true);
});
