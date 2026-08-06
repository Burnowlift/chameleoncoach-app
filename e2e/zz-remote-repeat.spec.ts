import { test, expect } from "@playwright/test";

test("vercel mobile: first load ok, reload ok", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`PAGEERROR: ${err.message.slice(0, 150)}`));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(`CONSOLE: ${msg.text().slice(0, 150)}`); });

  for (const round of [1, 2, 3]) {
    try {
      await page.goto("https://chameleoncoach-app.vercel.app/aluno", { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(3000);
    } catch (e) { errors.push(`GOTO${round}: ${String(e).slice(0, 120)}`); }
    console.log(`ROUND${round} errors:`, JSON.stringify(errors));
  }
  expect(errors.filter(e => e.includes("useMemo"))).toEqual([]);
});
