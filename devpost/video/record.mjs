// Records a full Study Pal round on the live app, at phone resolution, with tap ripples.
// Frames come from the Chrome DevTools screencast (with timestamps); marks.json says when each scene starts.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const SITE = 'https://studypal-murex.vercel.app';
const PDF = '/tmp/claude-0/-home-claude/3302bdd6-d14a-5633-bd53-82ac7b1d4849/scratchpad/demo/intro-to-machine-learning.pdf';
fs.rmSync('frames', { recursive: true, force: true });
fs.mkdirSync('frames');

const TOPIC_TEXT = [
  'Machine learning is when computers learn patterns from data together with the answers, instead of following rules written by hand. The result of learning is a model that takes an input and gives a prediction. It is used when rules are too complex, like spam filters, song recommendations, face recognition and fraud detection. The three types are supervised learning with labels, unsupervised learning that finds hidden groups without labels, and reinforcement learning that learns by trial and error with rewards.',
  'In supervised learning each example has features, which are the inputs, and a label, which is the correct answer. Classification predicts a category like spam or not spam, and regression predicts a number like a house price. Common algorithms are linear regression, logistic regression, decision trees and k-nearest neighbours. Logistic regression is actually a classification algorithm because it outputs a probability that becomes a yes or no answer.',
  'We split the data into a training set of about 80 percent and a test set of 20 percent so we can test on data the model has never seen. Training adjusts the model parameters to reduce mistakes, and testing compares predictions with the true labels, for example with accuracy. Overfitting is when the model memorises the training data and does well on training but badly on the test set. Underfitting is when the model is too simple. More data and simpler models help avoid overfitting.',
];
const words = (s) => new Set((s.toLowerCase().match(/[a-z0-9]{3,}/g) || []));
function bestSentences(topic, question, n = 2) {
  const q = words(question);
  const sents = TOPIC_TEXT[topic].split(/(?<=\.)\s+/);
  return sents
    .map((s) => ({ s, k: [...words(s)].filter((w) => q.has(w)).length }))
    .sort((a, b) => b.k - a.k)
    .slice(0, n)
    .map((x) => x.s)
    .join(' ');
}
function bestOption(topic, options) {
  const t = words(TOPIC_TEXT.join(' '));
  const own = words(TOPIC_TEXT[topic]);
  return options
    .map((o) => ({ o, k: [...words(o)].filter((w) => own.has(w)).length * 2 + [...words(o)].filter((w) => t.has(w)).length }))
    .sort((a, b) => b.k - a.k)[0].o;
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
  permissions: ['clipboard-read', 'clipboard-write'],
});
// Tap ripples so viewers can see where the finger goes.
await ctx.addInitScript(() => {
  addEventListener('pointerdown', (e) => {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;background:rgba(43,48,45,.28);border:2px solid rgba(255,255,255,.8);pointer-events:none;z-index:99999;transition:transform .45s ease-out,opacity .45s ease-out;transform:scale(.6)`;
    document.documentElement.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = 'scale(1.5)'; d.style.opacity = '0'; });
    setTimeout(() => d.remove(), 600);
  }, true);
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));

// Screencast at device resolution.
const cdp = await ctx.newCDPSession(page);
const frames = [];
let n = 0;
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const f = `frames/f${String(n++).padStart(6, '0')}.jpg`;
  fs.writeFileSync(f, Buffer.from(data, 'base64'));
  frames.push({ f, t: metadata.timestamp });
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
const marks = [];
const mark = (name) => { marks.push({ name, t: Date.now() / 1000 }); console.log('mark', name, new Date().toISOString().slice(11, 19)); };
const pause = (ms) => page.waitForTimeout(ms);
const center = (l) => l.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' })).catch(() => {});
const tap = async (sel) => { const l = page.locator(sel).first(); await l.waitFor({ timeout: 60000 }); await center(l); await pause(350); await l.tap({ force: true }); };
const type = async (sel, text, delay = 28) => { const l = page.locator(sel).first(); await center(l); await l.tap({ force: true }); await l.pressSequentially(text, { delay }); };
const scrollBy = async (px, steps = 12) => { for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, px / steps); await pause(40); } };
const toTop = () => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));

// Answer the questions shown on screen (test, check or retake). good=false gives vague answers.
async function answerAll(topic, good) {
  const items = page.locator('ol > li:has(p.font-semibold)');
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    const li = items.nth(i);
    const prompt = await li.locator('p').first().innerText();
    const ta = li.locator('textarea');
    if (await ta.count()) {
      await center(li);
      const text = good ? bestSentences(topic, prompt, 2) : ['Not sure, something about data?', 'I think it is about computers.', 'No idea.'][i % 3];
      await ta.tap();
      // type the first part visibly, then the rest quickly
      const visible = text.slice(0, 70), rest = text.slice(70);
      await ta.pressSequentially(visible, { delay: 22 });
      if (rest) await ta.fill(text);
      await pause(300);
    } else {
      const opts = await li.locator('button').allInnerTexts();
      if (!opts.length) continue;
      const pick = good ? bestOption(topic, opts) : opts[opts.length - 1];
      const ob = li.locator('button', { hasText: pick }).first(); await center(ob); await pause(200); await ob.tap({ force: true });
      await pause(400);
    }
  }
}
async function waitLesson() {
  for (;;) {
    const s = await Promise.race([
      page.waitForSelector('text=/Step 1 of/', { timeout: 240000 }).then(() => 'ok'),
      page.waitForSelector('button:has-text("Try again")', { timeout: 240000 }).then(() => 'retry'),
    ]);
    if (s === 'ok') return;
    console.log('lesson failed on screen, trying again');
    await tap('button:has-text("Try again")');
  }
}
// Read through a lesson: pause on each step, scroll to show diagrams/code, optionally Ask and Copy.
async function readLesson({ ask = null, copy = false, fast = false }) {
  for (let step = 0; ; step++) {
    await pause(fast ? 900 : 1800);
    const h = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    if (h > 40) { await scrollBy(Math.min(h, 900), 14); await pause(fast ? 600 : 1400); }
    if (copy && (await page.locator('button[aria-label="Copy code"]').count())) {
      mark('code');
      await page.locator('button[aria-label="Copy code"]').first().scrollIntoViewIfNeeded();
      await pause(1200);
      await tap('button[aria-label="Copy code"]'); await pause(1500); copy = false;
    }
    if (ask && step === 1) {
      mark('ask');
      await tap('button:has-text("Ask about this")'); await pause(600);
      await type('input[placeholder^="e.g."]', ask, 40); await pause(400);
      await tap('button:text-is("Ask")');
      await page.waitForSelector('text=Thinking…', { state: 'detached', timeout: 120000 });
      await pause(800); await scrollBy(700, 14); await pause(3500); ask = null;
      mark('ask-done');
    }
    if (await page.locator('button:has-text("Check what you learned"), button:has-text("Take the retake")').count()) return;
    await tap('button:text-is("Next")');
    await toTop();
  }
}

await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1170, maxHeight: 2532, everyNthFrame: 1 });

// 1. Home
mark('home');
await page.goto(SITE); await page.waitForSelector('text=No units added yet'); await pause(2500);

// 2. Add a unit
mark('add');
await tap('a[aria-label="Add a course"]');
await page.waitForSelector('input[placeholder^="e.g. Building"]'); await pause(700);
await type('input[placeholder^="e.g. Building"]', 'Computer Science', 45);
await type('input[placeholder^="e.g. Diploma"]', 'Year 2', 45); await pause(500);
await tap('button:has-text("Next")');
await page.waitForSelector('input[placeholder="e.g. Foundations"]'); await pause(600);
await type('input[placeholder="e.g. Foundations"]', 'Intro to Machine Learning', 45); await pause(400);
await page.setInputFiles('input[type=file]', PDF); await pause(1500);
mark('read');
await tap('button:has-text("Read my unit")');
// waiting screen: tap a fact card if one shows
await page.waitForSelector('text=/Writing your test questions|Reading your unit/', { timeout: 60000 }).catch(() => {});
await pause(1500);
const fact = page.locator('button:has-text("Tap if you already knew this")');
if (await fact.count()) { await pause(1500); await fact.first().tap().catch(() => {}); }
await page.waitForURL('**/unit/**', { timeout: 240000 });
mark('unit');
fs.writeFileSync('student.json', JSON.stringify(await page.evaluate(() => localStorage.getItem('studypal.student'))));
fs.writeFileSync('unit-url.txt', page.url());
await page.waitForSelector('button:has-text("Start the test")', { timeout: 240000 }); await pause(1500);
await scrollBy(600, 12); await pause(1800); await toTop(); await pause(800);

// 3. First test: topic 1 well, topics 2 and 3 vaguely
mark('test');
await tap('button:has-text("Start the test")');
for (let t = 0; t < 3; t++) {
  await page.waitForSelector('textarea, ol > li button', { timeout: 60000 }); await pause(1200);
  await answerAll(t, t === 0);
  await pause(500);
  await tap('button:has-text("Next topic"), button:has-text("Finish the test")');
  await page.waitForSelector('text=Marking your answers…', { state: 'detached', timeout: 120000 }).catch(() => {});
  await pause(900);
}
mark('results');
await page.waitForSelector('text=How would you like to learn?', { timeout: 120000 }); await toTop(); await pause(2500);
await scrollBy(500, 14); await pause(2200); await scrollBy(600, 14); await pause(1800);

// 4. Style
mark('style');
for (let i = 0; i < 4 && !(await page.locator('button:has-text("Start learning")').count()); i++) {
  const g = page.getByRole('button', { name: /^Gossip/ });
  await center(g); await pause(700);
  await g.tap({ force: true }); await pause(900);
}
await tap('button:has-text("Start learning")');
await page.waitForSelector('text=Your learning path'); await pause(800);
await page.locator('text=Your learning path').scrollIntoViewIfNeeded(); await pause(2500);

// 5–8. Lessons with checks, flowing topic to topic
let lessonNo = 0;
mark('lesson');
await page.locator('button:text-is("Learn")').first().tap();
for (;;) {
  await waitLesson();
  mark(`lesson-${lessonNo}`);
  await readLesson({ ask: lessonNo === 0 ? 'Why is logistic regression not used for regression?' : null, copy: true });
  mark(`check-${lessonNo}`);
  const title = await page.locator('h1').first().innerText().catch(() => '');
  await tap('button:has-text("Check what you learned")');
  await page.waitForSelector('text=Quick check'); await pause(900);
  const topic = /supervised/i.test(title) ? 1 : /train|overfit/i.test(title) ? 2 : 0;
  await answerAll(topic, true);
  await tap('button:has-text("Check my answers")');
  await page.waitForSelector('button:has-text("Next topic:"), button:has-text("Done — back")', { timeout: 120000 });
  await toTop(); await pause(2200); await scrollBy(900, 14); await pause(1500);
  lessonNo++;
  if (await page.locator('button:has-text("Next topic:")').count()) { await tap('button:has-text("Next topic:")'); continue; }
  await tap('button:has-text("Done — back")');
  break;
}

// 9. Final test: topics 1 and 2 well, topic 3 badly
mark('final');
await page.waitForSelector('button:has-text("Start the final test")', { timeout: 60000 });
await page.locator('button:has-text("Start the final test")').scrollIntoViewIfNeeded(); await pause(1800);
await tap('button:has-text("Start the final test")');
for (let t = 0; t < 3; t++) {
  await page.waitForSelector('textarea, ol > li button', { timeout: 60000 }); await pause(1000);
  await answerAll(t, t !== 2);
  await tap('button:has-text("Next topic"), button:has-text("Finish the test")');
  await page.waitForSelector('text=Marking your answers…', { state: 'detached', timeout: 120000 }).catch(() => {});
  await pause(900);
}

// 10. Before and after, then fix a weak topic and retake
mark('compare');
await page.waitForSelector('text=before and after', { timeout: 120000 }); await toTop(); await pause(4000);
await scrollBy(700, 16); await pause(3000);
if (await page.locator('button:has-text("Fix this topic")').count()) {
  mark('fix');
  await tap('button:has-text("Fix this topic")');
  await waitLesson();
  await readLesson({ fast: true });
  mark('retake');
  await tap('button:has-text("Take the retake")');
  await page.waitForSelector('text=/Retake ·/'); await pause(800);
  await answerAll(2, true);
  await tap('button:has-text("Check my answers")');
  await page.waitForSelector('button:has-text("See my results")', { timeout: 120000 });
  await toTop(); await pause(2000);
  await tap('button:has-text("See my results")');
  mark('compare-after-fix');
  await page.waitForSelector('text=before and after'); await toTop(); await pause(3500);
  await scrollBy(700, 16); await pause(2500); await toTop(); await pause(800);
}

// 11. Menu, profile, timer
mark('wrap');
await tap('button[aria-label="Courses"]'); await pause(2200); await tap('button[aria-label="Courses"]'); await pause(600);
await tap('a[aria-label="Your profile"]'); await page.waitForSelector('text=Your progress'); await pause(2800);
await scrollBy(500, 14); await pause(1500); await toTop(); await pause(600);
await tap('button[aria-label="Pomodoro focus timer"]'); await pause(1000);
await tap('button:has-text("Start focusing")'); await pause(3500);
mark('end');

await cdp.send('Page.stopScreencast');
await pause(500);
fs.writeFileSync('frames.json', JSON.stringify(frames));
fs.writeFileSync('marks.json', JSON.stringify(marks));
console.log('frames', frames.length, 'errors', errs);
await ctx.close(); await b.close();
