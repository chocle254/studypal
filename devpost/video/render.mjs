import { chromium } from '/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + process.cwd() + '/intro.html'); await page.waitForTimeout(500);
const FPS = 30, END = 45.4;
const n = Math.round(END * FPS);
for (let f = 0; f < n; f++) {
  await page.evaluate((t) => window.render(t), f / FPS);
  await page.screenshot({ path: `frames/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
}
console.log('frames', n); await b.close();
