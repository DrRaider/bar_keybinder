import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as wait } from 'node:timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'docs/screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const PORT = process.env.SCREENSHOT_PORT || '5174';
const URL = `http://localhost:${PORT}/`;

console.log('Starting preview server…');
// Build first.
await new Promise((res, rej) => {
  const p = spawn('pnpm', ['build'], { cwd: ROOT, stdio: 'inherit', env: process.env });
  p.on('exit', (c) => (c === 0 ? res() : rej(new Error('build failed: ' + c))));
});

const server = spawn('pnpm', ['preview', '--port', PORT, '--strictPort'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
});

server.stdout.on('data', (d) => process.stdout.write('[preview] ' + d));
server.stderr.on('data', (d) => process.stderr.write('[preview ERR] ' + d));

// Give it a moment to come up.
await wait(2500);

const browser = await chromium.launch();

async function newSkipWizardContext(theme, viewport) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  await ctx.addInitScript(() => {
    const seed = { state: { onboardingDismissed: true, version: 5 }, version: 5 };
    localStorage.setItem('bar-keymap-editor-v1', JSON.stringify(seed));
  });
  return ctx;
}

async function shoot(name, theme, viewport) {
  const ctx = await newSkipWizardContext(theme, viewport);
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('button[aria-label*="Q,"]', { timeout: 5000 });
  // Verify the wizard is not on top.
  await page.waitForSelector('div.fixed.inset-0.z-40', { state: 'detached', timeout: 5000 }).catch(() => undefined);
  await wait(400);
  const path = resolve(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  → ${path}`);
  await ctx.close();
}

async function shootCtrlLayer(name, theme, viewport) {
  const ctx = await newSkipWizardContext(theme, viewport);
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('button[aria-label*="Q,"]', { timeout: 5000 });
  // Toggle Shift + Ctrl together to verify combo highlighting.
  await page.click('button[aria-label="Toggle Shift layer"]');
  await page.click('button[aria-label="Toggle Ctrl layer"]');
  await page.click('button[aria-label*="Q,"]');
  await wait(400);
  const path = resolve(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  → ${path}`);
  await ctx.close();
}

async function shootIsoLayout(name, theme, viewport, layoutId) {
  const ctx = await newSkipWizardContext(theme, viewport);
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('button[aria-label*="Q,"]', { timeout: 5000 });
  // Switch layout via the form-factor select trigger.
  await page.click('#layout-form-factor');
  await page.click(`[role="option"]:has-text("${layoutId}")`);
  await wait(500);
  const path = resolve(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  → ${path}`);
  await ctx.close();
}

async function shootWizard(name, theme, viewport) {
  // Don't skip the wizard for this one.
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: theme });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('text=Welcome', { timeout: 5000 });
  await wait(400);
  const path = resolve(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  → ${path}`);
  await ctx.close();
}

async function shootGridMenu(name, theme, viewport) {
  const ctx = await newSkipWizardContext(theme, viewport);
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('button[aria-label*="Q,"]', { timeout: 5000 });
  await page.click('button:has-text("Grid menu")');
  await wait(1500); // give the BAR github fetch a moment
  const path = resolve(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  → ${path}`);
  await ctx.close();
}

try {
  await shootWizard('wizard-dark', 'dark', { width: 1600, height: 1000 });
  await shoot('overview-dark', 'dark', { width: 1600, height: 1000 });
  await shoot('overview-light', 'light', { width: 1600, height: 1000 });
  await shootCtrlLayer('ctrl-layer-dark', 'dark', { width: 1600, height: 1000 });
  await shootIsoLayout('iso-tkl-dark', 'dark', { width: 1800, height: 1000 }, 'ISO TKL');
  await shootGridMenu('gridmenu-dark', 'dark', { width: 1600, height: 1000 });
} finally {
  await browser.close();
  server.kill();
}
