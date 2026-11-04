import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/systems/simulation.js';
import {canBuild,playerCanReach} from '../src/world.js';
const live=()=>{const s=S.createGame(8);S.advance(s,30);return s;};
test('prólogo recusa tarefas antes de cobrar insumos ou verba',()=>{
  const s=S.createGame(8);S.add(s,'rice');S.add(s,'fuel');S.add(s,'raw',2);const before=JSON.stringify(s);
  for(const fn of [()=>S.cook(s,'rice'),()=>S.treat(s),()=>S.community(s,'work'),()=>S.salvage(s),()=>S.startTask(s,'sleep',50),()=>S.construct(s,'barrel',24,12)])assert.equal(fn().ok,false);
  assert.equal(JSON.stringify(s),before);
});
test('descartar respeita UID e não remove o lote mais antigo por engano',()=>{
  const s=live();S.add(s,'fruit',1,'inventory',3);S.add(s,'fruit',1,'inventory',9);const fresh=s.player.inventory.find(b=>b.item==='fruit'&&b.expiry===9);S.discard(s,fresh.uid);assert.equal(s.player.inventory.find(b=>b.item==='fruit').expiry,3);
});
test('armazenamento preserva deterioração mesmo antes da validade',()=>{
  const s=live();S.add(s,'fruit');const b=s.player.inventory.find(b=>b.item==='fruit');b.condition=20;S.transfer(s,b.uid);const stored=s.storage.find(b=>b.item==='fruit');assert.equal(stored.condition,20);S.transfer(s,stored.uid,false);assert.equal(s.player.inventory.find(b=>b.item==='fruit').condition,20);
});
test('escambo não lava a validade de alimento vencido',()=>{
  const s=live();S.add(s,'egg',6,'inventory',1);assert.equal(S.barter(s,'celia').ok,false);assert.equal(S.count(s,'egg'),6);
});
test('grade rejeita NaN, coordenadas fracionárias e segundo galinheiro',()=>{
  const s=live();assert.ok(canBuild(s,'bed',NaN,12));assert.ok(canBuild(s,'bed',21.3,12));s.builds.push({id:'coop',type:'coop',x:25,y:12});assert.ok(canBuild(s,'coop',20,10));
});
test('saves antigos com dois galinheiros não multiplicam produção e consumo das aves',()=>{
  const a=live(),b=live();for(const s of [a,b]){s.builds.push({id:'c1',type:'coop',x:25,y:12,feed:1,water:1});s.chickens.push({id:100,health:90,lay:0,age:240});}
  b.builds.push({id:'c2',type:'coop',x:20,y:10,feed:1,water:1});S.advance(a,60);S.advance(b,60);assert.deepEqual(a.chickens,b.chickens);assert.equal(b.builds.at(-1).feed,1);
});
test('save rejeita condição ausente e total de tarefa não numérico',()=>{
  const s=live();delete s.player.inventory[0].condition;assert.throws(()=>S.validateSave(s));const t=live();S.startTask(t,'sleep',20);t.task.total='20';assert.throws(()=>S.validateSave(t));
});
test('carregar normaliza sono para a tarefa e não concede recuperação infinita',()=>{
  const s=live();s.player.sleeping=true;assert.equal(S.validateSave(s).player.sleeping,false);
});
test('NPC atrás de parede ou fora de alcance não pode interagir',()=>{
  const s=live(),n=s.npcs[0];s.player.x=480-10;s.player.y=480;n.x=480+12;n.y=480;assert.equal(playerCanReach(s,{kind:'npc',id:n.id}),false);n.x=900;assert.equal(playerCanReach(s,{kind:'npc',id:n.id}),false);
});
test('variação de duração de quadros preserva tempo total e necessidades',()=>{
  const a=live(),b=live();for(let i=0;i<120;i++)S.advance(a,.5);for(let i=0;i<3600;i++)S.advance(b,1/60);assert.ok(Math.abs(a.activeTime-b.activeTime)<1e-6);assert.ok(Math.abs(a.player.food-b.player.food)<.2);
});
