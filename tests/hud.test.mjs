import test from 'node:test';
import assert from 'node:assert/strict';
import { createVitalsMarkup, vitalFill, VITALS } from '../src/ui/hud.js';

test('HUD renders four matching Pixel Art meters with ten fixed-viewBox icons each',()=>{
  const markup=createVitalsMarkup();
  assert.equal(VITALS.length,4);
  assert.equal((markup.match(/class="vital" data-vital=/g)||[]).length,4);
  assert.equal((markup.match(/class="vital-unit is-empty"/g)||[]).length,40);
  assert.doesNotMatch(markup,/class="vital-unit (?:full|empty)"/);
  assert.equal((markup.match(/viewBox="0 0 16 16"/g)||[]).length,84);
});

test('meter fills preserve fractional values without rounding the simulation value',()=>{
  assert.deepEqual(Array.from({length:10},(_,index)=>vitalFill(55,index)),[
    ...Array(5).fill({state:'full',fill:100}),
    {state:'partial',fill:50},
    ...Array(4).fill({state:'empty',fill:0})
  ]);
  assert.deepEqual(vitalFill(89.25,8),{state:'partial',fill:92.5});
  assert.deepEqual(vitalFill(90,9),{state:'empty',fill:0});
  assert.deepEqual(vitalFill(90,8),{state:'full',fill:100});
});

test('meter fill clamps display-only values and rejects invalid icon positions',()=>{
  assert.deepEqual(vitalFill(-3,0),{state:'empty',fill:0});
  assert.deepEqual(vitalFill(110,9),{state:'full',fill:100});
  assert.throws(()=>vitalFill(Number.NaN,0),RangeError);
  assert.throws(()=>vitalFill(50,10),RangeError);
});
