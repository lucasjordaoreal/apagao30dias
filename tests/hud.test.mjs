import test from 'node:test';
import assert from 'node:assert/strict';
import { createHUDMarkup, createVitalsMarkup, vitalFill, vitalUnitCount, VITALS } from '../src/ui/hud.js';

test('HUD markup uses four original 16 by 16 pixel sprites with consistent colors', () => {
  const markup = createVitalsMarkup();
  assert.equal(VITALS.length, 4);
  assert.deepEqual(VITALS.map(({ key }) => key), ['health', 'hunger', 'thirst', 'energy']);
  assert.equal((markup.match(/class="game-vital" data-vital=/g) || []).length, 4);
  assert.equal((markup.match(/class="game-vital__unit" data-unit=/g) || []).length, 40);
  assert.equal((markup.match(/viewBox="0 0 16 16"/g) || []).length, 40);
  const clipIds = [...markup.matchAll(/<clipPath id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(clipIds.length, 40);
  assert.equal(new Set(clipIds).size, clipIds.length);
  assert.match(markup, /aria-valuemin="0" aria-valuemax="100"/);
  assert.doesNotMatch(markup, /class="(?:full|empty|half)"|hud-brand|\p{Extended_Pictographic}/u);
});

test('desktop and compact HUD layouts generate ten and five units without changing attributes', () => {
  assert.equal((createVitalsMarkup(10).match(/class="game-vital__unit"/g) || []).length, 40);
  assert.equal((createVitalsMarkup(5).match(/class="game-vital__unit"/g) || []).length, 20);
  assert.match(createHUDMarkup(5), /data-act="pause"/);
  assert.match(createHUDMarkup(5), /data-vital="health"/);
  assert.throws(() => createVitalsMarkup(6), RangeError);
});

test('responsive unit selection is consistent at desktop, tablet, portrait, and landscape sizes', () => {
  assert.equal(vitalUnitCount(800, 600), 5);
  assert.equal(vitalUnitCount(1280, 720), 10);
  assert.equal(vitalUnitCount(2560, 1440), 10);
  assert.equal(vitalUnitCount(320, 568), 5);
  assert.equal(vitalUnitCount(667, 375), 5);
  assert.equal(vitalUnitCount(844, 390), 5);
  assert.equal(vitalUnitCount(1280, 480), 5);
});

test('ten-unit fills preserve fractional progress and render 55 as five full plus one half', () => {
  assert.deepEqual(Array.from({ length: 10 }, (_, index) => vitalFill(55, index)), [
    ...Array(5).fill(1),
    0.5,
    ...Array(4).fill(0),
  ]);
  assert.equal(vitalFill(89.25, 8), 0.925);
  assert.equal(vitalFill(90, 9), 0);
  assert.equal(vitalFill(90, 8), 1);
});

test('five-unit fills represent each icon as twenty points without rounding the value', () => {
  assert.deepEqual(Array.from({ length: 5 }, (_, index) => vitalFill(55, index, 5)), [
    1,
    1,
    0.75,
    0,
    0,
  ]);
  assert.equal(vitalFill(90, 4, 5), 0.5);
});

test('fill display clamps out-of-range values and rejects invalid icon positions', () => {
  assert.equal(vitalFill(-3, 0), 0);
  assert.equal(vitalFill(110, 9), 1);
  assert.throws(() => vitalFill(Number.NaN, 0), RangeError);
  assert.throws(() => vitalFill(50, 10), RangeError);
  assert.throws(() => vitalFill(50, -1), RangeError);
  assert.throws(() => vitalFill(50, 0, 6), RangeError);
});
