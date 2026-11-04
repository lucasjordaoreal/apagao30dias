import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../src/systems/audio.js';
test('audio channels mute independently and release finished nodes',()=>{
 const sound=new Sound();const ramps=[];let oscillators=0,disconnected=0;
 const parameter={setValueAtTime(){},exponentialRampToValueAtTime(){}};
 sound.ctx={currentTime:0,destination:{},createOscillator(){oscillators++;return {frequency:parameter,connect(g){return g;},start(){},stop(){this.onended();},disconnect(){disconnected++;}};},createGain(){return {gain:{...parameter,linearRampToValueAtTime(v){ramps.push(v);}},connect(){},disconnect(){disconnected++;}};}};
 sound.ambience=0;sound.ambient(10000,true,true);assert.equal(oscillators,0);sound.click();assert.equal(oscillators,1);assert.equal(disconnected,2);assert.equal(ramps[0],.15*.25);
 sound.effects=0;sound.click();assert.equal(oscillators,1);sound.ambience=.5;sound.ambient(20000,true,true);assert.equal(oscillators,2);assert.equal(ramps[1],.012*.25*.5);assert.equal(disconnected,4);
});
