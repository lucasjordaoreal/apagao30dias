import { DAY, DAYS, MODES, ITEMS, NPCS, CROPS, RECIPES, ARCS, NARRATIVE, TILE, BUILDINGS } from '../data.js';
import { blocked, canBuild, insideBuilding, findPath, restorePosition } from '../world.js';
export { playerCanReach } from '../world.js';

export const SAVE_VERSION=1;
const clamp=(v,a=0,b=100)=>Math.min(b,Math.max(a,v));
export function random(s){let t=s.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);s.rng=s.rng>>>0;return((t^t>>>14)>>>0)/4294967296;}
export function log(s,text,type='info'){s.journal.unshift({day:s.day,time:Math.floor(s.dayTime),text,type});s.journal=s.journal.slice(0,120);s.notices.push({text,type,id:++s.serial});s.notices=s.notices.slice(-5);}
export function createGame(seed=Date.now()>>>0,mode='normal'){
  const s={version:SAVE_VERSION,seed:seed>>>0,rng:seed>>>0,mode:Object.hasOwn(MODES,mode)?mode:'normal',serial:0,saveRevision:0,phase:'prologue',prologue:30,day:1,dayTime:0,activeTime:0,simulationRemainder:0,paused:false,
    player:{x:23.5*TILE,y:24.7*TILE,dir:2,moving:false,running:false,health:100,food:100,water:100,energy:90,stress:10,exposure:0,sick:0,wound:0,cash:0,bank:150000,inventory:[],diet:[],lantern:false,battery:150,sleeping:false,weapon:'none',attackCooldown:0},
    storage:[],house:{locked:false,reinforced:0,watch:0,safeCash:0},weather:{kind:'sol',temp:27,rain:0},services:{power:true,water:true,powerDistricts:[true,true,true]},
    town:{trust:35,supply:100,security:65,treasury:500000,fair:false,population:20000,helped:0,economy:35},
    social:{violence:0,criminality:0,fear:0},
    blackMarket:{stock:{baton:1,knife:1,firearm:1,ammo:4},sales:0,scamCount:0,visited:false},
    builds:[{id:'b1',type:'bed',x:21,y:15,crop:null,moisture:55,fertility:70,weeds:0,health:100},{id:'b2',type:'bed',x:23,y:15,crop:{kind:'lettuce',age:45},moisture:65,fertility:75,weeds:0,health:100}],
    chickens:[],npcs:[],journal:[],notices:[],task:null,threat:null,eventAt:130,lastWorkDay:0,lastSalvageDay:0,lastForestDay:0,lastDonationDay:0,lastPatrolDay:0,scamDay:0,
    stats:{food:0,water:0,trades:0,helped:0,eggs:0,harvests:0,events:0,chickens:0,distance:0,spent:0,earned:0},deathCause:'',ending:''};
  s.npcs=NPCS.map(n=>{const h=BUILDINGS.find(b=>b.id===n.home);return {...structuredClone(n),cash:n.cash*100,stock:Object.fromEntries(Object.entries(n.stock).map(([k,v])=>[k,Math.floor(v*MODES[s.mode].stock)])),x:(h.x+h.w/2)*TILE,y:(h.y+h.h+.7)*TILE,trust:35,state:'em casa',memory:[],needLevel:0,emotion:'apreensivo',combat:{alive:true,injury:0,fear:0,aggression:n.personality==='oportunista'?.72:n.personality==='prático'?.25:.05,armed:false,state:'calmo',hostileUntil:0,nextAttackAt:0,fleeUntil:0}};});
  add(s,'water',4,'storage');add(s,'canned',3,'storage');add(s,'rice',5,'storage');add(s,'beans',4,'storage');add(s,'fuel',5,'storage');add(s,'wood',12,'storage');add(s,'metal',5,'storage');add(s,'seed',3,'storage');add(s,'bread',2);add(s,'water',2);
  log(s,'06:00. Aviso urgente no celular: a conexão mundial será interrompida. Você tem 30 segundos. Vá ao caixa e ao mercado.');
  return s;
}
export const count=(s,item,where='inventory')=>(where==='storage'?s.storage:s.player.inventory).filter(b=>b.item===item).reduce((a,b)=>a+b.qty,0);
export const load=(s,field='weight')=>s.player.inventory.reduce((v,b)=>v+ITEMS[b.item][field]*b.qty,0);
export const capacity=(s,item,qty=1)=>load(s)+ITEMS[item].weight*qty<=22&&load(s,'volume')+ITEMS[item].volume*qty<=30;
export function add(s,item,qty=1,where='inventory',expiry=null,condition=100){
  if(!Object.hasOwn(ITEMS,item)||!Number.isInteger(qty)||qty<=0) return false;
  const target=where==='storage'?s.storage:s.player.inventory;
  const exp=expiry??(ITEMS[item].shelf?s.day+ITEMS[item].shelf:null);
  const b=target.find(b=>b.item===item&&b.expiry===exp&&b.condition===condition);
  if(b)b.qty+=qty;else target.push({uid:++s.serial,item,qty,expiry:exp,condition});return true;
}
export function take(s,item,qty=1,where='inventory'){
  if(!Number.isInteger(qty)||qty<=0||count(s,item,where)<qty)return false;
  const target=where==='storage'?s.storage:s.player.inventory;
  const batches=target.filter(b=>b.item===item).sort((a,b)=>(a.expiry??1e9)-(b.expiry??1e9));
  for(const b of batches){const n=Math.min(b.qty,qty);b.qty-=n;qty-=n;if(!qty)break;}
  if(where==='storage')s.storage=target.filter(b=>b.qty>0);else s.player.inventory=target.filter(b=>b.qty>0);
  if(['baton','knife','firearm'].includes(item)&&!count(s,item)&&s.player.weapon===item)s.player.weapon='none';
  return true;
}
export const hour=s=>s.phase==='prologue'?6:(6+s.dayTime/DAY*24)%24;
export const isNight=s=>hour(s)>=20.4||hour(s)<6;
export const arc=s=>ARCS[Math.min(5,Math.floor((s.day-1)/5))];
export function price(s,n,item,selling=false){
  const base=ITEMS[item].price;
  const scarce=1+Math.max(0,40-(n.stock[item]||0))/100+Math.max(0,70-s.town.supply)/200;
  const relation=1-(n.trust-35)/500;
  const margin=n.personality==='oportunista'?1.45:1;
  const crimeTax=1+(s.social?.criminality||0)/100;
  return Math.max(1,Math.round(base*100*scarce*relation*margin*crimeTax*(selling?.52:1)));
}
export function withdraw(s,amount){
  if(s.phase!=='prologue')return fail('O caixa está sem conexão. O saldo digital permanece inacessível.');
  if(!Number.isInteger(amount)||amount<=0||amount>s.player.bank)return fail('Saldo insuficiente.');
  s.player.bank-=amount;s.player.cash+=amount;log(s,`Saque de ${(amount/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em espécie.`);return ok();
}
const ok=(message='Concluído.')=>({ok:true,message});const fail=message=>({ok:false,message});
// Resold batches keep their original condition and expiry through every transfer.
function vendorReceive(n,batches){
  n.resaleLots??=[];
  for(const b of batches){n.stock[b.item]=(n.stock[b.item]||0)+b.qty;
    const old=n.resaleLots.find(v=>v.item===b.item&&v.expiry===b.expiry&&v.condition===b.condition);
    if(old)old.qty+=b.qty;else n.resaleLots.push({item:b.item,qty:b.qty,expiry:b.expiry,condition:b.condition});
  }
}
function combatStep(s){
  for(const n of s.npcs){
    if(n.combat?.alive===false||n.combat.hostileUntil<=s.activeTime||n.combat.nextAttackAt>s.activeTime)continue;
    const distance=Math.hypot(n.x-s.player.x,n.y-s.player.y),range=n.combat.armed?105:38;
    if(distance>range||!sameRoom(n,s.player))continue;
    const damage=n.combat.armed?36:9;
    s.player.health=clamp(s.player.health-damage);s.player.wound=clamp(s.player.wound+(n.combat.armed?24:7));s.player.stress=clamp(s.player.stress+9);
    n.combat.nextAttackAt=s.activeTime+(n.combat.armed?3:2.5);
    log(s,n.combat.armed?'A pessoa armada atacou. Seu ferimento exige cuidado imediato.':'A pessoa reagiu e você se feriu. Afaste-se ou interrompa o conflito.','danger');
  }
}
function vendorTake(n,item,qty){
  const result=[];n.stock[item]-=qty;
  for(const b of (n.resaleLots||[]).filter(b=>b.item===item).sort((a,b)=>(a.expiry??1e9)-(b.expiry??1e9))){
    const used=Math.min(b.qty,qty);if(!used)continue;result.push({...b,qty:used});b.qty-=used;qty-=used;
  }
  if(n.resaleLots)n.resaleLots=n.resaleLots.filter(b=>b.qty>0);
  if(qty)result.push({item,qty,expiry:null,condition:100});return result;
}
function giveToVendor(s,n,item,qty){
  const result=[];let left=qty;
  for(const b of s.player.inventory.filter(b=>b.item===item).sort((a,b)=>(a.expiry??1e9)-(b.expiry??1e9))){const used=Math.min(b.qty,left);if(used)result.push({...b,qty:used});left-=used;}
  take(s,item,qty);vendorReceive(n,result);
}
function receiveFromVendor(s,n,item,qty){for(const b of vendorTake(n,item,qty))add(s,item,b.qty,'inventory',b.expiry,b.condition);}
const unfitVendor=(s,n,item)=>(n.resaleLots||[]).some(b=>b.item===item&&(b.condition<40||b.expiry!==null&&b.expiry<=s.day));
export function trade(s,npcId,item,qty=1,sell=false){
  const n=s.npcs.find(n=>n.id===npcId);if(!n||!Object.hasOwn(ITEMS,item)||!Number.isInteger(qty)||qty<1)return fail('Negociação inválida.');
  if(n.combat?.alive===false)return fail('Essa pessoa não pode mais negociar.');
  if(n.trust<8)return fail('A relação foi rompida. Essa pessoa não negocia mais com você.');
  const amount=price(s,n,item,sell)*qty;
  if(sell){
    if(count(s,item)<qty)return fail('Você não tem essa quantidade.');
    if(!ITEMS[item].price||item==='raw'||item==='chemical')return fail('O comerciante não aceita água sem origem segura.');
    if(s.player.inventory.some(b=>b.item===item&&((b.expiry!==null&&b.expiry<=s.day)||b.condition<40)))return fail('Alimento vencido não pode ser vendido.');
    if(n.cash<amount)return fail('O comerciante não tem dinheiro suficiente em caixa.');
    giveToVendor(s,n,item,qty);n.cash-=amount;s.player.cash+=amount;s.stats.earned+=amount;
  }else{
    if(unfitVendor(s,n,item))return fail('Lote deteriorado indisponivel para compra.');
    if((n.stock[item]||0)<qty)return fail('Estoque insuficiente.');
    if(s.player.cash<amount)return fail('Dinheiro em espécie insuficiente.');
    if(!capacity(s,item,qty))return fail('Mochila cheia: limite de 22 kg ou 30 L. Guarde recursos em casa.');
    receiveFromVendor(s,n,item,qty);n.cash+=amount;s.player.cash-=amount;s.stats.spent+=amount;
  }
  s.stats.trades++;n.trust=clamp(n.trust+.4);n.memory.push(`${sell?'Compra':'Venda'} de ${qty} ${ITEMS[item].name}, dia ${s.day}`);n.memory=n.memory.slice(-8);
  return ok(`${sell?'Vendido':'Comprado'}: ${qty} × ${ITEMS[item].name}.`);
}
export function barter(s,npcId){
  const n=s.npcs.find(n=>n.id===npcId);if(!n)return fail('Morador não encontrado.');
  if(n.combat?.alive===false||n.trust<8)return fail('Essa pessoa não pode ou não quer negociar com você.');
  const offer=n.id==='celia'?{give:'egg',g:6,get:'rice',q:10}:{give:n.need,g:2,get:Object.keys(n.stock).find(k=>k!==n.need&&n.stock[k]>=2),q:2};
  if(!offer.get||count(s,offer.give)<offer.g||(n.stock[offer.get]||0)<offer.q)return fail('Faltam itens para esta troca.');
  if(s.player.inventory.some(b=>b.item===offer.give&&(b.condition<40||(b.expiry!==null&&b.expiry<=s.day))))return fail('Alimento deteriorado não pode ser trocado.');
  if(load(s)-ITEMS[offer.give].weight*offer.g+ITEMS[offer.get].weight*offer.q>22||load(s,'volume')-ITEMS[offer.give].volume*offer.g+ITEMS[offer.get].volume*offer.q>30)return fail('Sem espaço para receber os itens.');
  if(unfitVendor(s,n,offer.get))return fail('Lote deteriorado indisponivel para troca.');
  giveToVendor(s,n,offer.give,offer.g);receiveFromVendor(s,n,offer.get,offer.q);n.trust=clamp(n.trust+3);s.town.trust=clamp(s.town.trust+.5);s.stats.trades++;return ok('Troca concluída, sem dinheiro.');
}
export function consume(s,uid){
  const b=s.player.inventory.find(b=>b.uid===uid);if(!b)return fail('Item indisponível.');const d=ITEMS[b.item],p=s.player;
  if(d.cook)return fail('Este alimento precisa ser preparado no fogão.');
  if(!d.kcal&&!d.drink&&b.item!=='meds'&&b.item!=='battery')return fail('Este item tem uso contextual no mundo.');
  if(b.item==='chemical')return fail('Origem química suspeita. Não consuma; nem a fervura elimina este risco.');
  if(d.kcal){p.food=clamp(p.food+d.kcal/22);s.stats.food++;p.diet.push(b.item);p.diet=p.diet.slice(-12);if(b.item==='fruit')p.water=clamp(p.water+3);if((b.expiry!==null&&b.expiry<=s.day)||b.condition<40){p.sick=clamp(p.sick+35);log(s,'Alimento deteriorado: mal-estar e perda de hidratação. Procure cuidados.','danger');}}
  if(d.drink){p.water=clamp(p.water+d.drink);s.stats.water++;if(b.item==='raw'){p.sick=clamp(p.sick+25);log(s,'Você bebeu água sem tratamento. Risco de infecção gastrointestinal.','danger');}}
  if(b.item==='meds'){p.wound=Math.max(0,p.wound-35);p.sick=Math.max(0,p.sick-15);p.health=clamp(p.health+8);}
  if(b.item==='battery')p.battery=Math.min(600,p.battery+150);
  b.qty--;p.inventory=p.inventory.filter(b=>b.qty>0);return ok(`${d.name}: utilizado.`);
}
export function transfer(s,uid,toStorage=true,all=false){
  const from=toStorage?s.player.inventory:s.storage,b=from.find(b=>b.uid===uid);if(!b)return fail('Item ausente.');
  const qty=all?b.qty:1;if(!toStorage&&!capacity(s,b.item,qty))return fail('Sem espaço na mochila.');
  add(s,b.item,qty,toStorage?'storage':'inventory',b.expiry,b.condition);b.qty-=qty;
  if(toStorage)s.player.inventory=from.filter(b=>b.qty>0);else s.storage=from.filter(b=>b.qty>0);
  if(toStorage&&['baton','knife','firearm'].includes(b.item)&&!count(s,b.item)&&s.player.weapon===b.item)s.player.weapon='none';
  return ok();
}
export function discard(s,uid,where='inventory'){
  const list=where==='storage'?s.storage:s.player.inventory,b=list.find(v=>v.uid===uid);
  if(!b)return fail('Lote não encontrado.');b.qty--;
  if(where==='storage')s.storage=list.filter(v=>v.qty>0);else s.player.inventory=list.filter(v=>v.qty>0);
  if(where!=='storage'&&['baton','knife','firearm'].includes(b.item)&&!count(s,b.item)&&s.player.weapon===b.item)s.player.weapon='none';
  return ok('Uma unidade do lote selecionado foi descartada.');
}
export function startTask(s,type,duration,data={}){
  if(s.phase!=='survival')return fail('Atividades domésticas começam após o prólogo.');
  if(!Number.isFinite(duration)||duration<=0||duration>300)return fail('Duração inválida.');
  if(s.task)return fail('Conclua ou cancele a tarefa atual.');
  s.task={type,remaining:duration,total:duration,data};s.player.sleeping=type==='sleep';return ok('Atividade iniciada. O tempo continua passando.');
}
export function cancelTask(s){s.task=null;s.player.sleeping=false;return ok('Atividade cancelada. Materiais já usados não são devolvidos.');}
export function cook(s,item){
  if(s.phase!=='survival')return fail('Cozinhe após o prólogo.');
  if(!['rice','beans','egg'].includes(item))return fail('Receita indisponível.');
  if(s.task)return fail('Você já está ocupado.');
  if(count(s,item)<1||count(s,'water')<1||count(s,'fuel')<1)return fail('Leve o alimento, 1 L de água potável e 1 combustível na mochila.');
  const result=item==='egg'?'cookedEgg':item==='beans'?'beanMeal':'meal',qty=1;
  if(!capacity(s,result,qty))return fail('Reserve espaço na mochila antes de cozinhar.');
  take(s,item);take(s,'water');take(s,'fuel');return startTask(s,'cook',12,{item:result,qty});
}
export function treat(s){
  if(s.phase!=='survival')return fail('Trate a água após o prólogo.');
  if(s.task)return fail('Você já está ocupado.');
  if(count(s,'raw')<2||count(s,'fuel')<1)return fail('Leve 2 L de água não tratada e 1 combustível. O filtro está na cozinha.');
  take(s,'raw',2);take(s,'fuel');return startTask(s,'treat',8,{item:'water',qty:2});
}
export function fill(s,source){
  if(source==='tap'&&!s.services.water)return fail('Sem pressão na rede. Tente o poço ou use sua reserva.');
  const item=source==='tap'?'water':'raw';if(!capacity(s,item))return fail('Mochila cheia.');add(s,item);return ok(source==='tap'?'1 L de água da rede armazenado em recipiente fechado.':'1 L coletado, ainda NÃO potável.');
}
const BLACK_MARKET_PRICES={baton:5500,knife:12000,firearm:65000,ammo:1600};
export function buyBlackMarket(s,item){
  if(s.phase!=='survival'||s.day<8)return fail('Essa oferta clandestina ainda não apareceu. Não é necessária para sobreviver.');
  if(s.npcs.find(n=>n.id==='carlos')?.combat?.alive===false)return fail('O contato do mercado não está mais disponível.');
  if(!Object.hasOwn(BLACK_MARKET_PRICES,item))return fail('Oferta indisponível.');
  if((s.blackMarket.stock[item]||0)<1)return fail('O estoque acabou.');
  if(s.player.cash<BLACK_MARKET_PRICES[item])return fail('Dinheiro em espécie insuficiente.');
  if(!capacity(s,item))return fail('Sem espaço na mochila.');
  s.blackMarket.visited=true;s.player.cash-=BLACK_MARKET_PRICES[item];s.npcs.find(n=>n.id==='carlos').cash+=BLACK_MARKET_PRICES[item];s.stats.spent+=BLACK_MARKET_PRICES[item];
  if(item==='firearm'&&random(s)<.18){
    s.blackMarket.scamCount++;s.social.criminality=clamp(s.social.criminality+2);s.player.stress=clamp(s.player.stress+8);
    log(s,'A oferta clandestina era um golpe: o dinheiro sumiu e nenhum item foi entregue.','danger');
    return ok('Golpe: dinheiro perdido, sem produto.');
  }
  s.blackMarket.stock[item]--;s.blackMarket.sales++;add(s,item);
  log(s,`${ITEMS[item].name} comprado no mercado clandestino. A transação ficou registrada na cidade.`,'warning');
  return ok(`${ITEMS[item].name} recebido. A procedência e os riscos são inteiramente ficcionais.`);
}
export function equipWeapon(s,item){
  if(item==='none'){s.player.weapon='none';return ok('Você guardou o equipamento.');}
  if(!['baton','knife','firearm'].includes(item)||count(s,item)<1)return fail('Equipamento indisponível.');
  s.player.weapon=item;return ok(`${ITEMS[item].name} equipado. Ameaçar alguém pode causar ferimentos, retaliação e perda de confiança.`);
}
function sameRoom(a,b){return insideBuilding(a.x,a.y)?.id===insideBuilding(b.x,b.y)?.id;}
export function nearestCombatTarget(s){
  if(s.phase!=='survival')return null;
  const p=s.player,armed=p.weapon==='firearm',range=armed?150:43,face=[[0,-1],[1,0],[0,1],[-1,0]][p.dir];
  return s.npcs.filter(n=>n.combat?.alive!==false).map(n=>({...n,distance:Math.hypot(n.x-p.x,n.y-p.y)}))
    .filter(n=>{
      if(n.distance>range||!sameRoom(p,n))return false;
      const dx=n.x-p.x,dy=n.y-p.y;if(n.distance&&((dx*face[0]+dy*face[1])/n.distance)<-.15)return false;
      for(let d=8;d<n.distance-5;d+=8)if(blocked(p.x+dx*d/n.distance,p.y+dy*d/n.distance,s))return false;
      return true;
    }).sort((a,b)=>a.distance-b.distance)[0]||null;
}
export function attack(s){
  if(s.phase!=='survival')return fail('O combate só está disponível durante a campanha.');
  if(s.task)return fail('Conclua a atividade antes de entrar em conflito.');
  if(s.player.attackCooldown>s.activeTime)return fail('Aguarde um instante antes de agir novamente.');
  const target=nearestCombatTarget(s);if(!target)return fail('Nenhum morador ao alcance e à sua frente.');
  const p=s.player,weapon=p.weapon,firearm=weapon==='firearm',cost=firearm?10:weapon==='none'?5:7;
  if(p.energy<cost)return fail('Sem energia para agir.');
  if(firearm&&!take(s,'ammo'))return fail('Sem munição. A ação não foi realizada.');
  p.energy=clamp(p.energy-cost);p.attackCooldown=s.activeTime+1.25;
  const damage=firearm?72:weapon==='knife'?34:weapon==='baton'?24:12;
  const n=s.npcs.find(v=>v.id===target.id);n.combat.injury=clamp(n.combat.injury+damage);
  n.trust=clamp(n.trust-(firearm?38:22));n.combat.fear=clamp(n.combat.fear+35);
  n.memory.push(`Agressão sofrida no dia ${s.day}`);n.memory=n.memory.slice(-8);
  s.social.violence=clamp(s.social.violence+(firearm?12:5));s.social.criminality=clamp(s.social.criminality+(firearm?8:2));
  s.social.fear=clamp(s.social.fear+8);s.town.trust=clamp(s.town.trust-(firearm?8:4));s.town.security=clamp(s.town.security-2);
  for(const witness of s.npcs){
    if(witness.id===n.id||witness.combat?.alive===false||Math.hypot(witness.x-p.x,witness.y-p.y)>160||!sameRoom(witness,p))continue;
    witness.combat.fear=clamp(witness.combat.fear+18);witness.trust=clamp(witness.trust-6);
    witness.memory.push(`Presenciou uma agressão no dia ${s.day}`);witness.memory=witness.memory.slice(-8);
    s.social.fear=clamp(s.social.fear+3);
  }
  if(n.combat.injury>=100){n.combat.alive=false;n.combat.state='morto';n.state='morto';n.trust=0;s.social.violence=clamp(s.social.violence+18);s.social.criminality=clamp(s.social.criminality+20);s.town.trust=clamp(s.town.trust-18);log(s,`${n.name} morreu após a agressão. As consequências sociais e econômicas são permanentes.`,'danger');}
  else{
    const retaliation=n.combat.armed ? .88 : n.combat.aggression;
    if(random(s)<retaliation){n.combat.state='hostil';n.combat.hostileUntil=s.activeTime+9;n.combat.nextAttackAt=s.activeTime+1;}
    else{n.combat.state='fugindo';n.combat.fleeUntil=s.activeTime+12;n.combat.hostileUntil=0;}
    log(s,`${n.name} ${n.combat.state==='hostil'?'reagiu com violência':'se afastou assustado'}. Moradores próximos vão se lembrar do que aconteceu.`,'danger');
  }
  return ok(n.combat.alive?`${n.name} foi ferido. A cidade registrou a agressão.`:`${n.name} morreu. A cidade não esquecerá.`);
}
export function construct(s,type,tx,ty){
  if(s.phase!=='survival')return fail('Construa após o prólogo.');
  const r=RECIPES[type];if(!r)return fail('Construção inválida.');if(s.task)return fail('Você já está ocupado.');const error=canBuild(s,type,tx,ty);if(error)return fail(error);
  if(count(s,'wood')<r.wood||count(s,'metal')<r.metal)return fail('Leve os materiais na mochila.');
  take(s,'wood',r.wood);if(r.metal)take(s,'metal',r.metal);
  return startTask(s,'build',r.time,{type,x:tx,y:ty});
}
export function garden(s,id,action,kind='radish',seedling=false){
  const b=s.builds.find(b=>b.id===id&&b.type==='bed');if(!b)return fail('Canteiro indisponível.');
  if(action==='plant'){
    if(b.crop||!Object.hasOwn(CROPS,kind))return fail('O canteiro já tem uma planta.');
    const item=seedling?'seedling':'seed';if(seedling&&kind!=='lettuce')return fail('As mudas disponíveis são de alface.');
    if(!take(s,item))return fail('Leve sementes ou uma muda na mochila.');b.crop={kind,age:seedling?45:0};b.health=100;b.weeds=0;s.player.energy=clamp(s.player.energy-2);return ok('Plantado. O crescimento depende dos dias, umidade e cuidados.');
  }
  if(action==='water'){
    const item=count(s,'raw')?'raw':'water';if(!take(s,item))return fail('Leve 1 L de água; não tratada serve para irrigar.');b.moisture=clamp(b.moisture+55);s.stats.water++;return ok('Canteiro regado.');
  }
  if(action==='weed'){b.weeds=0;s.player.energy=clamp(s.player.energy-2);return ok('Ervas removidas.');}
  if(action==='compost'){
    const comp=s.builds.find(b=>b.type==='compost'&&b.ready>=1);if(!comp)return fail('Você precisa de composto maduro na composteira.');comp.ready--;b.fertility=clamp(b.fertility+30);return ok('Solo adubado.');
  }
  if(action==='harvest'){
    if(!b.crop)return fail('Canteiro vazio.');const d=CROPS[b.crop.kind];if(b.crop.age<d.days)return fail(`Ainda faltam pelo menos ${Math.ceil(d.days-b.crop.age)} dias de desenvolvimento.`);
    const qty=Math.max(1,Math.floor(d.yield*b.health/100)),item=d.item||'veg';if(!capacity(s,item,qty))return fail('Abra espaço na mochila.');add(s,item,qty);b.crop=null;b.fertility=clamp(b.fertility-15);s.stats.harvests++;return ok(`Colheita de ${qty} porções.`);
  }
  return fail('Ação indisponível.');
}
export function livestock(s,action){
  const coop=s.builds.find(b=>b.type==='coop');if(!coop)return fail('Construa um galinheiro primeiro.');
  const joao=s.npcs.find(n=>n.id==='joao');
  if(action==='buy'){
    if(s.chickens.length>=4)return fail('Seu galinheiro comporta 4 aves.');
    if(s.player.cash<8500)return fail('Uma galinha adulta custa R$ 85.');
    if(s.stats.chickens>=8)return fail('João já vendeu as aves disponíveis nesta campanha.');
    s.player.cash-=8500;joao.cash+=8500;s.stats.spent+=8500;s.chickens.push({id:++s.serial,health:90,lay:0,age:240});s.stats.chickens++;return ok('Galinha adulta adquirida. Água, ração, higiene e abrigo são necessários.');
  }
  if(action==='feed'){if(!take(s,'feed'))return fail('Leve 1 kg de ração.');coop.feed=(coop.feed||0)+1;return ok('1 kg de ração adicionado.');}
  if(action==='water'){if(!take(s,'water'))return fail('Leve 1 L de água potável para os animais.');coop.water=(coop.water||0)+1;return ok('Bebedouro abastecido.');}
  if(action==='clean'){coop.dirt=0;s.player.energy=clamp(s.player.energy-3);return ok('Galinheiro limpo.');}
  if(action==='eggs'){const qty=coop.eggs||0;if(!qty)return fail('Não há ovos para coletar.');if(!capacity(s,'egg',qty))return fail('Sem espaço na mochila.');add(s,'egg',qty);coop.eggs=0;return ok(`${qty} ovos coletados.`);}
  return fail('Ação indisponível.');
}
export function community(s,action,npcId='beatriz'){
  if(s.phase!=='survival')return fail('Atividades comunitárias começam após o prólogo.');
  const n=s.npcs.find(n=>n.id===npcId);
  if(action==='donate'){
    if(!n||n.combat?.alive===false||n.trust<8)return fail('Essa pessoa não pode ou não quer receber sua ajuda.');
    if(s.lastDonationDay===s.day)return fail('Você já contribuiu hoje.');const item=n.need;if(s.player.inventory.some(b=>b.item===item&&(b.condition<40||b.expiry!==null&&b.expiry<=s.day)))return fail('A ajuda precisa de alimentos em boas condicoes.');if(count(s,item)<2)return fail(`Leve 2 × ${ITEMS[item].name}.`);
    giveToVendor(s,n,item,2);n.needLevel=clamp(n.needLevel-25);n.trust=clamp(n.trust+10);s.town.trust=clamp(s.town.trust+4);s.town.supply=clamp(s.town.supply+2);s.town.economy=clamp(s.town.economy+3);s.lastDonationDay=s.day;s.stats.helped++;s.town.helped++;n.memory.push(`Recebeu ajuda no dia ${s.day}`);n.memory=n.memory.slice(-8);log(s,`${n.name} recebeu sua contribuição. A confiança da comunidade cresceu.`);return ok('Ajuda entregue.');
  }
  if(action==='work'){
    if(s.lastWorkDay===s.day)return fail('Você já cumpriu a jornada disponível hoje.');if(s.task)return fail('Você já está ocupado.');
    if(s.town.treasury<6500)return fail('O caixa comunitário não tem mais verba para uma jornada.');
    if(s.player.energy<20)return fail('Descanse antes de trabalhar.');s.lastWorkDay=s.day;s.town.treasury-=6500;return startTask(s,'work',45,{pay:6500});
  }
  if(action==='patrol'){
    if(s.lastPatrolDay===s.day)return fail('A escala de hoje já foi organizada.');if(s.task)return fail('Você já está ocupado.');s.lastPatrolDay=s.day;return startTask(s,'patrol',30);
  }
  if(action==='fair'){
    if(s.town.fair)return fail('A feira já está organizada. Negocie com os moradores.');
    if(s.town.trust<45)return fail('A comunidade precisa de 45 de confiança. Ajude moradores e faça vigilância.');s.town.fair=true;s.town.economy=clamp(s.town.economy+15);log(s,'A feira comunitária está organizada. Produtores terão reposições mais regulares.','success');return ok('A feira está aberta!');
  }
  return fail('Ação indisponível.');
}
export function salvage(s,forest=false){
  if(s.phase!=='survival')return fail('Recolha materiais após o prólogo.');
  const field=forest?'lastForestDay':'lastSalvageDay';if(s[field]===s.day)return fail('A área já foi vasculhada hoje.');if(s.task)return fail('Você já está ocupado.');
  if(!capacity(s,'wood',3)||(!forest&&!capacity(s,'metal',2)))return fail('Reserve espaço na mochila.');s[field]=s.day;return startTask(s,'salvage',18,{forest});
}
export function move(s,dx,dy,run,dt){
  const p=s.player;p.moving=false;p.running=false;
  if(s.paused||!['prologue','survival'].includes(s.phase)||s.task)return;
  const len=Math.hypot(dx,dy);if(!len)return;dx/=len;dy/=len;
  p.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0);
  const burden=load(s)>17?.78:1;const speed=(run&&p.energy>12?115:75)*burden*(p.water<12?.7:1)*(p.energy<10?.65:1);
  const before=[p.x,p.y];const steps=Math.max(1,Math.ceil(speed*dt/4));
  for(let i=0;i<steps;i++){const nx=p.x+dx*speed*dt/steps,ny=p.y+dy*speed*dt/steps;if(!blocked(nx,p.y,s))p.x=nx;if(!blocked(p.x,ny,s))p.y=ny;}
  const dist=Math.hypot(p.x-before[0],p.y-before[1]);p.moving=dist>.01;p.running=run&&p.energy>12;s.stats.distance+=dist/TILE;
}
function beginSurvival(s){s.phase='survival';s.dayTime=0;s.player.moving=false;s.player.running=false;s.task=null;log(s,'DIA 1 — O MUNDO FICOU OFFLINE. '+NARRATIVE[0],'chapter');}
export function advance(s,dt){
  if(s.paused||!Number.isFinite(dt)||dt<=0||!['prologue','survival'].includes(s.phase))return;
  if(s.phase==='prologue'){
    const used=Math.min(dt,s.prologue);s.prologue=Math.max(0,s.prologue-used);s.activeTime+=used;
    if(s.prologue<=1e-8)beginSurvival(s);
    // A transição acontece no limite; frações excedentes pertencem ao dia 1.
    if(dt>used)advance(s,dt-used);return;
  }
  let remain=dt;
  while(remain>1e-8&&s.phase==='survival'){
    const step=Math.min(remain,1-s.simulationRemainder,DAY-s.dayTime);
    s.dayTime+=step;s.activeTime+=step;s.simulationRemainder+=step;remain-=step;
    if(s.simulationRemainder>=1-1e-8){s.simulationRemainder=0;second(s);}
    if(s.player.health<=0){s.phase='dead';s.deathCause=s.player.water<1?'Desidratação':s.player.food<1?'Fome':s.player.sick>30?'Complicações gastrointestinais':s.player.wound>30?'Ferimentos':'Exaustão e exposição';log(s,`Você não resistiu: ${s.deathCause}.`,'danger');break;}
    if(s.dayTime>=DAY-1e-8){
      s.dayTime=0;s.simulationRemainder=0;
      if(s.day===DAYS){s.phase='won';s.ending=s.player.health<25?'Sobrevivente por pouco':s.stats.helped>=10&&s.town.trust>=65?'Pilar da comunidade':s.stats.harvests>=3||s.stats.eggs>=15?'Autossuficiente':'Sobrevivente solitário';log(s,'Trinta dias se passaram. O mundo não voltou ao que era. Mas você continua aqui.','success');}
      else{s.day++;newDay(s);}
    }
  }
}
function second(s){
  const p=s.player,m=MODES[s.mode],sleep=p.sleeping,indoors=!!insideBuilding(p.x,p.y);
  const exertion=p.running?1.35:p.moving?1.12:s.task&&!sleep?1.15:1;
  p.food=clamp(p.food-100/DAY*m.need*exertion);p.water=clamp(p.water-100/DAY*m.need*exertion*(s.weather.temp>30?1.15:1)*(p.sick?1.25:1));
  p.energy=clamp(p.energy+(sleep?.42:-.095*(p.running?2:p.moving?1.3:1)*(p.stress>70?1.25:1)));
  p.stress=clamp(p.stress+(sleep?-.06:isNight(s)&&!indoors?.025:-.008));
  p.exposure=clamp(p.exposure+(!indoors&&s.weather.rain>.5?.035:-.05));
  if(p.lantern&&isNight(s)){p.battery=Math.max(0,p.battery-1);if(!p.battery){p.lantern=false;log(s,'As pilhas da lanterna acabaram.','warning');}}
  const harm=(p.food<1?.065:0)+(p.water<1?.15:0)+(p.energy<1?.035:0)+(p.sick>0?.008*p.sick/30:0)+(p.wound>0?.012:0)+(p.exposure>80?.02:0);
  const variety=new Set(p.diet).size;
  p.health=clamp(p.health-harm+(p.food>40&&p.water>40&&sleep?.025*(variety>=3?1:.5):0));
  if(p.sick>0)p.sick=Math.max(0,p.sick-(sleep&&p.water>30?.04:.005));if(p.wound>0&&sleep)p.wound=Math.max(0,p.wound-.02);
  if(s.task){s.task.remaining--;if(s.task.remaining<=0)completeTask(s);}
  // Coleta em L = mm de chuva × 4 m² de área; 8 mm/h simulada em chuva forte.
  for(const b of s.builds){
    if(b.type==='barrel'&&s.weather.rain>0)b.liters=Math.min(60,(b.liters||0)+s.weather.rain*8*24/DAY*4);
    if(b.type==='bed'){b.moisture=clamp(b.moisture-.035+s.weather.rain*.15);if(b.crop){const d=CROPS[b.crop.kind];const favorable=b.moisture>20&&b.moisture<90&&b.health>25;const light=hour(s)>=6&&hour(s)<18?2:0;const heat=s.weather.temp>32?.75:1;b.crop.age+=favorable?1/DAY*light*(b.fertility/100*.3+.7)*(1-b.weeds/200)*heat:0;b.weeds=clamp(b.weeds+.025);b.health=clamp(b.health+(b.moisture<8||b.moisture>96?-.07:.012));b.crop.age=Math.min(d.days+1,b.crop.age);}}
    if(b.type==='coop'&&b===s.builds.find(v=>v.type==='coop')){
      b.dirt=clamp((b.dirt||0)+s.chickens.length*.035);b.feed=b.feed||0;b.water=b.water||0;b.eggs=b.eggs||0;
      const fed=b.feed>=s.chickens.length*.12/DAY,watered=b.water>=s.chickens.length*.3/DAY;
      if(fed)b.feed=Math.max(0,b.feed-s.chickens.length*.12/DAY);if(watered)b.water=Math.max(0,b.water-s.chickens.length*.3/DAY);
      for(const c of s.chickens){c.health=clamp(c.health+(!fed||!watered||b.dirt>80?-.065:.02));if(fed&&watered&&c.health>60&&b.dirt<70){c.lay+=.75/DAY;if(c.lay>=1){c.lay--;b.eggs++;s.stats.eggs++;}}}
      const alive=s.chickens.filter(c=>c.health>0);if(alive.length!==s.chickens.length){log(s,'Uma galinha não resistiu à falta de cuidados.','danger');s.chickens=alive;}
    }
  }
  npcsStep(s);combatStep(s);threatStep(s);
  if(s.dayTime>=s.eventAt){event(s);s.eventAt=s.dayTime+100+Math.floor(random(s)*130);}
  if([10,25].includes(Math.floor(p.water))&&Math.floor(p.water+100/DAY*m.need*exertion)!==Math.floor(p.water))log(s,p.water<11?'Desidratação iminente. Beba água agora.':'Água abaixo de 25%. Use a rede, reserva ou trate a água do poço.','warning');
}
function completeTask(s){
  const {type,data}=s.task;s.task=null;s.player.sleeping=false;
  if(type==='cook'||type==='treat'){add(s,data.item,data.qty,capacity(s,data.item,data.qty)?'inventory':'storage');if(type==='treat')s.stats.water+=2;log(s,type==='treat'?'2 L filtrados e fervidos. Recipiente limpo e fechado.':'Preparo concluído. A refeição está pronta.','success');}
  if(type==='sleep')log(s,'Você acordou. O dia transcorreu no ritmo normal.');
  if(type==='work'){s.player.cash+=data.pay;s.stats.earned+=data.pay;s.player.energy=clamp(s.player.energy-8);s.town.supply=clamp(s.town.supply+2);s.town.trust=clamp(s.town.trust+1);log(s,'Jornada concluída. Você recebeu R$ 65 do caixa comunitário.','success');}
  if(type==='patrol'){s.house.watch=3;s.town.security=clamp(s.town.security+6);s.town.trust=clamp(s.town.trust+3);log(s,'Vigilância combinada por três dias. A segurança do bairro melhorou.','success');}
  if(type==='salvage'){add(s,'wood',data.forest?3:2,capacity(s,'wood',3)?'inventory':'storage');if(!data.forest)add(s,'metal',2,capacity(s,'metal',2)?'inventory':'storage');s.player.energy=clamp(s.player.energy-4);log(s,'Materiais reaproveitados e recolhidos.');}
  if(type==='build'){
    s.builds.push({id:`b${++s.serial}`,type:data.type,x:data.x,y:data.y,...(data.type==='bed'?{crop:null,moisture:45,fertility:65,weeds:0,health:100}:{}),...(data.type==='barrel'?{liters:0,clean:true}:{}),...(data.type==='compost'?{ready:0,days:0,filled:false}:{})});
    if(data.type==='reinforcement')s.house.reinforced=Math.min(3,s.house.reinforced+1);log(s,`${RECIPES[data.type].name} construído. Os materiais foram consumidos.`,'success');
  }
}
function npcsStep(s){
  const h=hour(s);
  for(const n of s.npcs){
    if(n.combat?.alive===false)continue;
    if(n.combat.hostileUntil<=s.activeTime&&n.combat.fleeUntil<=s.activeTime)n.combat.state='calmo';
    const b=BUILDINGS.find(b=>b.id===n.home);let target;
    if(n.combat.hostileUntil>s.activeTime){n.state='revidando';target=[s.player.x,s.player.y];}
    else if(n.combat.fleeUntil>s.activeTime){n.state='fugindo';const dx=n.x-s.player.x,dy=n.y-s.player.y,d=Math.max(1,Math.hypot(dx,dy));target=[clamp(n.x+dx/d*120,24,71*TILE),clamp(n.y+dy/d*120,24,53*TILE)];}
    else if(h>=20||h<7){n.state=h>=22||h<6?'dormindo':'em casa';target=[(b.x+b.w/2)*TILE,(b.y+b.h-.5)*TILE];}
    else if(s.weather.kind==='temporal'){n.state='abrigando-se';target=[(b.x+b.w/2)*TILE,(b.y+b.h-.5)*TILE];}
    else if(n.needLevel>60&&h>11&&h<14){n.state='procurando recursos';target=[34*TILE,29*TILE];}
    else{n.state=n.id==='beatriz'&&s.town.fair?'organizando a feira':'trabalhando';target=n.work.map(v=>v*TILE);}
    const routeKey=target.join(',');
    if(n.routeKey!==routeKey){n.route=findPath(s,[n.x,n.y],target);n.routeKey=routeKey;n.stuck=0;}
    n.moving=false;
    let budget=22;
    while(budget>0&&n.route?.length){
      const way=n.route[0],dx=way[0]-n.x,dy=way[1]-n.y,len=Math.hypot(dx,dy);if(len<1){n.route.shift();continue;}
      const step=Math.min(3,budget,len),xx=dx/len*step,yy=dy/len*step,old=[n.x,n.y];
      if(!blocked(n.x+xx,n.y,s,true))n.x+=xx;if(!blocked(n.x,n.y+yy,s,true))n.y+=yy;budget-=step;
      n.moving=true;n.dir=Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy>0?2:0;
      if(Math.hypot(n.x-old[0],n.y-old[1])<.01){n.stuck=(n.stuck||0)+1;break;}else n.stuck=0;
    }
    if(n.stuck>4){n.route=findPath(s,[n.x,n.y],target);n.stuck=0;}
  }
}
function event(s){
  s.stats.events++;
  const r=random(s);
  if(isNight(s)){
    if(r<.4&&s.day>4&&!s.threat){s.threat={x:28*TILE,y:27*TILE,state:'aproximando',wait:0,noticed:false};log(s,'Passos na rua. Alguém se aproxima do portão pelo lado leste. Tranque a porta ou converse da entrada.','warning');}
    else log(s,r<.7?'Um cachorro late ao longe. Nenhum movimento perto da casa.':'Você ouve vozes na rua. Vizinhos voltam para suas casas.');
    return;
  }
  if(r<.20&&s.day>3){s.services.power=!s.services.power;s.services.powerDistricts[0]=s.services.power;log(s,s.services.power?'A energia voltou no seu bairro.':'Falha elétrica no bairro. A rede de água tem sua própria reserva.','warning');}
  else if(r<.34&&s.day>5){s.services.water=!s.services.water;log(s,s.services.water?'A pressão da rede foi restabelecida.':'A água perdeu pressão. Use reservas ou trate a água do poço.','warning');}
  else if(r<.48&&s.weather.kind!=='temporal'){s.weather={kind:'chuva',temp:23,rain:.6};log(s,'Começou a chover. Reservatórios instalados recebem água não potável.');}
  else if(r<.57&&s.weather.rain){s.weather={kind:'nublado',temp:25,rain:0};log(s,'A chuva parou. O solo continua úmido por algum tempo.');}
  else if(r<.75){const n=s.npcs[Math.floor(random(s)*s.npcs.length)];n.needLevel=clamp(n.needLevel+15);log(s,`${n.name} procura ${ITEMS[n.need].name.toLowerCase()}. Ajudar fortalece os vínculos.`);}
  else log(s,s.day<6?'O rádio comunitário ainda recebe notícias desencontradas. Ninguém confirmou o retorno da conexão.':s.town.fair?'A feira continua conectando produtores. Verifique os estoques e compare os preços.':'Beatriz fala em organizar uma feira. A comunidade precisa de confiança para começar.');
}
function threatStep(s){
  const t=s.threat;if(!t)return;
  if(!isNight(s)){s.threat=null;return;}
  const target={x:23.5*TILE,y:24.5*TILE};let d=Math.hypot(t.x-target.x,t.y-target.y);
  if(d>12){t.x+=(target.x-t.x)/d*8;t.y+=(target.y-t.y)/d*8;return;}
  t.state='no portão';t.wait++;
  const defended=s.house.locked||s.house.reinforced>0||s.house.watch>0||(s.player.lantern&&Math.hypot(s.player.x-t.x,s.player.y-t.y)<100);
  if(defended&&t.wait>=8){log(s,'A pessoa desistiu na entrada. Porta, iluminação ou vigilância impediram a oportunidade.','success');s.threat=null;}
  else if(!defended&&t.wait===8)log(s,'O visitante está tentando abrir a porta destrancada. Ainda dá tempo de trancar ou conversar.','danger');
  else if(!defended&&t.wait>=20){
    // O agente só entra após alcançar a porta e aguardar a oportunidade.
    t.y-=24;t.state='furtando';if(s.storage.length){const b=s.storage.find(b=>b.qty>0);if(b){b.qty--;log(s,`Furto: 1 × ${ITEMS[b.item].name} levado do armário. Ninguém se feriu.`,'danger');s.storage=s.storage.filter(b=>b.qty>0);}}
    s.player.stress=clamp(s.player.stress+12);s.town.security=clamp(s.town.security-3);s.threat=null;
  }
}
function newDay(s){
  const r=random(s);s.weather=r<.16?{kind:'temporal',temp:21,rain:1}:r<.38?{kind:'chuva',temp:24,rain:.5}:r<.6?{kind:'nublado',temp:26,rain:0}:{kind:'sol',temp:29+Math.floor(random(s)*5),rain:0};
  const pressure=Math.max(0,s.day-4)/70;
  s.services.power=random(s)>pressure;s.services.water=random(s)>pressure*.7;
  s.services.powerDistricts=[s.services.power,random(s)>pressure,random(s)>pressure];
  s.town.supply=clamp(s.town.supply-1.4+(s.town.fair?1:0));s.town.security=clamp(s.town.security-.5+(s.house.watch?.5:0));s.house.watch=Math.max(0,s.house.watch-1);
  for(const n of s.npcs){
    // Cada morador consome o próprio estoque; produção local e reposição vêm de fontes explícitas.
    for(const b of n.resaleLots||[])if(b.expiry!==null&&b.expiry<=s.day){n.stock[b.item]-=b.qty;b.qty=0;}if(n.resaleLots)n.resaleLots=n.resaleLots.filter(b=>b.qty>0);
    for(const item of ['bread','fruit','rice','beans','water'])if(n.stock[item]>0)vendorTake(n,item,1);
    n.needLevel=clamp(n.needLevel+7);n.emotion=n.needLevel>70?'preocupado':s.town.trust>60?'esperançoso':'apreensivo';
    if(n.id==='carlos'&&s.day>=12)n.combat.armed=true;
    if(n.id==='joao'){for(const [k,q]of Object.entries({egg:4,veg:4,rice:3,beans:2}))n.stock[k]=(n.stock[k]||0)+q;}
    if(n.id==='celia')n.stock.veg=(n.stock.veg||0)+2;
    if(s.town.fair&&n.id==='antonio'&&s.day%3===0){
      const joao=s.npcs.find(v=>v.id==='joao');for(const item of ['egg','veg','rice']){const q=Math.min(6,joao.stock[item]||0);const cost=q*ITEMS[item].price*60;if(n.cash>=cost){vendorReceive(n,vendorTake(joao,item,q));n.cash-=cost;joao.cash+=cost;}}
    }
  }
  for(const list of [s.player.inventory,s.storage])for(const b of list){
    if(ITEMS[b.item].shelf&&ITEMS[b.item].shelf<15&&list===s.storage&&s.services.power&&b.expiry>s.day&&s.day%2===0)b.expiry++;
    if(b.expiry!==null&&b.expiry<=s.day)b.condition=20;
  }
  for(const b of s.builds){
    if(b.type==='compost'&&b.filled){b.days++;if(b.days>=7){b.ready=(b.ready||0)+2;b.filled=false;b.days=0;log(s,'O composto ficou pronto para adubar.');}}
    if(b.type==='barrel'&&b.liters>0&&b.clean===false)log(s,'Há um reservatório sujo. Use a água apenas para irrigação até limpar.','warning');
    if(b.type==='coop'&&s.chickens.length&&((b.feed||0)<s.chickens.length*.12||(b.water||0)<s.chickens.length*.3||(b.dirt||0)>70))log(s,'Atenção ao galinheiro: revise ração, água e higiene antes que as aves adoeçam.','warning');
  }
  s.eventAt=100+Math.floor(random(s)*80);log(s,`DIA ${s.day} — ${arc(s)}. ${NARRATIVE[s.day-1]}`,'chapter');
}
export function dialogue(s,n){
  const remembered=n.memory.length?` Lembro da nossa última negociação no dia ${n.memory.at(-1).match(/dia (\d+)/i)?.[1]||s.day}.`:'';
  const lines={celia:s.day<6?'Trouxe umas mudas já crescidas. Semente precisa de tempo, viu?':'Não deixe o canteiro secar. E não viva só de folha: precisa de comida que sustente.',antonio:s.phase==='prologue'?'Vai querer levar o quê? Só dinheiro vivo, a rede já está oscilando.':`Vou trabalhar com o que tem. ${s.town.supply<60?'A reposição está difícil.':'Ainda tenho reserva no depósito.'}`,rafael:s.services.power?'Tem serviço de manutenção no mural. Pagam em cédulas.':'Luz não é internet. Hoje a falha é elétrica mesmo; vamos reparar o que der.',marina:s.player.sick?'Água segura e descanso são prioridade. Posso ajudar com os cuidados.':'Água do poço precisa de tratamento. Fervura não resolve contaminação química.',joao:'As aves precisam de água limpa, ração e abrigo. Uma galinha saudável não bota todo dia.',carlos:s.scamDay===s.day?'Não gostou da oferta? Tudo bem.':'Tenho uma oportunidade exclusiva para você. Melhor investigar antes de pagar.',beatriz:s.town.fair?'A feira está de pé. Obrigada por ajudar a manter o bairro unido.':'Se a gente juntar confiança e pequenos produtores, dá para organizar a feira.'};
  return `${lines[n.id]}${n.combat?.fear>25?' Não se aproxime. Eu me lembro do que você fez.':n.trust>55?' Você tem sido uma pessoa de confiança.':remembered}`;
}
export function buildAction(s,id,action){
  const b=s.builds.find(b=>b.id===id);if(!b)return fail('Objeto não encontrado.');
  if(action==='remove'){
    if(b.type==='coop'&&b===s.builds.find(v=>v.type==='coop')&&s.chickens.length)return fail('Não remova o abrigo com aves.');if(b.type==='bed'&&b.crop)return fail('Colha ou retire a planta primeiro.');
    const qty=Math.floor((RECIPES[b.type]?.wood||0)/2);if(qty&&!capacity(s,'wood',qty))return fail('Sem espaço para recuperar materiais.');if(qty)add(s,'wood',qty);if(b.type==='reinforcement')s.house.reinforced=Math.max(0,s.house.reinforced-1);s.builds=s.builds.filter(v=>v.id!==id);return ok('Removido. Metade da madeira foi recuperada.');
  }
  if(action==='draw'){
    if((b.liters||0)<1)return fail('O reservatório está vazio. Só coleta quando chove.');if(!capacity(s,'raw'))return fail('Sem espaço na mochila.');b.liters--;add(s,'raw');return ok('1 L retirado. A água da chuva não é automaticamente potável.');
  }
  if(action==='clean'){b.clean=true;s.player.energy=clamp(s.player.energy-2);return ok('Tampa, calha e recipiente inspecionados e limpos.');}
  if(action==='compost'){
    if(b.filled)return fail('O composto ainda está maturando. Aguarde 7 dias.');if(!take(s,'veg',2)&&!take(s,'fruit',2))return fail('Leve 2 porções de restos de hortaliças ou frutas.');b.filled=true;b.days=0;return ok('Composteira abastecida. Maturação simplificada: 7 dias.');
  }
  return fail('Ação indisponível.');
}
export function scam(s,action){
  if(s.scamDay===s.day)return fail('A proposta de hoje foi encerrada.');
  if(action==='inspect'){s.scamDay=s.day;s.town.trust=clamp(s.town.trust+1);log(s,'Você examinou a oferta: lacre rompido, sem procedência. Carlos recolheu o produto.','warning');return ok('Golpe identificado. Não houve pagamento.');}
  if(s.player.cash<1200)return fail('Dinheiro insuficiente.');if(!capacity(s,'chemical',2))return fail('Sem espaço.');s.player.cash-=1200;s.npcs.find(n=>n.id==='carlos').cash+=1200;s.stats.spent+=1200;add(s,'chemical',2);s.scamDay=s.day;log(s,'O galão tem odor estranho. A água está marcada como suspeita e não é segura para beber.','danger');return ok('Compra recebida; procedência reprovada.');
}
export function bankHome(s,deposit=true){
  const qty=deposit?s.player.cash:s.house.safeCash;if(!qty)return fail('Não há dinheiro para transferir.');
  if(deposit){s.house.safeCash+=qty;s.player.cash=0;}else{s.player.cash+=qty;s.house.safeCash=0;}return ok('Cédulas transferidas.');
}
export function treatClinic(s){
  const n=s.npcs.find(n=>n.id==='marina');if(!(n.stock.meds>0))return fail('O posto está sem kits.');
  if(s.player.cash<1000&&n.trust<55)return fail('Atendimento custa R$ 10; vínculos fortes permitem apoio solidário.');
  n.stock.meds--;if(s.player.cash>=1000){s.player.cash-=1000;n.cash+=1000;s.stats.spent+=1000;}
  s.player.health=clamp(s.player.health+20);s.player.sick=Math.max(0,s.player.sick-30);s.player.wound=Math.max(0,s.player.wound-30);return ok('Cuidados recebidos. Alimentação, água e descanso continuam necessários.');
}
export function validateSave(value){
  if(!value||typeof value!=='object'||value.version!==SAVE_VERSION)throw new Error('Versão de salvamento incompatível.');
  let nodes=0;const seen=new WeakSet();
  function safeTree(v,depth=0){
    if(++nodes>100000||depth>24)throw new Error('Estrutura de save excessiva.');
    if(typeof v==='number'&&!Number.isFinite(v))throw new Error('Numero invalido.');
    if(typeof v==='string'&&v.length>2000)throw new Error('Texto excessivo.');
    if(v&&typeof v==='object'){
      if(seen.has(v))throw new Error('Referencia circular no save.');seen.add(v);
      if(Array.isArray(v)&&v.length>4000)throw new Error('Lista excessiva.');
      for(const k of Object.keys(v)){if(['__proto__','prototype','constructor'].includes(k))throw new Error('Chave invalida.');safeTree(v[k],depth+1);}
    }
  }
  safeTree(value);const s=structuredClone(value);
  // A estrutura base evita carregar objetos incompletos e valores fora de tipo.
  const template=createGame(1,s.mode);
  for(const field of ['social','blackMarket'])if(!Object.hasOwn(s,field))s[field]=structuredClone(template[field]);
  if(s.player&&typeof s.player==='object'&&!Array.isArray(s.player))for(const [field,defaultValue]of Object.entries(template.player))if(!Object.hasOwn(s.player,field))s.player[field]=structuredClone(defaultValue);
  if(Array.isArray(s.npcs))for(const n of s.npcs)if(n&&typeof n==='object'&&!Array.isArray(n)&&!Object.hasOwn(n,'combat')){const base=template.npcs.find(v=>v.id===n.id);if(base)n.combat=structuredClone(base.combat);}
  function shape(v,t,path='save'){
    if(typeof t==='number'){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e12)throw new Error(`Valor inválido em ${path}.`);}
    else if(typeof t==='string'){if(typeof v!=='string'||v.length>2000)throw new Error(`Texto inválido em ${path}.`);}
    else if(typeof t==='boolean'){if(typeof v!=='boolean')throw new Error(`Estado inválido em ${path}.`);}
    else if(Array.isArray(t)){if(!Array.isArray(v)||v.length>500)throw new Error(`Lista inválida em ${path}.`);}
    else if(t!==null){if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(`Estrutura inválida em ${path}.`);for(const k of Object.keys(t))shape(v[k],t[k],`${path}.${k}`);}
  }
  shape(s,template);
  if(s.saveToken!==undefined&&(typeof s.saveToken!=='string'||!/^([a-f0-9]{32})$/.test(s.saveToken)))throw new Error('Identificador de gravacao invalido.');
  for(const field of ['task','threat'])if(s[field]!==null&&(!s[field]||typeof s[field]!=='object'||Array.isArray(s[field])))throw new Error('Estrutura opcional invalida.');
  for(const b of s.builds)if(b.type==='bed'&&b.crop!==null&&(!b.crop||typeof b.crop!=='object'||Array.isArray(b.crop)))throw new Error('Plantacao invalida.');
  if(!Object.hasOwn(MODES,s.mode)||!['prologue','survival','dead','won'].includes(s.phase)||!Number.isInteger(s.day)||s.day<1||s.day>30||(s.dayTime>600||(s.dayTime===600&&s.phase!=='dead'))||s.prologue>30||s.simulationRemainder>=1)throw new Error('Relógio ou modo inválido.');
  for(const k of ['seed','rng','serial','saveRevision'])if(!Number.isInteger(s[k]))throw new Error('Identificador inválido.');
  if(s.seed>4294967295||s.rng>4294967295)throw new Error('Semente inválida.');
  for(const b of [...s.player.inventory,...s.storage]){
    if(!Number.isFinite(b?.condition))throw new Error('Condição do item inválida.');
    if(!b||!Object.hasOwn(ITEMS,b.item)||!Number.isInteger(b.qty)||b.qty<1||b.qty>10000||!Number.isInteger(b.uid)||b.uid<1||b.condition<0||b.condition>100||!(b.expiry===null||Number.isFinite(b.expiry)&&b.expiry>=0))throw new Error('Inventário inválido.');
  }
  const ids=[...s.player.inventory,...s.storage].map(b=>b.uid);if(new Set(ids).size!==ids.length||ids.some(id=>id>s.serial))throw new Error('Identificadores de itens inconsistentes.');
  for(const v of ['health','food','water','energy','stress','exposure','sick','wound'])if(s.player[v]>100)throw new Error('Indicador fora do limite.');
  if(s.player.x>72*TILE||s.player.y>54*TILE||!Number.isInteger(s.player.cash)||!Number.isInteger(s.player.bank)||s.player.bank>150000||!Number.isInteger(s.house.safeCash))throw new Error('Jogador inválido.');
  if(s.npcs.length!==NPCS.length||new Set(s.npcs.map(n=>n.id)).size!==NPCS.length)throw new Error('Moradores inválidos.');
  for(const n of s.npcs){const base=template.npcs.find(v=>v.id===n.id);if(!base)throw new Error('Morador desconhecido.');shape(n,base,'npc');for(const [k,q]of Object.entries(n.stock))if(!Object.hasOwn(ITEMS,k)||!Number.isInteger(q)||q<0||q>100000)throw new Error('Estoque inválido.');if(!Number.isInteger(n.cash))throw new Error('Caixa inválido.');if(n.home!==base.home||n.need!==base.need||n.personality!==base.personality||n.trust>100||n.needLevel>100||n.x>72*TILE||n.y>54*TILE)throw new Error('Morador inválido.');for(const k of ['color','skin'])if(!/^#[a-f0-9]{6}$/i.test(n[k]))throw new Error('Aparência inválida.');if(n.work.length!==2||n.work.some((v,i)=>v!==base.work[i]))throw new Error('Rotina inválida.');if(n.route&&(!Array.isArray(n.route)||n.route.length>4000||n.route.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>2000))))throw new Error('Caminho inválido.');if(n.routeKey!==undefined&&typeof n.routeKey!=='string')throw new Error('Destino inválido.');}
  for(const n of s.npcs)if(n.resaleLots!==undefined){if(!Array.isArray(n.resaleLots)||n.resaleLots.length>500)throw new Error('Lotes comerciais invalidos.');const totals={};for(const b of n.resaleLots){if(!b||!Object.hasOwn(ITEMS,b.item)||!Number.isInteger(b.qty)||b.qty<1||!Number.isFinite(b.condition)||b.condition<0||b.condition>100||!(b.expiry===null||Number.isFinite(b.expiry)&&b.expiry>=0))throw new Error('Lote comercial invalido.');totals[b.item]=(totals[b.item]||0)+b.qty;}for(const [item,qty]of Object.entries(totals))if(qty>(n.stock[item]||0))throw new Error('Estoque comercial inconsistente.');}
  if(new Set(s.builds.map(b=>b.id)).size!==s.builds.length)throw new Error('Construções duplicadas.');
  for(const b of s.builds){if(!Object.hasOwn(RECIPES,b.type)||typeof b.id!=='string'||!Number.isInteger(b.x)||!Number.isInteger(b.y)||b.x<19||b.x>27||b.y<10||b.y>16)throw new Error('Construção inválida.');if(b.type==='bed'){for(const key of ['moisture','fertility','weeds','health'])if(!Number.isFinite(b[key])||b[key]<0||b[key]>100)throw new Error('Solo inválido.');if(b.crop&&(!Object.hasOwn(CROPS,b.crop.kind)||!Number.isFinite(b.crop.age)||b.crop.age<0||b.crop.age>400))throw new Error('Plantação inválida.');}}
  for(const b of s.builds){for(const k of ['liters','feed','water','eggs','dirt','ready','days'])if(b[k]!==undefined&&(!Number.isFinite(b[k])||b[k]<0||b[k]>10000))throw new Error('Recurso doméstico inválido.');for(const k of ['clean','filled'])if(b[k]!==undefined&&typeof b[k]!=='boolean')throw new Error('Manutenção inválida.');if(b.liters>60)throw new Error('Reservatório excedido.');}
  for(const c of s.chickens)if(!Number.isFinite(c.health)||c.health<0||c.health>100||!Number.isFinite(c.lay)||c.lay<0||c.lay>1||!Number.isFinite(c.age))throw new Error('Animal inválido.');
  if(s.chickens.length>4)throw new Error('Limite de animais excedido.');
  for(const e of s.journal)if(!e||typeof e.text!=='string'||!Number.isFinite(e.day)||!Number.isFinite(e.time))throw new Error('Diário inválido.');
  if(s.task&&(!['sleep','cook','treat','work','patrol','build','salvage'].includes(s.task.type)||!Number.isFinite(s.task.total)||!Number.isFinite(s.task.remaining)||s.task.remaining<=0||s.task.remaining>s.task.total||s.task.total>300||!s.task.data||typeof s.task.data!=='object'))throw new Error('Atividade inválida.');
  if(s.task){const {type,data}=s.task;if(['cook','treat'].includes(type)&&(!['meal','beanMeal','cookedEgg','water'].includes(data.item)||!Number.isInteger(data.qty)||data.qty<1||data.qty>2))throw new Error('Receita inválida.');if(type==='work'&&data.pay!==6500)throw new Error('Pagamento inválido.');if(type==='build'&&(!Object.hasOwn(RECIPES,data.type)||!Number.isInteger(data.x)||!Number.isInteger(data.y)||data.x<19||data.x>27||data.y<10||data.y>16))throw new Error('Obra inválida.');if(type==='salvage'&&typeof data.forest!=='boolean')throw new Error('Coleta inválida.');}
  if(s.threat&&(!Number.isFinite(s.threat.x)||!Number.isFinite(s.threat.y)||!Number.isFinite(s.threat.wait)))throw new Error('Ocorrência inválida.');

  if(s.player.battery>600)throw new Error('Carga de pilhas invalida.');
  if(!Number.isInteger(s.player.dir)||s.player.dir>3||s.player.diet.some(k=>!Object.hasOwn(ITEMS,k))||s.player.diet.length>12)throw new Error('Jogador inconsistente.');
  if(!['none','baton','knife','firearm'].includes(s.player.weapon)||!Number.isFinite(s.player.attackCooldown)||s.player.attackCooldown<0)throw new Error('Equipamento do jogador inválido.');
  for(const key of ['violence','criminality','fear'])if(s.social[key]>100)throw new Error('Reputação social inválida.');
  if(!Number.isInteger(s.blackMarket.sales)||s.blackMarket.sales<0||!Number.isInteger(s.blackMarket.scamCount)||s.blackMarket.scamCount<0||typeof s.blackMarket.visited!=='boolean')throw new Error('Mercado clandestino inválido.');
  for(const item of ['baton','knife','firearm','ammo'])if(!Number.isInteger(s.blackMarket.stock[item])||s.blackMarket.stock[item]<0||s.blackMarket.stock[item]>20)throw new Error('Estoque clandestino inválido.');
  if(!['sol','nublado','chuva','temporal'].includes(s.weather.kind)||s.weather.rain>1||s.weather.temp>60||s.services.powerDistricts.length!==3||s.services.powerDistricts.some(v=>typeof v!=='boolean'))throw new Error('Ambiente invalido.');
  for(const key of ['trust','supply','security','economy'])if(s.town[key]>100)throw new Error('Comunidade invalida.');
  if(!Number.isInteger(s.town.treasury)||s.house.reinforced>3||s.house.watch>3)throw new Error('Recursos invalidos.');
  for(const k of ['lastWorkDay','lastSalvageDay','lastForestDay','lastDonationDay','lastPatrolDay','scamDay'])if(!Number.isInteger(s[k])||s[k]>s.day)throw new Error('Historico invalido.');
  for(const n of s.npcs){
    if(n.memory.some(v=>typeof v!=='string'))throw new Error('Memoria social invalida.');n.memory=n.memory.slice(-8);if(n.dir!==undefined&&(!Number.isInteger(n.dir)||n.dir<0||n.dir>3))throw new Error('Direcao invalida.');
    const c=n.combat;if(typeof c.alive!=='boolean'||typeof c.armed!=='boolean'||!['calmo','fugindo','hostil','morto'].includes(c.state)||c.injury>100||c.fear>100||c.aggression>1)throw new Error('Estado de conflito do morador inválido.');
  }
  for(let i=0;i<s.builds.length;i++)for(let j=i+1;j<s.builds.length;j++)if(s.builds[i].x===s.builds[j].x&&s.builds[i].y===s.builds[j].y)throw new Error('Construcoes sobrepostas.');
  const animalIds=s.chickens.map(c=>c.id);if(new Set(animalIds).size!==animalIds.length||animalIds.some(id=>!Number.isInteger(id)||id<1||id>s.serial||ids.includes(id))||s.chickens.some(c=>c.age<0||c.age>10000)||s.chickens.length&&!s.builds.some(b=>b.type==='coop'))throw new Error('Plantel inconsistente.');
  for(const e of s.journal)if(!Number.isInteger(e.day)||e.day<1||e.day>s.day||e.time<0||e.time>DAY||!['info','warning','danger','success','chapter'].includes(e.type))throw new Error('Registro invalido.');
  if(s.task){
    const {type,data,total}=s.task;
    if(s.phase!=='survival')throw new Error('Atividade fora da campanha.');
    const duration={cook:12,treat:8,work:45,patrol:30,salvage:18,build:RECIPES[data.type]?.time};
    if(type!=='sleep'&&total!==duration[type])throw new Error('Duracao inconsistente.');
    if(type==='cook'&&(!['meal','beanMeal','cookedEgg'].includes(data.item)||data.qty!==1)||type==='treat'&&(data.item!=='water'||data.qty!==2))throw new Error('Receita inconsistente.');
    if(type==='build'&&s.builds.some(b=>Math.abs(b.x-data.x)<(b.type==='coop'||data.type==='coop'?2:1)&&Math.abs(b.y-data.y)<(b.type==='coop'||data.type==='coop'?2:1)))throw new Error('Obra sobreposta.');
  }
  if(s.threat&&(s.threat.x<24||s.threat.x>71*TILE||s.threat.y<24||s.threat.y>53*TILE||s.threat.wait<0||s.threat.wait>20||!['aproximando','no portão','furtando'].includes(s.threat.state)||typeof s.threat.noticed!=='boolean'))throw new Error('Visitante invalido.');
  if(restorePosition(s,s.player)){
    s.journal.unshift({day:s.day,time:s.dayTime,type:'warning',text:'Posição recuperada para o ponto livre mais próximo no mesmo ambiente.'});s.journal=s.journal.slice(0,120);
  }
  for(const n of s.npcs)if(restorePosition(s,n,true)){n.route=[];delete n.routeKey;}
  function finiteTree(v){if(typeof v==='number'&&!Number.isFinite(v))throw new Error('Número inválido.');if(v&&typeof v==='object')for(const k of Object.keys(v)){if(['__proto__','prototype','constructor'].includes(k))throw new Error('Chave inválida.');finiteTree(v[k]);}}
  finiteTree(s);s.paused=false;s.player.moving=false;s.player.running=false;s.player.sleeping=s.task?.type==='sleep';s.notices=[];return s;
}
