import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/systems/simulation.js';
import { ITEMS, TILE } from '../src/data.js';
import { findPath, blocked } from '../src/world.js';

// Controle interno de teste. O jogo distribuído não tem aceleração ou atalhos de recursos.
function campaign(seed,mode){
  const s=S.createGame(seed,mode);S.withdraw(s,150000);S.advance(s,30);s.house.locked=true;
  const buy=item=>{const shops=s.npcs.filter(n=>(n.stock[item]||0)>0).sort((a,b)=>S.price(s,a,item)-S.price(s,b,item));return shops.some(n=>S.trade(s,n.id,item).ok);};
  for(let second=0;second<18000&&s.phase==='survival';second++){
    if(s.player.water<55){
      let b=s.player.inventory.find(b=>b.item==='water');
      if(!b){if(s.services.water)S.fill(s,'tap');else buy('water');b=s.player.inventory.find(b=>b.item==='water');}
      if(b)S.consume(s,b.uid);
    }
    if(s.player.food<58){
      let b=s.player.inventory.find(b=>ITEMS[b.item].kcal&&!ITEMS[b.item].cook&&(!b.expiry||b.expiry>s.day));
      if(!b){buy('bread')||buy('canned')||buy('fruit');b=s.player.inventory.find(b=>ITEMS[b.item].kcal&&!ITEMS[b.item].cook&&(!b.expiry||b.expiry>s.day));}
      if(b)S.consume(s,b.uid);
      else if(!s.task){
        const food=S.count(s,'rice')?'rice':S.count(s,'beans')?'beans':buy('rice')?'rice':buy('beans')?'beans':null;
        if(!S.count(s,'fuel'))buy('fuel');if(!S.count(s,'water'))s.services.water?S.fill(s,'tap'):buy('water');
        if(food)S.cook(s,food);
      }
    }
    if(!s.task){
      if(s.player.energy<35)S.startTask(s,'sleep',150);
      else if(s.lastWorkDay!==s.day&&s.dayTime<200)S.community(s,'work');
    }
    S.advance(s,1);
    if(second%601===0)S.validateSave(JSON.parse(JSON.stringify(s)));
  }
  return s;
}
test('campanhas completas: comércio, trabalho e cozinha permitem vencer sem horta ou galinhas',()=>{
  for(const mode of ['normal','dificil','simulacao'])for(const seed of [42,2026,710]){
    const s=campaign(seed,mode);assert.equal(s.phase,'won',`Modo ${mode}, semente ${seed}, dia ${s.day}, saúde ${s.player.health}, espécie ${s.player.cash}`);
    assert.ok(s.player.health>0);assert.equal(s.stats.chickens,0);assert.equal(s.stats.harvests,0);assert.ok(Math.abs(s.activeTime-18030)<1e-5);assert.ok(s.npcs.every(n=>n.cash>=0));
  }
});
test('NPCs percorrem caminhos válidos entre casa e trabalho, sem atravessar paredes',()=>{
  const s=S.createGame(8);S.advance(s,30);const n=s.npcs.find(n=>n.id==='beatriz'),dest=n.work.map(v=>v*TILE);
  const path=findPath(s,[n.x,n.y],dest);assert.ok(path.length>2);assert.ok(path.every(([x,y])=>!blocked(x,y,s,true)));
  S.advance(s,110);assert.ok(Math.hypot(n.x-dest[0],n.y-dest[1])<30,`Beatriz: ${n.x}, ${n.y}`);
});
test('save rejeita tarefas adulteradas, objetos inválidos e identificadores duplicados',()=>{
  const s=S.createGame(1);S.advance(s,30);S.community(s,'work');
  for(const mutate of [v=>v.task.data.pay=999999,v=>v.npcs[0].color='red;"onclick="x',v=>v.npcs[0].work=[0,0],v=>v.player.inventory[1].uid=v.player.inventory[0].uid,v=>v.builds[0].health='alta']){
    const bad=structuredClone(s);mutate(bad);assert.throws(()=>S.validateSave(bad));
  }
});
