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

function expectedFillStates(value, units) {
  const step = 100 / units;
  return Array.from({ length: units }, (_, index) => {
    const fill = Math.max(0, Math.min(1, (value - index * step) / step));
    return fill === 1 ? 'full' : fill === 0 ? 'empty' : 'partial';
  });
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
      const vitals = [...hud.querySelectorAll('.game-vital')];
      const units = vitals.flatMap(vital => [...vital.querySelectorAll('.game-vital__unit')]);
      const objectives = document.querySelector('#objectives');
      const countdown = document.querySelector('#countdown');
      const toolbar = document.querySelector('#toolbar');
      const touch = document.querySelector('#touch');
      const visible = element => getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().width > 0;
      return {
        dimensions: [innerWidth, innerHeight],
        scrollWidth: document.documentElement.scrollWidth,
        vitalCount: vitals.length,
        unitCounts: vitals.map(vital => vital.querySelectorAll('.game-vital__unit').length),
        gridColumns: getComputedStyle(hud.querySelector('.game-vitals')).gridTemplateColumns.split(' ').length,
        values: vitals.map(vital => vital.getAttribute('aria-valuenow')),
        fillStates: vitals.map(vital => [...vital.querySelectorAll('.game-vital__unit')].map(unit => unit.dataset.state)),
        fillPixels: units.map(unit => Number(unit.querySelector('.game-vital__fill-clip').getAttribute('width'))),
        units: units.map(box),
        hud: box(hud),
        hudParts: ['.game-hud__campaign', '.game-vitals', '.game-hud__meta'].map(selector => box(hud.querySelector(selector))),
        objectives: box(objectives),
        countdown: box(countdown),
        toolbar: box(toolbar),
        touch: box(touch),
        objectivesVisible: visible(objectives),
        countdownVisible: visible(countdown),
        toolbarVisible: visible(toolbar),
        touchVisible: visible(touch),
        statGroups: vitals.map(box)
      };
    });
    assert.equal(prologue.scrollWidth, width, `Horizontal overflow at ${width}x${height}`);
    assert.equal(prologue.vitalCount, 4, `Missing vital groups at ${width}x${height}`);
    const compactLayout = width <= 1150 || (width > height && height <= 500);
    const expectedUnits = compactLayout ? 5 : 10;
    assert.deepEqual(prologue.unitCounts, Array(4).fill(expectedUnits), `Unexpected icon count at ${width}x${height}`);
    assert.deepEqual(prologue.values, ['55', '55', '55', '90'], `The HUD changed player values at ${width}x${height}`);
    assert.equal(prologue.gridColumns, mobileLayout ? 2 : 4, `Unexpected layout columns at ${width}x${height}`);
    assert.deepEqual(prologue.fillStates, [55, 55, 55, 90].map(value => expectedFillStates(value, expectedUnits)), `Incorrect icon fill at ${width}x${height}`);
    const iconSizes = prologue.units.map(({ width: w, height: h }) => [w, h]);
    const expectedSize = iconSizes[0][0];
    assert.ok(iconSizes.every(([w, h]) => Math.abs(w - h) < 0.1 && Math.abs(w - expectedSize) < 0.1), `Unequal icon boxes at ${width}x${height}`);
    assert.ok(expectedSize >= 12 && expectedSize <= 18, `Icon size ${expectedSize}px at ${width}x${height}`);
    assert.ok(prologue.fillPixels.every(pixels => Number.isInteger(pixels) && pixels >= 0 && pixels <= 16), `Pixel fill was not aligned to the source grid at ${width}x${height}`);
    assert.ok(prologue.statGroups.every(group => group.left >= 0 && group.right <= width), `Vital group outside viewport at ${width}x${height}`);
    for (let first = 0; first < prologue.statGroups.length; first += 1) {
      for (let second = first + 1; second < prologue.statGroups.length; second += 1) {
        assert.ok(!overlaps(prologue.statGroups[first], prologue.statGroups[second]), `Vital groups overlap at ${width}x${height}`);
      }
    }
    for (let first = 0; first < prologue.hudParts.length; first += 1) {
      for (let second = first + 1; second < prologue.hudParts.length; second += 1) {
        assert.ok(!overlaps(prologue.hudParts[first], prologue.hudParts[second]), `HUD sections overlap at ${width}x${height}`);
      }
    }
    assert.ok(prologue.objectivesVisible, `Prologue instructions hidden at ${width}x${height}`);
    assert.ok(prologue.countdownVisible, `Prologue countdown hidden at ${width}x${height}`);
    assert.ok(prologue.toolbarVisible, `Toolbar hidden at ${width}x${height}`);
    assert.ok(!overlaps(prologue.hud, prologue.toolbar), `HUD overlaps toolbar at ${width}x${height}`);
    if (prologue.touchVisible) {
      assert.ok(!overlaps(prologue.hud, prologue.touch), `HUD overlaps touch controls at ${width}x${height}`);
      assert.ok(!overlaps(prologue.objectives, prologue.touch), `Instructions overlap touch controls at ${width}x${height}`);
    }
    assert.ok(!overlaps(prologue.hud, prologue.objectives), `Objectives overlap HUD at ${width}x${height}`);
    assert.ok(!overlaps(prologue.objectives, prologue.countdown), `Instructions overlap countdown at ${width}x${height}`);
    const partialUnit = prologue.units[Math.floor(55 / (100 / expectedUnits))];
    assert.ok(Math.abs(partialUnit.width - partialUnit.height) < 0.1, `Partial icon is distorted at ${width}x${height}`);
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
      phase: document.querySelector('[data-hud-day]').textContent,
      health: document.querySelector('[data-vital="health"]').getAttribute('aria-valuenow'),
      energy: document.querySelector('[data-vital="energy"]').getAttribute('aria-valuenow'),
      healthFilled: [...document.querySelectorAll('[data-vital="health"] .game-vital__unit')].map(unit => unit.dataset.state)
    }));
    assert.equal(survival.phase, 'DIA 01', `Survival phase missing at ${width}x${height}`);
    assert.equal(Number(survival.health), 55, `The HUD changed actual health at ${width}x${height}`);
    assert.ok(Number(survival.energy) < 90 && Number(survival.energy) > 0, `Simulation energy did not advance at ${width}x${height}`);
    assert.ok(survival.healthFilled.includes('partial'), `Fractional health not rendered at ${width}x${height}`);
    await page.screenshot({ path: `${output}/${width}x${height}-survival.png` });

    if (width === 1280 && height === 720) {
      const damage = await page.evaluate(async () => {
        const { updateVitals, vitalUnitCount } = await import('./src/ui/hud.js');
        const root = document.querySelector('#hud');
        updateVitals(root, { health: 54.75, food: 55, water: 55, energy: 90 }, vitalUnitCount());
        const health = root.querySelector('[data-vital="health"]');
        return {
          value: health.getAttribute('aria-valuenow'),
          label: health.querySelector('[data-vital-number]').textContent,
          animations: health.getAnimations().length,
        };
      });
      assert.equal(damage.value, '54.75', 'The HUD must preserve unrounded simulation precision');
      assert.equal(damage.label, '54.8', 'The display may approximate without mutating the value');
      assert.ok(damage.animations > 0, 'Damage should briefly animate its health indicator');

      for (const viewport of [{ width: 390, height: 844, units: 5 }, { width: 1280, height: 720, units: 10 }]) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForFunction(
          expected => Number(document.querySelector('.game-vitals')?.dataset.unitCount) === expected,
          viewport.units,
        );
        const layout = await page.evaluate(() => ({
          groups: document.querySelectorAll('.game-vital').length,
          units: [...document.querySelectorAll('.game-vital')].map(group => group.querySelectorAll('.game-vital__unit').length),
          clipIds: [...document.querySelectorAll('.game-vital__icon clipPath')].map(clip => clip.id),
        }));
        assert.equal(layout.groups, 4, 'Orientation changes must not duplicate vital groups');
        assert.deepEqual(layout.units, Array(4).fill(viewport.units), 'Orientation changes must rebuild the correct unit count');
        assert.equal(new Set(layout.clipIds).size, layout.clipIds.length, 'Orientation changes must keep sprite clip IDs unique');
      }
    }

    results.push({ width, height, iconSize: expectedSize, status: 'passed' });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/report.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }, null, 2));
} finally {
  await browser.close();
}
