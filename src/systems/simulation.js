import { DAY, DAYS, MODES, ITEMS, NPCS, CROPS, RECIPES, ARCS, NARRATIVE, TILE, BUILDINGS } from '../data.js';
import { blocked, canBuild, insideBuilding, findPath } from '../world.js';

export const SAVE_VERSION=1;
const clamp=(v,a=0,b=100)=>Math.min(b,Math.max(a,v));
export function random(s){let t=s.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);s.rng=s.rng>>>0;return((t^t>>>14)>>>0)/4294967296;}
export function log(s,text,type='info'){s.journal.unshift({day:s.day,time:Math.floor(s.dayTime),text,type});s.journal=s.journal.slice(0,120);s.notices.push({text,type,id:++s.serial});s.notices=s.notices.slice(-5);}
export function createGame(seed=Date.now()>>>0,mode='normal'){
  const s={version:SAVE_VERSION,seed:seed>>>0,rng:seed>>>0,mode:MODES[mode]?mode:'normal',serial:0,saveRevision:0,phase:'prologue',prologue:30,day:1,dayTime:0,activeTime:0,simulationRemainder:0,paused:false,
    player:{x:23.5*TILE,y:24.7*TILE,dir:2,moving:false,running:false,health:100,food:100,water:100,energy:90,stress:10,exposure:0,sick:0,wound:0,cash:0,bank:150000,inventory:[],diet:[],lantern:false,battery:150,sleeping:false},
    storage:[],house:{locked:false,reinforced:0,watch:0,safeCash:0},weather:{kind:'sol',temp:27,rain:0},services:{power:true,water:true,powerDistricts:[true,true,true]},
    town:{trust:35,supply:100,security:65,treasury:500000,fair:false,population:20000,helped:0,economy:35},
    builds:[{id:'b1',type:'bed',x:21,y:15,crop:null,moisture:55,fertility:70,weeds:0,health:100},{id:'b2',type:'bed',x:23,y:15,crop:{kind:'lettuce',age:45},moisture:65,fertility:75,weeds:0,health:100}],
    chickens:[],npcs:[],journal:[],notices:[],task:null,threat:null,eventAt:130,lastWorkDay:0,lastSalvageDay:0,lastForestDay:0,lastDonationDay:0,lastPatrolDay:0,scamDay:0,
    stats:{food:0,water:0,trades:0,helped:0,eggs:0,harvests:0,events:0,chickens:0,distance:0,spent:0,earned:0},deathCause:'',ending:''};
  s.npcs=NPCS.map(n=>{const h=BUILDINGS.find(b=>b.id===n.home);return {...structuredClone(n),cash:n.cash*100,stock:Object.fromEntries(Object.entries(n.stock).map(([k,v])=>[k,Math.floor(v*MODES[s.mode].stock)])),x:(h.x+h.w/2)*TILE,y:(h.y+h.h+.7)*TILE,trust:35,state:'em casa',memory:[],needLevel:0,emotion:'apreensivo'};});
  add(s,'water',4,'storage');add(s,'canned',3,'storage');add(s,'rice',5,'storage');add(s,'beans',4,'storage');add(s,'fuel',5,'storage');add(s,'wood',12,'storage');add(s,'metal',5,'storage');add(s,'seed',3,'storage');add(s,'bread',2);add(s,'water',2);
  log(s,'06:00. Aviso urgente no celular: a conexão mundial será interrompida. Você tem 30 segundos. Vá ao caixa e ao mercado.');
  return s;
}
export const count=(s,item,where='inventory')=>(where==='storage'?s.storage:s.player.inventory).filter(b=>b.item===item).reduce((a,b)=>a+b.qty,0);
export const load=(s,field='weight')=>s.player.inventory.reduce((v,b)=>v+ITEMS[b.item][field]*b.qty,0);
export const capacity=(s,item,qty=1)=>load(s)+ITEMS[item].weight*qty<=22&&load(s,'volume')+ITEMS[item].volume*qty<=30;
export function add(s,item,qty=1,where='inventory',expiry=null){
  if(!ITEMS[item]||!Number.isInteger(qty)||qty<=0) return false;
  const target=where==='storage'?s.storage:s.player.inventory;
  const exp=expiry??(ITEMS[item].shelf?s.day+ITEMS[item].shelf:null);
  const b=target.find(b=>b.item===item&&b.expiry===exp);
  if(b)b.qty+=qty;else target.push({uid:++s.serial,item,qty,expiry:exp,condition:100});return true;
}
export function take(s,item,qty=1,where='inventory'){
  if(!Number.isInteger(qty)||qty<=0||count(s,item,where)<qty)return false;
  const target=where==='storage'?s.storage:s.player.inventory;
  const batches=target.filter(b=>b.item===item).sort((a,b)=>(a.expiry??1e9)-(b.expiry??1e9));
  for(const b of batches){const n=Math.min(b.qty,qty);b.qty-=n;qty-=n;if(!qty)break;}
  if(where==='storage')s.storage=target.filter(b=>b.qty>0);else s.player.inventory=target.filter(b=>b.qty>0);return true;
}
export const hour=s=>s.phase==='prologue'?6:(6+s.dayTime/DAY*24)%24;
export const isNight=s=>hour(s)>=20.4||hour(s)<6;
export const arc=s=>ARCS[Math.min(5,Math.floor((s.day-1)/5))];
export function price(s,n,item,selling=false){
  const base=ITEMS[item].price;
  const scarce=1+Math.max(0,40-(n.stock[item]||0))/100+Math.max(0,70-s.town.supply)/200;
  const relation=1-(n.trust-35)/500;
  const margin=n.personality==='oportunista'?1.45:1;
  return Math.max(1,Math.round(base*100*scarce*relation*margin*(selling?.52:1)));
}
export function withdraw(s,amount){
  if(s.phase!=='prologue')return fail('O caixa está sem conexão. O saldo digital permanece inacessível.');
  if(!Number.isInteger(amount)||amount<=0||amount>s.player.bank)return fail('Saldo insuficiente.');
  s.player.bank-=amount;s.player.cash+=amount;log(s,`Saque de ${(amount/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em espécie.`);return ok();
}
const ok=(message='Concluído.')=>({ok:true,message});const fail=message=>({ok:false,message});
export function trade(s,npcId,item,qty=1,sell=false){
  const n=s.npcs.find(n=>n.id===npcId);if(!n||!ITEMS[item]||!Number.isInteger(qty)||qty<1)return fail('Negociação inválida.');
  const amount=price(s,n,item,sell)*qty;
  if(sell){
    if(count(s,item)<qty)return fail('Você não tem essa quantidade.');
    if(!ITEMS[item].price||item==='raw'||item==='chemical')return fail('O comerciante não aceita água sem origem segura.');
    if(s.player.inventory.some(b=>b.item===item&&b.expiry!==null&&b.expiry<=s.day))return fail('Alimento vencido não pode ser vendido.');
    if(n.cash<amount)return fail('O comerciante não tem dinheiro suficiente em caixa.');
    take(s,item,qty);n.stock[item]=(n.stock[item]||0)+qty;n.cash-=amount;s.player.cash+=amount;s.stats.earned+=amount;
  }else{
    if((n.stock[item]||0)<qty)return fail('Estoque insuficiente.');
    if(s.player.cash<amount)return fail('Dinheiro em espécie insuficiente.');
    if(!capacity(s,item,qty))return fail('Mochila cheia: limite de 22 kg ou 30 L. Guarde recursos em casa.');
    n.stock[item]-=qty;n.cash+=amount;s.player.cash-=amount;s.stats.spent+=amount;add(s,item,qty);
  }
  s.stats.trades++;n.trust=clamp(n.trust+.4);n.memory.push(`${sell?'Compra':'Venda'} de ${qty} ${ITEMS[item].name}, dia ${s.day}`);n.memory=n.memory.slice(-8);
  return ok(`${sell?'Vendido':'Comprado'}: ${qty} × ${ITEMS[item].name}.`);
}
export function barter(s,npcId){
  const n=s.npcs.find(n=>n.id===npcId);if(!n)return fail('Morador não encontrado.');
  const offer=n.id==='celia'?{give:'egg',g:6,get:'rice',q:10}:{give:n.need,g:2,get:Object.keys(n.stock).find(k=>k!==n.need&&n.stock[k]>=2),q:2};
  if(!offer.get||count(s,offer.give)<offer.g||(n.stock[offer.get]||0)<offer.q)return fail('Faltam itens para esta troca.');
  if(load(s)-ITEMS[offer.give].weight*offer.g+ITEMS[offer.get].weight*offer.q>22||load(s,'volume')-ITEMS[offer.give].volume*offer.g+ITEMS[offer.get].volume*offer.q>30)return fail('Sem espaço para receber os itens.');
  take(s,offer.give,offer.g);n.stock[offer.give]=(n.stock[offer.give]||0)+offer.g;n.stock[offer.get]-=offer.q;add(s,offer.get,offer.q);n.trust=clamp(n.trust+3);s.town.trust=clamp(s.town.trust+.5);s.stats.trades++;return ok('Troca concluída, sem dinheiro.');
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
  add(s,b.item,qty,toStorage?'storage':'inventory',b.expiry);b.qty-=qty;
  if(toStorage)s.player.inventory=from.filter(b=>b.qty>0);else s.storage=from.filter(b=>b.qty>0);return ok();
}
export function startTask(s,type,duration,data={}){
  if(s.task)return fail('Conclua ou cancele a tarefa atual.');
  s.task={type,remaining:duration,total:duration,data};s.player.sleeping=type==='sleep';return ok('Atividade iniciada. O tempo continua passando.');
}
export function cancelTask(s){s.task=null;s.player.sleeping=false;return ok('Atividade cancelada. Materiais já usados não são devolvidos.');}
export function cook(s,item){
  if(!['rice','beans','egg'].includes(item))return fail('Receita indisponível.');
  if(s.task)return fail('Você já está ocupado.');
  if(count(s,item)<1||count(s,'water')<1||count(s,'fuel')<1)return fail('Leve o alimento, 1 L de água potável e 1 combustível na mochila.');
  const result=item==='egg'?'cookedEgg':item==='beans'?'beanMeal':'meal',qty=1;
  if(!capacity(s,result,qty))return fail('Reserve espaço na mochila antes de cozinhar.');
  take(s,item);take(s,'water');take(s,'fuel');return startTask(s,'cook',12,{item:result,qty});
}
export function treat(s){
  if(s.task)return fail('Você já está ocupado.');
  if(count(s,'raw')<2||count(s,'fuel')<1)return fail('Leve 2 L de água não tratada e 1 combustível. O filtro está na cozinha.');
  take(s,'raw',2);take(s,'fuel');return startTask(s,'treat',8,{item:'water',qty:2});
}
export function fill(s,source){
  if(source==='tap'&&!s.services.water)return fail('Sem pressão na rede. Tente o poço ou use sua reserva.');
  const item=source==='tap'?'water':'raw';if(!capacity(s,item))return fail('Mochila cheia.');add(s,item);return ok(source==='tap'?'1 L de água da rede armazenado em recipiente fechado.':'1 L coletado, ainda NÃO potável.');
}
export function construct(s,type,tx,ty){
  const r=RECIPES[type];if(!r)return fail('Construção inválida.');if(s.task)return fail('Você já está ocupado.');const error=canBuild(s,type,tx,ty);if(error)return fail(error);
  if(count(s,'wood')<r.wood||count(s,'metal')<r.metal)return fail('Leve os materiais na mochila.');
  take(s,'wood',r.wood);if(r.metal)take(s,'metal',r.metal);
  return startTask(s,'build',r.time,{type,x:tx,y:ty});
}
export function garden(s,id,action,kind='radish',seedling=false){
  const b=s.builds.find(b=>b.id===id&&b.type==='bed');if(!b)return fail('Canteiro indisponível.');
  if(action==='plant'){
    if(b.crop||!CROPS[kind])return fail('O canteiro já tem uma planta.');
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
  const n=s.npcs.find(n=>n.id===npcId);
  if(action==='donate'){
    if(s.lastDonationDay===s.day)return fail('Você já contribuiu hoje.');const item=n.need;if(!take(s,item,2))return fail(`Leve 2 × ${ITEMS[item].name}.`);
    n.stock[item]=(n.stock[item]||0)+2;n.needLevel=clamp(n.needLevel-25);n.trust=clamp(n.trust+10);s.town.trust=clamp(s.town.trust+4);s.town.supply=clamp(s.town.supply+2);s.town.economy=clamp(s.town.economy+3);s.lastDonationDay=s.day;s.stats.helped++;s.town.helped++;n.memory.push(`Recebeu ajuda no dia ${s.day}`);log(s,`${n.name} recebeu sua contribuição. A confiança da comunidade cresceu.`);return ok('Ajuda entregue.');
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
    if(b.type==='coop'){
      b.dirt=clamp((b.dirt||0)+s.chickens.length*.035);b.feed=b.feed||0;b.water=b.water||0;b.eggs=b.eggs||0;
      const fed=b.feed>=s.chickens.length*.12/DAY,watered=b.water>=s.chickens.length*.3/DAY;
      if(fed)b.feed=Math.max(0,b.feed-s.chickens.length*.12/DAY);if(watered)b.water=Math.max(0,b.water-s.chickens.length*.3/DAY);
      for(const c of s.chickens){c.health=clamp(c.health+(!fed||!watered||b.dirt>80?-.065:.02));if(fed&&watered&&c.health>60&&b.dirt<70){c.lay+=.75/DAY;if(c.lay>=1){c.lay--;b.eggs++;s.stats.eggs++;}}}
      const alive=s.chickens.filter(c=>c.health>0);if(alive.length!==s.chickens.length){log(s,'Uma galinha não resistiu à falta de cuidados.','danger');s.chickens=alive;}
    }
  }
  npcsStep(s);threatStep(s);
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
    const b=BUILDINGS.find(b=>b.id===n.home);let target;
    if(h>=20||h<7){n.state=h>=22||h<6?'dormindo':'em casa';target=[(b.x+b.w/2)*TILE,(b.y+b.h-1)*TILE];}
    else if(s.weather.kind==='temporal'){n.state='abrigando-se';target=[(b.x+b.w/2)*TILE,(b.y+b.h-1)*TILE];}
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
    for(const item of ['bread','fruit','rice','beans','water'])if(n.stock[item]>0)n.stock[item]=Math.max(0,n.stock[item]-1);
    n.needLevel=clamp(n.needLevel+7);n.emotion=n.needLevel>70?'preocupado':s.town.trust>60?'esperançoso':'apreensivo';
    if(n.id==='joao'){for(const [k,q]of Object.entries({egg:4,veg:4,rice:3,beans:2}))n.stock[k]=(n.stock[k]||0)+q;}
    if(n.id==='celia')n.stock.veg=(n.stock.veg||0)+2;
    if(s.town.fair&&n.id==='antonio'&&s.day%3===0){
      const joao=s.npcs.find(v=>v.id==='joao');for(const item of ['egg','veg','rice']){const q=Math.min(6,joao.stock[item]||0);const cost=q*ITEMS[item].price*60;if(n.cash>=cost){joao.stock[item]-=q;n.stock[item]=(n.stock[item]||0)+q;n.cash-=cost;joao.cash+=cost;}}
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
  const remembered=n.memory.length?` Lembro da nossa última negociação no dia ${n.memory.at(-1).match(/\d+/)?.[0]||s.day}.`:'';
  const lines={celia:s.day<6?'Trouxe umas mudas já crescidas. Semente precisa de tempo, viu?':'Não deixe o canteiro secar. E não viva só de folha: precisa de comida que sustente.',antonio:s.phase==='prologue'?'Vai querer levar o quê? Só dinheiro vivo, a rede já está oscilando.':`Vou trabalhar com o que tem. ${s.town.supply<60?'A reposição está difícil.':'Ainda tenho reserva no depósito.'}`,rafael:s.services.power?'Tem serviço de manutenção no mural. Pagam em cédulas.':'Luz não é internet. Hoje a falha é elétrica mesmo; vamos reparar o que der.',marina:s.player.sick?'Água segura e descanso são prioridade. Posso ajudar com os cuidados.':'Água do poço precisa de tratamento. Fervura não resolve contaminação química.',joao:'As aves precisam de água limpa, ração e abrigo. Uma galinha saudável não bota todo dia.',carlos:s.scamDay===s.day?'Não gostou da oferta? Tudo bem.':'Tenho uma oportunidade exclusiva para você. Melhor investigar antes de pagar.',beatriz:s.town.fair?'A feira está de pé. Obrigada por ajudar a manter o bairro unido.':'Se a gente juntar confiança e pequenos produtores, dá para organizar a feira.'};
  return `${lines[n.id]}${n.trust>55?' Você tem sido uma pessoa de confiança.':remembered}`;
}
export function buildAction(s,id,action){
  const b=s.builds.find(b=>b.id===id);if(!b)return fail('Objeto não encontrado.');
  if(action==='remove'){
    if(b.type==='coop'&&s.chickens.length)return fail('Não remova o abrigo com aves.');if(b.type==='bed'&&b.crop)return fail('Colha ou retire a planta primeiro.');
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
  const s=structuredClone(value);
  // A estrutura base evita carregar objetos incompletos e valores fora de tipo.
  const template=createGame(1,s.mode);
  function shape(v,t,path='save'){
    if(typeof t==='number'){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e12)throw new Error(`Valor inválido em ${path}.`);}
    else if(typeof t==='string'){if(typeof v!=='string'||v.length>2000)throw new Error(`Texto inválido em ${path}.`);}
    else if(typeof t==='boolean'){if(typeof v!=='boolean')throw new Error(`Estado inválido em ${path}.`);}
    else if(Array.isArray(t)){if(!Array.isArray(v)||v.length>500)throw new Error(`Lista inválida em ${path}.`);}
    else if(t!==null){if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(`Estrutura inválida em ${path}.`);for(const k of Object.keys(t))shape(v[k],t[k],`${path}.${k}`);}
  }
  shape(s,template);
  if(!MODES[s.mode]||!['prologue','survival','dead','won'].includes(s.phase)||!Number.isInteger(s.day)||s.day<1||s.day>30||s.dayTime>=600||s.prologue>30||s.simulationRemainder>=1)throw new Error('Relógio ou modo inválido.');
  for(const k of ['seed','rng','serial','saveRevision'])if(!Number.isInteger(s[k]))throw new Error('Identificador inválido.');
  if(s.seed>4294967295||s.rng>4294967295)throw new Error('Semente inválida.');
  for(const b of [...s.player.inventory,...s.storage]){
    if(!b||!ITEMS[b.item]||!Number.isInteger(b.qty)||b.qty<1||b.qty>10000||!Number.isInteger(b.uid)||b.uid<1||b.condition<0||b.condition>100||!(b.expiry===null||Number.isFinite(b.expiry)&&b.expiry>=0))throw new Error('Inventário inválido.');
  }
  const ids=[...s.player.inventory,...s.storage].map(b=>b.uid);if(new Set(ids).size!==ids.length||ids.some(id=>id>s.serial))throw new Error('Identificadores de itens inconsistentes.');
  for(const v of ['health','food','water','energy','stress','exposure','sick','wound'])if(s.player[v]>100)throw new Error('Indicador fora do limite.');
  if(s.player.x>72*TILE||s.player.y>54*TILE||!Number.isInteger(s.player.cash)||!Number.isInteger(s.player.bank)||s.player.bank>150000||!Number.isInteger(s.house.safeCash))throw new Error('Jogador inválido.');
  if(s.npcs.length!==NPCS.length||new Set(s.npcs.map(n=>n.id)).size!==NPCS.length)throw new Error('Moradores inválidos.');
  for(const n of s.npcs){const base=template.npcs.find(v=>v.id===n.id);if(!base)throw new Error('Morador desconhecido.');shape(n,base,'npc');for(const [k,q]of Object.entries(n.stock))if(!ITEMS[k]||!Number.isInteger(q)||q<0||q>100000)throw new Error('Estoque inválido.');if(!Number.isInteger(n.cash))throw new Error('Caixa inválido.');if(n.home!==base.home||n.need!==base.need||n.personality!==base.personality||n.trust>100||n.needLevel>100||n.x>72*TILE||n.y>54*TILE)throw new Error('Morador inválido.');for(const k of ['color','skin'])if(!/^#[a-f0-9]{6}$/i.test(n[k]))throw new Error('Aparência inválida.');if(n.work.length!==2||n.work.some((v,i)=>v!==base.work[i]))throw new Error('Rotina inválida.');if(n.route&&(!Array.isArray(n.route)||n.route.length>4000||n.route.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>2000))))throw new Error('Caminho inválido.');if(n.routeKey!==undefined&&typeof n.routeKey!=='string')throw new Error('Destino inválido.');}
  if(new Set(s.builds.map(b=>b.id)).size!==s.builds.length)throw new Error('Construções duplicadas.');
  for(const b of s.builds){if(!RECIPES[b.type]||typeof b.id!=='string'||!Number.isInteger(b.x)||!Number.isInteger(b.y)||b.x<19||b.x>27||b.y<10||b.y>16)throw new Error('Construção inválida.');if(b.type==='bed'){for(const key of ['moisture','fertility','weeds','health'])if(!Number.isFinite(b[key])||b[key]<0||b[key]>100)throw new Error('Solo inválido.');if(b.crop&&(!CROPS[b.crop.kind]||!Number.isFinite(b.crop.age)||b.crop.age<0||b.crop.age>400))throw new Error('Plantação inválida.');}}
  for(const b of s.builds){for(const k of ['liters','feed','water','eggs','dirt','ready','days'])if(b[k]!==undefined&&(!Number.isFinite(b[k])||b[k]<0||b[k]>10000))throw new Error('Recurso doméstico inválido.');for(const k of ['clean','filled'])if(b[k]!==undefined&&typeof b[k]!=='boolean')throw new Error('Manutenção inválida.');if(b.liters>60)throw new Error('Reservatório excedido.');}
  for(const c of s.chickens)if(!Number.isFinite(c.health)||c.health<0||c.health>100||!Number.isFinite(c.lay)||c.lay<0||c.lay>1||!Number.isFinite(c.age))throw new Error('Animal inválido.');
  if(s.chickens.length>4)throw new Error('Limite de animais excedido.');
  for(const e of s.journal)if(!e||typeof e.text!=='string'||!Number.isFinite(e.day)||!Number.isFinite(e.time))throw new Error('Diário inválido.');
  if(s.task&&(!['sleep','cook','treat','work','patrol','build','salvage'].includes(s.task.type)||!Number.isFinite(s.task.remaining)||s.task.remaining<=0||s.task.remaining>s.task.total||s.task.total>300||!s.task.data||typeof s.task.data!=='object'))throw new Error('Atividade inválida.');
  if(s.task){const {type,data}=s.task;if(['cook','treat'].includes(type)&&(!['meal','beanMeal','cookedEgg','water'].includes(data.item)||!Number.isInteger(data.qty)||data.qty<1||data.qty>2))throw new Error('Receita inválida.');if(type==='work'&&data.pay!==6500)throw new Error('Pagamento inválido.');if(type==='build'&&(!RECIPES[data.type]||!Number.isInteger(data.x)||!Number.isInteger(data.y)||data.x<19||data.x>27||data.y<10||data.y>16))throw new Error('Obra inválida.');if(type==='salvage'&&typeof data.forest!=='boolean')throw new Error('Coleta inválida.');}
  if(s.threat&&(!Number.isFinite(s.threat.x)||!Number.isFinite(s.threat.y)||!Number.isFinite(s.threat.wait)))throw new Error('Ocorrência inválida.');
  function finiteTree(v){if(typeof v==='number'&&!Number.isFinite(v))throw new Error('Número inválido.');if(v&&typeof v==='object')for(const k of Object.keys(v)){if(['__proto__','prototype','constructor'].includes(k))throw new Error('Chave inválida.');finiteTree(v[k]);}}
  finiteTree(s);s.paused=false;s.player.moving=false;s.player.running=false;s.notices=[];return s;
}
