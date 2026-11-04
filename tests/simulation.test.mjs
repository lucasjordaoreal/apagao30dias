import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/systems/simulation.js';
import { blocked, canBuild } from '../src/world.js';
import { DAY, ITEMS, TILE } from '../src/data.js';
const fresh=(seed=42)=>S.createGame(seed);
const survival=()=>{const s=fresh();S.advance(s,30);return s;};
const assets=s=>s.player.cash+s.player.bank+s.house.safeCash+s.town.treasury+s.npcs.reduce((a,n)=>a+n.cash,0);

test('prólogo dura exatamente 30 s, aceita início sem comprar e preserva frações',()=>{
  const s=fresh();S.advance(s,29.999);assert.equal(s.phase,'prologue');assert.ok(s.prologue>0);S.advance(s,.002);assert.equal(s.phase,'survival');assert.ok(Math.abs(s.dayTime-.001)<1e-6);assert.equal(s.stats.trades,0);
});
test('saques e transações conservam dinheiro; saldo digital fica bloqueado',()=>{
  const s=fresh(),total=assets(s);assert.equal(S.withdraw(s,150000).ok,true);assert.equal(s.player.cash,150000);assert.equal(s.player.bank,0);assert.equal(S.withdraw(s,1).ok,false);
  const n=s.npcs.find(n=>n.id==='antonio'),before=n.stock.canned;assert.equal(S.trade(s,n.id,'canned',3).ok,true);assert.equal(n.stock.canned,before-3);assert.equal(S.count(s,'canned'),3);assert.equal(assets(s),total);
  assert.equal(S.trade(s,n.id,'canned',1,true).ok,true);assert.equal(S.count(s,'canned'),2);assert.equal(assets(s),total);
  S.advance(s,30);assert.equal(S.withdraw(s,100).ok,false);assert.equal(S.trade(s,n.id,'canned',-4).ok,false);
});
test('sem dinheiro, sem estoque ou sem capacidade, compra não altera estado',()=>{
  const s=fresh(),n=s.npcs.find(n=>n.id==='antonio'),before=structuredClone(n);assert.equal(S.trade(s,n.id,'canned').ok,false);assert.deepEqual(n,before);
  S.withdraw(s,150000);assert.equal(S.trade(s,n.id,'canned',9999).ok,false);assert.equal(S.trade(s,n.id,'water',30).ok,false);assert.equal(S.count(s,'water'),2);
});
test('venda exige caixa finito do NPC; escambo transfere as duas pontas',()=>{
  const s=fresh(),n=s.npcs.find(n=>n.id==='celia');n.cash=0;S.add(s,'egg',6);const before=s.player.cash;
  assert.equal(S.trade(s,n.id,'egg',1,true).ok,false);assert.equal(s.player.cash,before);const rice=n.stock.rice;
  assert.equal(S.barter(s,n.id).ok,true);assert.equal(S.count(s,'egg'),0);assert.equal(S.count(s,'rice'),10);assert.equal(n.stock.rice,rice-10);assert.equal(n.stock.egg,6);assert.equal(S.barter(s,n.id).ok,false);
});
test('consumo é finito, fome e sede progridem e água insegura não muda de classe',()=>{
  const s=survival();S.advance(s,100);assert.ok(s.player.food<90);assert.ok(s.player.water<90);
  const b=s.player.inventory.find(b=>b.item==='water'),uid=b.uid,before=S.count(s,'water');assert.equal(S.consume(s,uid).ok,true);assert.equal(S.count(s,'water'),before-1);
  const p=s.player.water;S.add(s,'chemical');const chem=s.player.inventory.find(b=>b.item==='chemical');assert.equal(S.consume(s,chem.uid).ok,false);assert.equal(s.player.water,p);
  S.add(s,'raw');const raw=s.player.inventory.find(b=>b.item==='raw');S.consume(s,raw.uid);assert.ok(s.player.sick>0);assert.equal(S.count(s,'chemical'),1);
});
test('tratamento gasta insumos e tempo; não trata água química',()=>{
  const s=survival();S.add(s,'raw',2);S.add(s,'fuel');const water=S.count(s,'water');assert.equal(S.treat(s).ok,true);assert.equal(S.count(s,'raw'),0);assert.equal(S.count(s,'water'),water);S.advance(s,7);assert.equal(S.count(s,'water'),water);S.advance(s,1);assert.equal(S.count(s,'water'),water+2);assert.equal(S.count(s,'fuel'),0);
  S.add(s,'chemical',2);S.add(s,'fuel');assert.equal(S.treat(s).ok,false);
});
test('cozinha consome alimento, água e combustível, e entrega refeição após o trabalho',()=>{
  const s=survival();S.add(s,'rice');S.add(s,'fuel');const uid=s.player.inventory.find(b=>b.item==='rice').uid;
  assert.equal(S.consume(s,uid).ok,false);assert.equal(S.cook(s,'rice').ok,true);assert.equal(S.count(s,'rice'),0);assert.equal(S.count(s,'meal'),0);S.advance(s,12);assert.equal(S.count(s,'meal'),1);assert.equal(S.cook(s,'rice').ok,false);
});
test('dia possui 600 s ativos, pausa congela tudo e sono não salta tempo',()=>{
  const s=survival();s.paused=true;S.advance(s,10000);assert.equal(s.dayTime,0);s.paused=false;S.startTask(s,'sleep',50);S.advance(s,50);assert.equal(s.dayTime,50);assert.equal(s.task,null);S.advance(s,549.9);assert.equal(s.day,1);S.advance(s,.1);assert.equal(s.day,2);assert.equal(s.dayTime,0);
});
test('perda de necessidades causa morte progressiva e encerra o relógio',()=>{
  const s=survival();s.player.water=0;s.player.food=0;s.player.health=1;S.advance(s,20);assert.equal(s.phase,'dead');assert.equal(s.deathCause,'Desidratação');const t=s.activeTime;S.advance(s,600);assert.equal(s.activeTime,t);
});
test('vitória ocorre somente depois de 30 dias completos',()=>{
  const s=survival();s.day=30;s.dayTime=599;s.player.food=80;s.player.water=80;S.advance(s,.999);assert.equal(s.phase,'survival');S.advance(s,.001);assert.equal(s.phase,'won');assert.equal(s.day,30);assert.equal(s.ending,'Sobrevivente solitário');
});
test('canteiros respeitam desenvolvimento, umidade e custo da colheita',()=>{
  const s=survival();S.add(s,'seed');const b=s.builds[0];assert.equal(S.garden(s,b.id,'plant','radish').ok,true);S.advance(s,50);assert.ok(b.crop.age<1);assert.equal(S.garden(s,b.id,'harvest').ok,false);
  b.crop.age=30;const before=S.count(s,'veg');assert.equal(S.garden(s,b.id,'harvest').ok,true);assert.ok(S.count(s,'veg')>before);assert.equal(b.crop,null);assert.equal(S.garden(s,b.id,'harvest').ok,false);
  const long=s.builds[1];long.crop={kind:'cassava',age:30};assert.equal(S.garden(s,long.id,'harvest').ok,false);
});
test('galinhas exigem abrigo, pagamento, ração e água; ovos não são instantâneos',()=>{
  const s=survival();S.withdraw(s,150000);s.player.cash=10000;assert.equal(S.livestock(s,'buy').ok,false);
  s.builds.push({id:'coop',type:'coop',x:25,y:12});assert.equal(S.livestock(s,'buy').ok,true);assert.equal(s.player.cash,1500);S.add(s,'feed');S.livestock(s,'feed');S.livestock(s,'water');
  S.advance(s,30);assert.equal(s.stats.eggs,0);const coop=s.builds.at(-1);assert.ok(coop.feed<1);assert.ok(coop.water<1);
  s.chickens[0].lay=.999;s.player.water=100;s.player.food=100;S.advance(s,1);assert.equal(s.stats.eggs,1);assert.equal(S.livestock(s,'eggs').ok,true);assert.equal(S.count(s,'egg'),1);assert.equal(S.livestock(s,'eggs').ok,false);
  const health=s.chickens[0].health;coop.feed=0;coop.water=0;S.advance(s,30);assert.ok(s.chickens[0].health<health);
});
test('chuva é necessária para captar água; reservatório tem limite e saída não potável',()=>{
  const s=survival(),b={id:'barrel',type:'barrel',x:25,y:12,liters:0,clean:true};s.builds.push(b);S.advance(s,20);assert.equal(b.liters,0);s.weather.rain=1;S.advance(s,20);assert.ok(b.liters>0);b.liters=60;S.advance(s,1);assert.equal(b.liters,60);const before=S.count(s,'raw');assert.equal(S.buildAction(s,b.id,'draw').ok,true);assert.equal(S.count(s,'raw'),before+1);
});
test('construção consome materiais, bloqueia sobreposição e não surge antes de terminar',()=>{
  const s=survival();s.player.x=24*TILE;s.player.y=14*TILE;S.add(s,'wood',5);S.add(s,'metal',4);const before=s.builds.length;
  assert.equal(canBuild(s,'barrel',21,15)!==null,true);assert.equal(S.construct(s,'barrel',24,12).ok,true);assert.equal(S.count(s,'wood'),0);assert.equal(s.builds.length,before);S.advance(s,12);assert.equal(s.builds.length,before+1);assert.equal(S.construct(s,'barrel',24,12).ok,false);
});
test('guardar e retirar preserva quantidade, validade e cédulas; não duplica itens',()=>{
  const s=fresh(),b=s.player.inventory.find(b=>b.item==='bread'),total=S.count(s,'bread')+S.count(s,'bread','storage');const expiry=b.expiry;
  assert.equal(S.transfer(s,b.uid,true,true).ok,true);assert.equal(S.transfer(s,b.uid,true,true).ok,false);const stored=s.storage.find(v=>v.item==='bread');assert.equal(stored.expiry,expiry);S.transfer(s,stored.uid,false,true);assert.equal(S.count(s,'bread')+S.count(s,'bread','storage'),total);
  S.withdraw(s,150000);S.bankHome(s);assert.equal(s.player.cash,0);assert.equal(s.house.safeCash,150000);S.bankHome(s,false);assert.equal(s.player.cash,150000);assert.equal(s.house.safeCash,0);
});
test('trabalho usa caixa comunitário finito e só paga após completar a atividade',()=>{
  const s=survival(),total=assets(s);assert.equal(S.community(s,'work').ok,true);assert.equal(s.player.cash,0);S.advance(s,44);assert.equal(s.player.cash,0);S.advance(s,1);assert.equal(s.player.cash,6500);assert.equal(assets(s),total);assert.equal(S.community(s,'work').ok,false);
});
test('mesma semente e ações reproduzem clima, acontecimentos e NPCs',()=>{
  const a=survival(),b=survival();S.advance(a,400);S.advance(b,400);assert.deepEqual(a,b);const other=fresh(123);S.advance(other,430);assert.notDeepEqual(a.rng,other.rng);
});
test('save serializado preserva simulação; formato corrompido é rejeitado',()=>{
  const s=survival();S.advance(s,87.5);const copy=S.validateSave(JSON.parse(JSON.stringify(s)));assert.equal(copy.dayTime,s.dayTime);assert.deepEqual(copy.player.inventory,s.player.inventory);assert.equal(copy.rng,s.rng);
  S.advance(s,20);S.advance(copy,20);assert.equal(copy.player.health,s.player.health);assert.deepEqual(copy.npcs,s.npcs);
  for(const mutate of [v=>v.version=99,v=>v.player.cash=-1,v=>v.day=31,v=>v.player.inventory[0].item='hack',v=>v.npcs[0].stock.water=-5,v=>v.player.health=NaN,v=>delete v.storage,v=>v.dayTime=600]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>S.validateSave(bad));}
});
test('colisões de paredes e porta trancada respeitam o espaço',()=>{
  const s=survival();assert.equal(blocked(20*TILE,20*TILE,s),true);assert.equal(blocked(23.5*TILE,24*TILE,s),false);s.house.locked=true;assert.equal(blocked(23.5*TILE,24*TILE,s),true);assert.equal(blocked(23.5*TILE,23*TILE,s),false);
});
test('visita noturna percorre a rua e desiste de porta trancada sem furtar',()=>{
  const s=survival();s.dayTime=400;s.house.locked=true;s.eventAt=599;s.threat={x:28*TILE,y:27*TILE,state:'aproximando',wait:0,noticed:false};const before=structuredClone(s.storage);S.advance(s,10);assert.notEqual(s.threat,null);S.advance(s,30);assert.equal(s.threat,null);assert.deepEqual(s.storage,before);
});
