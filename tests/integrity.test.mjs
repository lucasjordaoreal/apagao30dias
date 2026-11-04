import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/systems/simulation.js';
import { blocked,insideBuilding,playerCanReach,canBuild } from '../src/world.js';
const live=()=>{const s=S.createGame(99);S.advance(s,30);return s;};
test('recovery moves blocked player within same room, preserves source and is idempotent',()=>{
 const s=live();s.player.x=600;s.player.y=460;const original=JSON.stringify(s),room=insideBuilding(s.player.x,s.player.y).id,r=S.validateSave(s);
 assert.equal(JSON.stringify(s),original);assert.equal(blocked(r.player.x,r.player.y,r),false);assert.equal(insideBuilding(r.player.x,r.player.y).id,room);assert.deepEqual(S.validateSave(r),r);
});
test('deep malformed fields and cyclic input are rejected before runtime',()=>{
 const mutations=[s=>s.npcs[0].memory=[{}],s=>s.player.diet=[{}],s=>s.services.powerDistricts=[true,'no',true],s=>s.weather.kind='invalid',s=>s.weather.rain=4,s=>s.player.dir=7,s=>s.journal[0].type={},s=>s.builds.push({...s.builds[0],id:'other'}),s=>s.chickens=[{id:1,health:90,lay:0,age:240}],s=>s.extra=s,s=>{s.task={type:'treat',total:8,remaining:3,data:{item:'meal',qty:2}};}];
 for(const mutate of mutations){const s=live();mutate(s);assert.throws(()=>S.validateSave(s));}
});
test('bed and refrigerator block movement while bathroom tap remains reachable',()=>{
 const s=live();s.player.x=501;s.player.y=510;S.move(s,0,-1,false,3);assert.ok(s.player.y>=501);assert.equal(blocked(s.player.x,s.player.y,s),false);
 s.player.x=564;s.player.y=515;assert.equal(playerCanReach(s,{inside:'home',x:600,y:516,kind:'tap'}),true);
});
test('sale rejects condition deterioration without changing money or inventory',()=>{const s=live();S.add(s,'fruit',1,'inventory',10,20);const before=JSON.stringify(s);assert.equal(S.trade(s,'antonio','fruit',1,true).ok,false);assert.equal(JSON.stringify(s),before);});
test('sale then repurchase preserves expiry and condition across save/load',()=>{
 let s=live();s.player.cash=50000;S.add(s,'fruit',1,'inventory',3,75);assert.equal(S.trade(s,'antonio','fruit',1,true).ok,true);s=S.validateSave(s);assert.equal(S.trade(s,'antonio','fruit',1).ok,true);const b=s.player.inventory.find(b=>b.item==='fruit');assert.equal(b.expiry,3);assert.equal(b.condition,75);
});
test('vendor lot expiry and daily consumption keep aggregate inventory consistent',()=>{
 const s=live();S.add(s,'fruit',2,'inventory',2);S.trade(s,'antonio','fruit',2,true);const n=s.npcs[1],before=n.stock.fruit;s.dayTime=599;S.advance(s,1);assert.equal(n.stock.fruit,before-3);assert.equal(n.resaleLots.length,0);S.validateSave(s);
});
test('invalid resale quantities cannot create stock',()=>{const s=live();s.npcs[0].resaleLots=[{item:'rice',qty:9999,expiry:10,condition:100}];assert.throws(()=>S.validateSave(s));});
test('legacy extra coop is removable without deleting active birds',()=>{const s=live();s.builds.push({id:'first',type:'coop',x:25,y:12},{id:'extra',type:'coop',x:20,y:10});s.chickens.push({id:++s.serial,health:90,lay:0,age:240});assert.equal(S.buildAction(s,'extra','remove').ok,true);assert.equal(s.chickens.length,1);assert.equal(S.buildAction(s,'first','remove').ok,false);});
test('donations bound memory and preserve the donated lot',()=>{const s=live(),n=s.npcs.find(n=>n.id==='marina');n.memory=Array(8).fill('Old');S.add(s,'veg',2,'inventory',5,80);assert.equal(S.community(s,'donate','marina').ok,true);assert.equal(n.memory.length,8);assert.equal(n.resaleLots[0].expiry,5);assert.equal(n.resaleLots[0].condition,80);});

test('solid build remains reachable from outside its footprint without reaching through another build',()=>{
 const s=live();s.builds.push({id:'coop',type:'coop',x:25,y:12});s.player.x=612;s.player.y=337;
 assert.equal(blocked(s.player.x,s.player.y,s),false);assert.equal(playerCanReach(s,{kind:'build',id:'coop',x:612,y:300}),true);
 s.builds.push({id:'fence',type:'fence',x:25,y:13});assert.equal(playerCanReach(s,{kind:'build',id:'coop',x:612,y:300}),false);
});
test('coop cannot finish around the feet of the builder',()=>{const s=live();s.player.x=612;s.player.y=330;assert.ok(canBuild(s,'coop',25,12));});

test('prototype property names and false optional structures are not valid game data',()=>{
 for(const mutate of [s=>s.player.inventory[0].item='toString',s=>s.builds[0].type='constructor',s=>s.builds[0].crop=0,s=>s.task=false,s=>s.threat=[]]){const s=live();mutate(s);assert.throws(()=>S.validateSave(s));}
});

test('dialogue remembers transaction day rather than purchased quantity',()=>{const s=live();s.player.cash=50000;S.trade(s,'antonio','water',3);assert.match(S.dialogue(s,s.npcs[1]),/dia 1/);assert.doesNotMatch(S.dialogue(s,s.npcs[1]),/dia 3/);});
