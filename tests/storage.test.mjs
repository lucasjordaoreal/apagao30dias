import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance, count } from '../src/systems/simulation.js';
import { saveGame,loadGame,importSave } from '../src/save/storage.js';

test('fallback salva e carrega sem IndexedDB; importação valida antes de substituir',async()=>{
  const map=new Map();globalThis.localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const s=createGame(9);advance(s,30);advance(s,72.5);await saveGame(s);const loaded=await loadGame();assert.equal(loaded.dayTime,72.5);assert.equal(loaded.saveRevision,s.saveRevision);assert.ok(loaded.saveRevision>0);assert.equal(count(loaded,'water'),count(s,'water'));
  const invalid={size:10,text:async()=>'{}'};await assert.rejects(()=>importSave(invalid));assert.equal((await loadGame()).dayTime,72.5);
  await assert.rejects(()=>importSave({size:3000000,text:async()=>JSON.stringify(s)}));
  const imported=await importSave({size:1000,text:async()=>JSON.stringify(s)});assert.equal(imported.seed,9);
});
