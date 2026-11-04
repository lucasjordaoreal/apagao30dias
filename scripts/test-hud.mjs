import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const sizes = [
  [800, 600], [1280, 720], [1366, 768], [1920, 1080], [2560, 1440],
  [320, 568], [360, 640], [390, 844], [430, 932],
  [667, 375], [844, 390], [932, 430], [768, 1024], [1024, 768]
];
const output = 'test-results/visual/hud';
const base = process.env.TEST_URL || 'http://127.0.0.1:4181';
const browser = await chromium.launch({ executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const results = [];
const errors = [];
await mkdir(output, { recursive: true });

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

try {
  for (const [width, height] of sizes) {
    const mobileLayout = width <= 700;
    const touchDevice = mobileLayout || height <= 500;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touchDevice, isMobile: touchDevice, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`${width}x${height}: ${error.message}`));
    await page.goto(base);
    await page.evaluate(async () => {
      const { createGame } = await import('./src/systems/simulation.js');
      const { saveGame } = await import('./src/save/storage.js');
      const state = createGame(2026);
      state.player.health = 55;
      state.player.food = 55;
      state.player.water = 55;
      state.player.energy = 90;
      await saveGame(state, { replace: true });
    });
    await page.reload();
    await page.locator('[data-act="continue"]').click();
    await page.locator('#hud').waitFor({ state: 'visible' });
    await page.locator('#notifications').evaluate(element => element.replaceChildren());

    const prologue = await page.evaluate(() => {
      const box = element => {
        const { x, y, width, height, left, right, top, bottom } = element.getBoundingClientRect();
        return { x, y, width, height, left, right, top, bottom };
      };
      const hud = document.querySelector('#hud');
      const vitals = [...hud.querySelectorAll('.vital')];
      const units = vitals.flatMap(vital => [...vital.querySelectorAll('.vital-unit')]);
      return {
        dimensions: [innerWidth, innerHeight],
        scrollWidth: document.documentElement.scrollWidth,
        vitalCount: vitals.length,
        unitCounts: vitals.map(vital => vital.querySelectorAll('.vital-unit').length),
        gridColumns: getComputedStyle(hud.querySelector('.vitals')).gridTemplateColumns.split(' ').length,
        values: vitals.map(vital => vital.getAttribute('aria-valuenow')),
        fillStates: vitals.map(vital => [...vital.querySelectorAll('.vital-unit')].map(unit => unit.dataset.state)),
        units: units.map(box),
        symbols: vitals.map(vital => box(vital.querySelector('.vital-symbol'))),
        hud: box(hud),
        objectives: box(document.querySelector('#objectives')),
        countdown: box(document.querySelector('#countdown')),
        statGroups: vitals.map(box)
      };
    });
    assert.equal(prologue.scrollWidth, width, `Horizontal overflow at ${width}x${height}`);
    assert.equal(prologue.vitalCount, 4, `Missing vital groups at ${width}x${height}`);
    assert.deepEqual(prologue.unitCounts, [10, 10, 10, 10], `Unexpected icon count at ${width}x${height}`);
    assert.deepEqual(prologue.values, ['55', '55', '55', '90'], `The HUD changed player values at ${width}x${height}`);
    assert.equal(prologue.gridColumns, mobileLayout ? 2 : 4, `Unexpected layout columns at ${width}x${height}`);
    const expectedPartial = [...Array(5).fill('full'), 'partial', ...Array(4).fill('empty')];
    assert.deepEqual(prologue.fillStates, [expectedPartial, expectedPartial, expectedPartial, [...Array(9).fill('full'), 'empty']], `Incorrect icon fill at ${width}x${height}`);
    const iconSizes = prologue.units.map(({ width: w, height: h }) => [w, h]);
    const expectedSize = iconSizes[0][0];
    assert.ok(iconSizes.every(([w, h]) => Math.abs(w - h) < 0.1 && Math.abs(w - expectedSize) < 0.1), `Unequal icon boxes at ${width}x${height}`);
    assert.ok(expectedSize >= (mobileLayout ? 11 : 12) && expectedSize <= 16, `Icon size ${expectedSize}px at ${width}x${height}`);
    assert.ok(prologue.symbols.every(({ width: w, height: h }) => Math.abs(w - h) < 0.1), `Distorted identifier icon at ${width}x${height}`);
    assert.ok(prologue.statGroups.every(group => group.left >= 0 && group.right <= width), `Vital group outside viewport at ${width}x${height}`);
    assert.ok(!overlaps(prologue.hud, prologue.objectives), `Objectives overlap HUD at ${width}x${height}`);
    assert.ok(!overlaps(prologue.objectives, prologue.countdown), `Instructions overlap countdown at ${width}x${height}`);
    assert.equal(prologue.units[5].width, prologue.units[5].height, `Partial icon is distorted at ${width}x${height}`);
    await page.screenshot({ path: `${output}/${width}x${height}-prologue.png` });

    await page.evaluate(async () => {
      const { advance } = await import('./src/systems/simulation.js');
      const { loadGame, saveGame } = await import('./src/save/storage.js');
      const state = await loadGame();
      advance(state, 30);
      advance(state, 30);
      await saveGame(state, { replace: true });
    });
    await page.reload();
    await page.locator('[data-act="continue"]').click();
    await page.locator('#hud').waitFor({ state: 'visible' });
    await page.locator('#notifications').evaluate(element => element.replaceChildren());
    const survival = await page.evaluate(() => ({
      phase: document.querySelector('.clock-label').textContent,
      health: document.querySelector('[data-vital="health"]').getAttribute('aria-valuenow'),
      energy: document.querySelector('[data-vital="energy"]').getAttribute('aria-valuenow'),
      healthFilled: [...document.querySelectorAll('[data-vital="health"] .vital-unit')].map(unit => unit.dataset.state)
    }));
    assert.equal(survival.phase, 'DIA 01', `Survival phase missing at ${width}x${height}`);
    assert.equal(Number(survival.health), 55, `The HUD changed actual health at ${width}x${height}`);
    assert.ok(Number(survival.energy) < 90 && Number(survival.energy) > 0, `Simulation energy did not advance at ${width}x${height}`);
    assert.ok(survival.healthFilled.includes('partial'), `Fractional health not rendered at ${width}x${height}`);
    await page.screenshot({ path: `${output}/${width}x${height}-survival.png` });
    results.push({ width, height, iconSize: expectedSize, status: 'passed' });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/report.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }, null, 2));
} finally {
  await browser.close();
}
