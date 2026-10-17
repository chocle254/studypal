import { chromium } from '/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs=[]; page.on('pageerror', e=>errs.push(String(e)));
await page.goto('file://' + process.cwd() + '/intro.html'); await page.waitForTimeout(500);
for (const t of [4, 8, 11.5, 17, 20.5, 28.5, 32.5, 40, 43.8]) {
  await page.evaluate((t) => window.render(t), t);
  await page.screenshot({ path: `key-${t}.jpg`, type: 'jpeg', quality: 70 });
}
console.log('errors', errs); await b.close();
