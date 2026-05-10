import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as wait } from 'node:timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORT = 5174;
const URL = `http://localhost:${PORT}/`;

console.log('▸ Building…');
await new Promise((res, rej) => {
  const p = spawn('pnpm', ['build'], { cwd: ROOT, stdio: 'inherit', env: process.env });
  p.on('exit', (c) => (c === 0 ? res() : rej(new Error('build failed'))));
});

console.log('▸ Starting preview…');
const server = spawn('pnpm', ['preview', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
});
server.stdout.on('data', (d) => process.stdout.write('[preview] ' + d));
await wait(2500);

const browser = await chromium.launch();
const failures = [];

async function step(name, fn) {
  process.stdout.write(`  • ${name} … `);
  try {
    await fn();
    console.log('OK');
  } catch (e) {
    console.log('FAIL');
    console.log('    ' + (e instanceof Error ? e.message : String(e)));
    failures.push({ name, error: e });
  }
}

try {
  console.log('▸ Test: first-run onboarding wizard');
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => failures.push({ name: 'console error', error: e }));
    page.on('console', (msg) => {
      if (msg.type() === 'error') failures.push({ name: 'console.error', error: new Error(msg.text()) });
    });
    await page.goto(URL, { waitUntil: 'networkidle' });

    await step('wizard renders', async () => {
      await page.waitForSelector('text=BAR keymap editor', { timeout: 5000 });
    });

    await step('step 1: pick ANSI 60%', async () => {
      await page.click('text=ANSI 60%');
    });

    await step('next step button', async () => {
      await page.click('button:has-text("Next: BAR keymap")');
      await page.waitForSelector('text=Choose your starting keymap', { timeout: 3000 });
    });

    await step('step 2: fetch and apply suggested preset', async () => {
      await page.click('button:has-text("Fetch and apply")');
      // Wait for transition to step 3 (which says "You're ready").
      await page.waitForSelector('text=You’re ready', { timeout: 15000 });
    });

    await step('step 3: start editing dismisses wizard', async () => {
      await page.click('button:has-text("Start editing")');
      // Header should now be visible with the keyboard.
      await page.waitForSelector('button[aria-label*="Q,"]', { timeout: 5000 });
    });

    await ctx.close();
  }

  console.log('▸ Test: skip wizard + load preset via header dropdown');
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const seed = {
        state: { onboardingDismissed: true, version: 5 },
        version: 5,
      };
      localStorage.setItem('bar-keymap-editor-v1', JSON.stringify(seed));
    });
    page.on('pageerror', (e) => failures.push({ name: 'pageerror(skip)', error: e }));
    await page.goto(URL, { waitUntil: 'networkidle' });

    await step('main UI renders', async () => {
      await page.waitForSelector('button[aria-label*="Q,"]', { timeout: 5000 });
    });

    await step('"Load BAR for this keyboard" works', async () => {
      await page.click('button:has-text("Load BAR for this keyboard")');
      // Wait for the report message to appear.
      await page.waitForSelector('text=/bindings/', { timeout: 15000 });
    });

    await step('Other presets dropdown opens', async () => {
      await page.click('[aria-label="Other BAR presets"]');
      await page.waitForSelector('[role="option"]:has-text("BAR legacy")', { timeout: 5000 });
      await page.keyboard.press('Escape');
    });

    await step('layout selector lists ISO 75 and "Create custom"', async () => {
      await page.click('#layout-form-factor');
      await page.waitForSelector('[role="option"]:has-text("ISO 75%")', { timeout: 3000 });
      await page.waitForSelector('[role="option"]:has-text("Create custom layout")', { timeout: 3000 });
      await page.keyboard.press('Escape');
    });

    await step('custom layout dialog opens via dropdown', async () => {
      await page.click('#layout-form-factor');
      await page.click('[role="option"]:has-text("Create custom layout")');
      await page.waitForSelector('text=Custom keyboard layout', { timeout: 3000 });
      // Click the close (X) button of the dialog to actually dismiss it.
      await page.locator('[role="dialog"] button[aria-label="Close"]').first().click();
      await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 });
    });

    await step('click Q + bind Attack from palette', async () => {
      const q = await page.$('button[aria-label*="Q,"]');
      if (!q) throw new Error('Q key not found');
      await q.click();
      // Find the Attack pill in the palette by full name.
      const attack = await page.$('button[aria-label="Attack"]');
      if (!attack) throw new Error('Attack pill not found');
      await attack.click();
      // The selected-key info panel should now mention Attack.
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll('*')).some((n) => /Attack/.test(n.textContent ?? '')),
        { timeout: 3000 },
      );
    });

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

if (failures.length) {
  console.log(`\n✗ ${failures.length} failure(s):`);
  for (const f of failures) {
    console.log('  - ' + f.name + ': ' + (f.error instanceof Error ? f.error.message : f.error));
  }
  process.exit(1);
} else {
  console.log('\n✓ All checks passed.');
}
