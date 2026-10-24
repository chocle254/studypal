import { chromium } from '/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 860, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'light' });
const p = await ctx.newPage();
const D = '/home/claude/stumate-basics/devpost/', O = process.argv[2];
for (const [n, u] of [['scope', D + 'scope.html'], ['prd', D + 'prd.html'], ['spec', D + 'spec.html'], ['checklist', O + '/checklist.html']]) {
  await p.goto('file://' + u); await p.waitForTimeout(300);
  await p.screenshot({ path: `${O}/doc-${n}.png`, fullPage: true });
}
await b.close();
