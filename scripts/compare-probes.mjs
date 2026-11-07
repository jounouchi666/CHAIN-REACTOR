import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createProbe } from '../src/probes.js';
await mkdir('evidence/probes', { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1400, height: 950 }, recordVideo: { dir: 'evidence/probes/video', size: { width: 1400, height: 950 } } });
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:4191/probe.html');
const results = [];
for (const kind of ['ricochet', 'factory', 'reactor']) {
  const idle = createProbe(kind);
  const active = createProbe(kind);
  active.impulse(550, 500, 220, 1800);
  if (kind === 'reactor') active.ignite(550, 500, 75);
  let explosions = 0, impacts = 0;
  for (let i = 0; i < 480; i++) {
    idle.step(); active.step();
    explosions += active.events.filter(e => e.type === 'explosion').length;
    impacts += active.events.filter(e => e.type === 'impact').length;
  }
  await page.selectOption('#kind', kind);
  await page.waitForTimeout(500);
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + box.width * 550 / 1400, box.y + box.height * 500 / 800, { modifiers: kind === 'reactor' ? ['Shift'] : [] });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `evidence/probes/${kind}.png` });
  results.push({ kind, idleFractures: idle.joints.filter(j => j.broken).length, activeFractures: active.joints.filter(j => j.broken).length, explosions, impacts, screen: await page.locator('#stats').textContent() });
}
await context.close(); await browser.close();
await writeFile('evidence/probes/results.json', JSON.stringify({ results, errors }, null, 2));
console.log(JSON.stringify({ results, errors }, null, 2));
