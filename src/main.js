import { ITEMS, CROPS, NPCS, RECIPES, MODES, DAY, TILE } from './data.js';
import { nearest, canBuild, insideBuilding } from './world.js';
import * as Sim from './systems/simulation.js';
import { Renderer, itemIcon } from './scenes/renderer.js';
import { updateMarkup } from './ui/dom.js';
import { createHUDMarkup, updateVitals, vitalUnitCount } from './ui/hud.js';
import { Sound } from './systems/audio.js';
import { saveGame, loadGame, exportSave, importSave } from './save/storage.js';
import { SITE_URL, SOCIAL_IMAGE_PATH } from './site-config.js';
import { GAME_SHARE_TEXT, platformShareUrl, copyText, resultShareText, resultImage, imageFile } from './share.js';

const $=id=>document.getElementById(id),canvas=$('world'),renderer=new Renderer(canvas),sound=new Sound(),joystick=$('joystick'),joystickKnob=$('joystick-knob');
const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v/100);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=Object.fromEntries(Object.keys(ITEMS).map(k=>[k,itemIcon(k)]));
const button=(text,act,cls='',extra='')=>`<button class="${cls}" data-act="${act}" ${extra}>${text}</button>`;
const shareIcon='<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .11.8L8.9 8.42a3 3 0 1 0 0 5.16l6.21 3.62a3 3 0 1 0 .99-1.7L9.9 11.88a3 3 0 0 0 0-1.76l6.2-3.62A3 3 0 0 0 18 8Z" fill="currentColor"/></svg>';
const itemImg=id=>`<img class="item-icon" src="${icon[id]}" alt="">`;
let state=null,saved=null,menu={type:'title'},keys=new Set(),placement=null,last=performance.now(),hudAt=0,autoAt=0,noticeId=0,lastPhase='',saving=null,lastDay=1,saveConflict=false,saveUnavailable=false,menuAt=0,shareReturnMenu='title',shareReturnAct=null;
const touchInputs=new Map();let joystickPointer=null;
function clearInputs(){
  keys.clear();touchInputs.clear();joystickPointer=null;joystickKnob.style.transform='translate(-50%, -50%)';
  $('touch-run').setAttribute('aria-pressed','false');
}
function inputDown(key){return keys.has(key)||[...touchInputs.values()].some(input=>input.has(key));}
function releaseTouchPointer(id){
  touchInputs.delete(id);
  if(joystickPointer===id){joystickPointer=null;joystickKnob.style.transform='translate(-50%, -50%)';}
  $('touch-run').setAttribute('aria-pressed',String([...touchInputs.values()].some(input=>input.has('shift'))));
}
let preferences={volume:.25,ambience:1,effects:1,reduced:false,scale:1};try{preferences={...preferences,...JSON.parse(localStorage.getItem('apagao-settings')||'{}')};}catch{}
preferences.volume=Math.max(0,Math.min(1,Number(preferences.volume)||0));preferences.scale=[.9,1,1.15].includes(preferences.scale)?preferences.scale:1;sound.volume=preferences.volume;document.documentElement.style.setProperty('--ui',preferences.scale);
for(const channel of ['ambience','effects']){preferences[channel]=Number.isFinite(preferences[channel])?Math.max(0,Math.min(1,preferences[channel])):1;sound[channel]=preferences[channel];}
function prefSave(){try{localStorage.setItem('apagao-settings',JSON.stringify(preferences));}catch{}}
function notify(text,type='info'){
  const div=document.createElement('div');div.className=`notice ${type}`;div.textContent=text;$('notifications').append(div);setTimeout(()=>div.remove(),6500);while($('notifications').children.length>4)$('notifications').firstChild.remove();if(type==='danger'||type==='warning')sound.alert();
}
function apply(result){if(result){notify(result.message,result.ok?'success':'warning');sound.click();}if(menu)renderMenu();updateHUD();}
function open(type,id=null){
  if(type==='share'||type==='share-result'){shareReturnMenu=menu?.type||(state?'pause':'title');shareReturnAct=document.activeElement?.dataset.act||null;}
  clearInputs();if(state)state.paused=['pause','settings','help','credits','confirm-new','new','tutorial','share','share-result'].includes(type);menu={type,id};renderMenu();$('overlay').querySelector('button:not(:disabled)')?.focus({preventScroll:true});
}
function returnFromShare(){const type=shareReturnMenu,act=shareReturnAct;open(type);if(act)$('overlay').querySelector(`[data-act="${act}"]`)?.focus({preventScroll:true});}
function close(){if(saveConflict){open('pause');return;}menu=null;updateMarkup($('overlay'),'');$('overlay').className='';if(state)state.paused=false;clearInputs();last=performance.now();updateHUD();canvas.focus({preventScroll:true});}
function panel(title,subtitle,content,wide=false){
  $('overlay').className=`overlay panel-overlay ${wide?'wide':''}`;
  updateMarkup($('overlay'),`<section class="panel" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="panel-head"><div><span class="eyebrow">SANTA AURORA · INTERIOR PAULISTA</span><h2>${esc(title)}</h2><p>${subtitle}</p></div>${button('×','close','close','aria-label="Fechar"')}</header><div class="panel-body">${content}</div><footer class="panel-foot"><span>${!state?'A HISTÓRIA AINDA NÃO COMEÇOU':state.paused?'TEMPO PAUSADO':'O TEMPO CONTINUA PASSANDO'}</span><span>ESC para fechar</span></footer></section>`);
}
function renderMenu(){
  if(!menu)return;const {type,id}=menu;
  if(type==='title'){
    $('overlay').className='overlay title-overlay';
    updateMarkup($('overlay'),`<section class="title-layout"><div class="brand-top"><span class="brand-mark">A / 30</span><span>UM JOGO DE SOBREVIVÊNCIA BRASILEIRO</span></div><div class="title-copy"><div class="eyebrow">SANTA AURORA, SÃO PAULO — 2026</div><h1>APAGÃO<span>30 DIAS</span></h1><div class="title-rule"></div><p>Trinta segundos para se preparar.<br>Trinta dias para descobrir do que você é capaz.</p><div class="title-actions">${button('Nova história <span>↗</span>','new','primary')}${button(saved?`Continuar · dia ${saved.day}`:'Continuar','continue','secondary',saved?'':'disabled')}${button('Como jogar','help','text-button')}${button(`${shareIcon}<span>Compartilhar jogo</span>`,'share','text-button share-title-action')}${button('Configurações','settings','text-button')}</div></div><footer class="title-footer"><span>SEM CONEXÃO. AINDA HUMANOS.</span><span>INCREMENTO JOGÁVEL 0.1 · ${button('Créditos','credits','inline')}</span></footer><div class="scene-caption"><span class="dot"></span> Santa Aurora <small>Uma cidade pequena. Escolhas que ficam.</small></div></section>`);
    return;
  }
  if(type==='share'){
    panel('Compartilhe APAGÃO: 30 DIAS','Desafie seus amigos a sobreviverem 30 dias sem internet!',`<div class="share-preview"><img src="${esc(SOCIAL_IMAGE_PATH)}" alt="Arte promocional de APAGÃO: 30 DIAS em pixel art" width="1200" height="630" decoding="async"><div><strong>APAGÃO: 30 DIAS</strong><p>A internet mundial acabou! Prepare-se em 30 segundos e sobreviva durante 30 dias neste jogo brasileiro de sobrevivência em Pixel Art.</p><a href="${esc(SITE_URL)}" target="_blank" rel="noopener noreferrer">${esc(SITE_URL)}</a></div></div><h3>COMPARTILHAR COM</h3><div class="share-grid">${[['WhatsApp','whatsapp'],['X / Twitter','x'],['Facebook','facebook'],['Telegram','telegram'],['LinkedIn','linkedin'],['Reddit','reddit']].map(([label,platform])=>button(label,`share-platform:${platform}`,'secondary')).join('')}</div><div class="share-actions">${button('Mais opções · compartilhar pelo dispositivo','share-native','primary')}${button('Copiar link','copy-link','secondary')}${button('Baixar imagem para compartilhar manualmente','download-preview','text-button')}</div><p class="muted share-note">O Instagram não oferece publicação automática pelo navegador. Use “Mais opções” quando disponível ou baixe a arte para publicar manualmente.</p>`);$('overlay').classList.add('share-overlay');$('overlay').querySelector('.share-preview img').addEventListener('error',()=>{const status=document.createElement('p');status.className='share-image-error';status.setAttribute('role','alert');status.textContent='A imagem promocional não carregou. Verifique sua conexão e tente novamente.';$('overlay').querySelector('.share-preview').append(status);},{once:true});return;
  }
  if(type==='share-result'){
    const dataUrl=resultImage(state);
    panel('Compartilhe seu resultado','Uma lembrança desta campanha, com estatísticas reais da partida.',`<img class="result-share-image" src="${dataUrl}" alt="Cartão de resultado desta campanha, gerado localmente"><div class="share-actions">${button('Compartilhar resultado','share-result-native','primary')}${button('Copiar link do jogo','copy-link','secondary')}${button('Salvar imagem do resultado','download-result','secondary')}</div><h3>OU COMPARTILHE COM</h3><div class="share-grid">${[['WhatsApp','whatsapp'],['X / Twitter','x'],['Facebook','facebook'],['Telegram','telegram'],['LinkedIn','linkedin'],['Reddit','reddit']].map(([label,platform])=>button(label,`share-result-platform:${platform}`,'secondary')).join('')}</div><p class="muted share-note">A imagem é criada neste dispositivo; nenhum save ou dado pessoal é enviado a um servidor.</p>`,true);$('overlay').classList.add('share-overlay');return;
  }
  if(type==='new'){
    panel('Uma cidade. Trinta dias.','Escolha o ritmo do desafio. A duração é igual em todos os modos.',`<div class="new-art"><span>06:00</span><p>Você acorda com uma última mensagem.<br><b>“Prepare-se imediatamente.”</b></p></div><label class="field">Dificuldade<select id="mode">${Object.entries(MODES).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('')}</select></label><p class="muted">Normal: primeira campanha. Difícil: estoques menores e maior consumo. Simulação: maior demanda de recursos, mantendo as simplificações documentadas.</p><label class="field">Semente da cidade<input id="seed" type="number" min="0" max="4294967295" value="${Date.now()>>>0}"></label><p class="muted">A mesma semente e as mesmas decisões reproduzem os acontecimentos.</p>${button('Conhecer os controles →','tutorial','primary full')}`,true);return;
  }
  if(type==='tutorial'){
    panel('Antes do silêncio','O cronômetro só começa quando você estiver pronto.',`<div class="tutorial-grid"><div><span class="step-number">01</span><h3>Corra até o caixa</h3><p>Você tem <b>R$ 1.500 no banco</b> e nenhum dinheiro em espécie. O banco fica à direita da sua casa.</p></div><div><span class="step-number">02</span><h3>Escolha suas reservas</h3><p>O mercado fica logo depois do banco. Compre com dinheiro vivo. As compras não pausam os 30 segundos.</p></div><div><span class="step-number">03</span><h3>Cuide do próximo dia</h3><p>Há uma reserva pequena no armário de casa. Use a torneira enquanto a rede funciona. Converse, trabalhe e planeje.</p></div></div>${controls()}<div class="callout">Cada dia dura 10 minutos ativos. Dormir consome tempo normal. Inventário e trocas mantêm o relógio; Esc e configurações pausam. A aba em segundo plano pausa automaticamente.</div>${button('Estou pronto · iniciar os 30 segundos','begin','primary full')}`,true);return;
  }
  if(type==='help'){
    panel('Como sobreviver','Explore, observe e construa uma rotina.',`${controls()}<div class="guide"><h3>O primeiro dia</h3><p>Entre em casa pela porta central. Fogão e filtro ficam à esquerda; cama e torneira, à direita. Transfira mantimentos do armário para a mochila. Consuma água e alimentos pelo inventário.</p><h3>Uma rotina possível</h3><p>Reserve cerca de 2,5 L de água e 2.200 kcal por dia, mais ao correr e trabalhar. Cozinhe arroz e feijão, varie a alimentação e descanse na cama. O quintal fica ao norte da casa; contorne a lateral para chegar lá.</p><h3>Trocas e trabalho</h3><p>Procure os moradores e pressione E. Use Comprar/Vender e o escambo. O mural do depósito paga uma jornada por dia com verba finita. Poço, lenha caída e materiais reaproveitáveis oferecem alternativas.</p><h3>Água, plantações e aves</h3><p>A chuva só enche reservatórios instalados. O filtro e fogão tratam água com risco microbiológico, com custo de combustível. Água quimicamente suspeita é recusada. Regue os canteiros, retire ervas e respeite o crescimento em dias. Galinhas adultas precisam de galinheiro, ração, água limpa e higiene.</p><h3>Conflitos e consequências</h3><p>X ou o botão de toque inicia uma agressão somente contra um morador próximo e à sua frente. Equipe itens pela mochila. Pessoas reagem de formas diferentes; testemunhas podem fugir, ferimentos persistem e a confiança, os preços e o acesso às trocas se deterioram. O mercado clandestino de Carlos surge mais tarde, é opcional e pode ser um golpe. As armas são apenas elementos ficcionais, sem detalhes técnicos.</p><h3>Segurança e progresso</h3><p>Tranque a porta do lado de fora ou dentro com E; destranque antes de passar. Rondas, iluminação e reforços dissuadem visitantes. Vença ao completar o dia 30 vivo. Faça exportações do progresso: limpar dados do navegador apaga o salvamento local.</p></div>`,true);return;
  }
  if(type==='settings'){
    panel('Configurações','Preferências salvas neste navegador.',`<label class="field">Volume geral <input id="volume" type="range" min="0" max="100" value="${preferences.volume*100}"></label><label class="field">Ambiente <input id="ambience" type="range" min="0" max="100" value="${preferences.ambience*100}"></label><label class="field">Efeitos <input id="effects" type="range" min="0" max="100" value="${preferences.effects*100}"></label><label class="check"><input id="reduced" type="checkbox" ${preferences.reduced?'checked':''}> Reduzir chuva, partículas e oscilação das árvores</label><label class="field">Tamanho da interface<select id="ui-scale"><option value="0.9" ${preferences.scale===.9?'selected':''}>Compacto</option><option value="1" ${preferences.scale===1?'selected':''}>Padrão</option><option value="1.15" ${preferences.scale===1.15?'selected':''}>Ampliado</option></select></label><p class="muted">Todo alerta sonoro importante também aparece em texto. Movimento: WASD ou setas. Controles de toque em telas pequenas.</p>${button('Aplicar preferências','apply-settings','primary full')}`);return;
  }
  if(type==='credits'){
    panel('Feito para um mundo offline','APAGÃO: 30 DIAS · incremento 0.1',`<div class="guide"><h3>Santa Aurora é fictícia</h3><p>Uma história alternativa sobre recursos, vínculos e escolhas. Desligar a internet não derruba automaticamente a eletricidade ou a rede de água.</p><h3>Arte e som originais</h3><p>Pixel art desenhada em código e áudio sintetizado com Web Audio. Sem fontes, imagens, músicas ou serviços externos durante a partida.</p><h3>Referências de simulação</h3><p>Ministério da Saúde: cuidados com água para consumo humano. Embrapa: hortaliças e produção de ovos. Fontes, valores e simplificações estão em docs/REFERENCIAS.md.</p><p>Esta versão já permite uma campanha com sistemas integrados. O acabamento e a profundidade ainda estão em desenvolvimento.</p></div>`);return;
  }
  if(type==='pause'){
    panel('Um momento de silêncio',`Dia ${String(state.day).padStart(2,'0')} · ${clock()} · ${esc(Sim.arc(state))}`,` ${saveConflict?`<div class="callout warning"><p>Outra aba salvou uma versão diferente. Exporte esta partida antes de carregar o progresso mais recente.</p>${button('Carregar progresso mais recente','continue','secondary full')}</div>`:''}<div class="pause-summary"><div><strong>${money(state.player.cash)}</strong><span>em espécie</span></div><div><strong>${Math.round(state.town.trust)} / 100</strong><span>confiança</span></div><div><strong>${Math.floor(state.activeTime/60)} min</strong><span>tempo ativo</span></div></div><div class="menu-stack">${button('Retomar a história','close','primary')}${button('Salvar agora','save','secondary')}${button(`${shareIcon}<span>Compartilhar jogo</span>`,'share','secondary share-button')}${button('Exportar progresso · JSON','export','secondary')}${button('Importar progresso','import','secondary')}${button('Configurações','settings','secondary')}${button('Como jogar','help','secondary')}${button('Voltar ao início · salvar e sair','title','text-button')}</div><p class="muted">Salvamento automático a cada 20 segundos ativos. O navegador pode apagar dados locais; exporte uma cópia para guardar o progresso.</p>`);return;
  }
  if(type==='inventory'||type==='storage'){
    const storage=type==='storage';
    const rows=(list,stored=false)=>list.length?list.map(b=>{const d=ITEMS[b.item],bad=b.condition<40||(b.expiry!==null&&b.expiry<=state.day);
      const weapon=['baton','knife','firearm'].includes(b.item);
      return `<div class="item-row ${bad?'spoiled':''}">${itemImg(b.item)}<div class="item-info"><b>${esc(d.name)}${!stored&&state.player.weapon===b.item?' · equipado':''}</b><small>${b.qty} un. · ${(d.weight*b.qty).toFixed(1)} kg${b.expiry?` · ${bad?'VENCIDO':`validade: dia ${Math.floor(b.expiry)}`}`:''}${b.item==='firearm'?` · ${Sim.count(state,'ammo')} munição`:''}</small><span>${esc(d.desc)}</span></div><div class="row-actions">${stored?button('Levar',`transfer:${b.uid}:out`,'tiny'):weapon?button(state.player.weapon===b.item?'Equipado':'Equipar',`equip:${b.item}`,'tiny',state.player.weapon===b.item?'disabled':''):((d.kcal||d.drink||b.item==='meds'||b.item==='battery')&&!d.cook?button(bad?'Consumir deteriorado':d.drink?'Beber':'Usar',`consume:${b.uid}`,'tiny',b.item==='chemical'?'disabled':''):'')} ${button('Descartar',`discard:${b.uid}:${stored?'storage':'inventory'}`,'tiny subtle')}</div></div>`;}).join(''):'<p class="empty">Nada guardado aqui.</p>';
    panel(storage?'Reservas de casa':'Sua mochila',`${Sim.load(state).toFixed(1)} / 22 kg · ${Sim.load(state,'volume').toFixed(1)} / 30 L · ${money(state.player.cash)} em espécie`,`${state.player.diet.length?`<p class="muted">Diversidade recente: ${new Set(state.player.diet).size} alimentos diferentes. Condição: ${state.player.sick>0?'mal-estar gastrointestinal':state.player.wound>0?'ferimentos leves':'sem doença ativa'}.</p>`:''}${!storage&&state.player.weapon!=='none'?button('Guardar equipamento','equip:none','secondary full'):''}<h3>MOCHILA</h3>${rows(state.player.inventory)}${storage?`<h3>ARMÁRIO · GELADEIRA ${state.services.power?'LIGADA':'SEM ENERGIA'}</h3>${rows(state.storage,true)}<div class="callout">Dinheiro guardado: ${money(state.house.safeCash)}<div class="row-actions">${button('Guardar todas as cédulas','cash-in','tiny')}${button('Levar todas as cédulas','cash-out','tiny')}</div></div>`:''}`,true);return;
  }
  if(type==='map'){
    panel('Santa Aurora','Seu ponto em laranja · moradores em amarelo · o tempo continua passando.',`<canvas id="minimap" width="864" height="648" aria-label="Mapa de Santa Aurora"></canvas><div class="map-legend"><span>QUINTAL: ao norte de casa</span><span>FEIRA: ao sul da praça</span><span>POÇO: leste da fonte</span><span>LENHA: bosque nordeste</span></div>`,true);renderer.minimap($('minimap'),state);return;
  }
  if(type==='journal'){
    panel('Diário de um mundo offline',`Semente ${state.seed} · ${esc(Sim.arc(state))}`,`<div class="town-stats"><span>Confiança <b>${Math.round(state.town.trust)}</b></span><span>Abastecimento <b>${Math.round(state.town.supply)}</b></span><span>Segurança <b>${Math.round(state.town.security)}</b></span><span>Feira <b>${state.town.fair?'ativa':'em organização'}</b></span></div><div class="journal">${state.journal.map(e=>`<article class="${esc(e.type)}"><small>DIA ${String(e.day).padStart(2,'0')} · ${timeOf(e.time)}</small><p>${esc(e.text)}</p></article>`).join('')}</div>`,true);return;
  }
  if(type==='trade'||type==='npc'){
    const n=state.npcs.find(n=>n.id===id);const sell=menu.sell||false;
    if(n.combat?.alive===false){panel(n.name,'Confiança rompida',`<p class="callout warning">Esta pessoa morreu. A cidade continua vivendo as consequências.</p>`,true);return;}
    const stock=sell?[...new Set(state.player.inventory.map(b=>b.item))].filter(k=>ITEMS[k].price):Object.keys(n.stock).filter(k=>n.stock[k]>0);
    const give=n.id==='celia'?'egg':n.need,g=n.id==='celia'?6:2,get=n.id==='celia'?'rice':Object.keys(n.stock).find(k=>k!==n.need&&n.stock[k]>=2),q=n.id==='celia'?10:2;
    const marketPrices={baton:5500,knife:12000,firearm:65000,ammo:1600};
    const blackMarket=n.id==='carlos'&&state.day>=8?`<div class="callout warning"><b>Mercado clandestino · ofertas inteiramente ficcionais</b><p>Procedência não verificada. Uma compra de arma de fogo pode ser um golpe; qualquer confronto traz riscos graves. Nada aqui é necessário para vencer.</p>${Object.entries(marketPrices).map(([item,cost])=>`<div class="trade-row"><div><b>${esc(ITEMS[item].name)}</b><small>Estoque: ${state.blackMarket.stock[item]} · recurso abstrato de jogo</small></div><strong>${money(cost)}</strong>${button('Comprar',`black-market:${item}`,'tiny',!state.blackMarket.stock[item]||state.player.cash<cost?'disabled':'')}</div>`).join('')}</div>`:'';
    panel(n.name,`${esc(n.job)} · ${esc(n.state)} · confiança ${Math.round(n.trust)} · caixa ${money(n.cash)}`,`<div class="dialogue"><span class="portrait" style="--shirt:${n.color};--skin:${n.skin}"></span><p>“${esc(Sim.dialogue(state,n))}”</p></div><div class="tabs">${button('Comprar','buy-tab',!sell?'active':'')}${button('Vender','sell-tab',sell?'active':'')}<span>Seu dinheiro: <b>${money(state.player.cash)}</b></span></div><div class="trade-list">${stock.map(k=>{const qty=sell?Sim.count(state,k):n.stock[k],p=Sim.price(state,n,k,sell);return `<div class="trade-row">${itemImg(k)}<div><b>${esc(ITEMS[k].name)}</b><small>${sell?'Na mochila':'Estoque'}: ${qty} · ${ITEMS[k].weight} kg/un.</small></div><strong>${money(p)}</strong>${button(sell?'Vender':'Levar',`trade:${id}:${k}:1:${sell?'sell':'buy'}`,'tiny')}${button('×3',`trade:${id}:${k}:3:${sell?'sell':'buy'}`,'tiny subtle')}</div>`;}).join('')||'<p class="empty">Nenhum item disponível.</p>'}</div><div class="callout"><b>Escambo</b><p>${g} × ${esc(ITEMS[give].name)} por ${q} × ${esc(ITEMS[get]?.name||'indisponível')}.</p>${button('Propor troca',`barter:${id}`,'tiny')}${button(`Ajudar · 2 × ${esc(ITEMS[n.need].name)}`,`donate:${id}`,'tiny subtle')}</div>${n.id==='joao'?button('Negociar uma galinha · R$ 85','chicken-buy','secondary full'):''}${n.id==='beatriz'?button(state.town.fair?'Feira organizada':'Organizar feira · 45 de confiança','fair','secondary full'):''}${n.id==='carlos'&&state.scamDay!==state.day?`<div class="callout warning"><b>Oferta sem procedência: “água especial”, 2 L por R$ 12.</b><div class="row-actions">${button('Investigar lacre e origem','scam-inspect','tiny')}${button('Aceitar o risco e pagar','scam-buy','tiny subtle')}</div></div>`:''}${blackMarket}`,true);return;
  }
  if(type==='atm'){
    panel('Caixa eletrônico',state.phase==='prologue'?'Última conexão com o banco.':'SEM CONEXÃO · OPERAÇÕES INDISPONÍVEIS',`<div class="atm-screen"><small>SALDO DIGITAL</small><strong>${money(state.player.bank)}</strong><p>Em espécie: ${money(state.player.cash)}</p></div><div class="menu-stack">${[50000,100000,150000].map(v=>button(`Sacar ${money(Math.min(v,state.player.bank))}`,`withdraw:${Math.min(v,state.player.bank)}`,'secondary',state.phase!=='prologue'||!state.player.bank?'disabled':'')).join('')}</div><p class="muted">Após o desligamento, este saldo não poderá ser sacado ou transferido.</p>`);return;
  }
  if(type==='kitchen'){
    panel('Cozinha e filtro','Preparo custa tempo, água e combustível. Tudo precisa estar na mochila.',`<div class="recipe-list">${['rice','beans','egg'].map(k=>`<div class="recipe">${itemImg(k)}<div><h3>${esc(ITEMS[k].name)}</h3><p>1 porção + 1 L de água potável + 1 combustível · 12 segundos ativos</p></div>${button('Cozinhar',`cook:${k}`,'tiny')}</div>`).join('')}</div><div class="callout"><h3>Filtrar e ferver</h3><p>2 L de água não tratada + 1 combustível · 8 segundos ativos. Modela filtração e 5 minutos de fervura simulada, com recipiente limpo e fechado.</p><p>Este processo trata risco microbiológico de origem conhecida. Água com suspeita química é recusada.</p>${button('Tratar 2 litros','treat','primary')}</div>${button('Abrir mochila','inventory','secondary full')}`,true);return;
  }
  if(type==='bed'){
    panel('Um pouco de descanso','O relógio mantém a mesma velocidade enquanto você dorme.',`<p class="big-value">${Math.round(state.player.energy)}<small> / 100 energia</small></p><p>8 horas simuladas = 200 segundos ativos. A fome e a sede continuam progredindo. Descanse com reservas e uma porta trancada.</p><div class="menu-stack">${button('Descansar · 8 horas simuladas','sleep:200','primary')}${button('Cochilar · 2 horas simuladas','sleep:50','secondary')}</div>`);return;
  }
  if(type==='tap'||type==='well'){
    panel(type==='tap'?'Água da rede':'Poço da praça',type==='tap'?(state.services.water?'Rede com pressão e controle sanitário.':'Abastecimento temporariamente interrompido.'):'Origem conhecida, mas sem controle microbiológico.',`<div class="water-illustration"><i></i><span>${type==='tap'?'REDE MUNICIPAL':'ÁGUA NÃO TRATADA'}</span></div><p>${type==='tap'?'Você guarda a água em recipiente fechado da mochila. A disponibilidade da rede é independente da internet.':'Use para irrigação ou leve ao filtro e fogão. Não beba diretamente. O jogo separa esta água da água potável.'}</p>${button('Armazenar 1 litro',`fill:${type}`,'primary full')}`);return;
  }
  if(type==='door'){
    panel('Sua casa',`Porta ${state.house.locked?'trancada':'destrancada'} · reforços ${state.house.reinforced} · vigilância ${state.house.watch} dias`,`${button(state.house.locked?'Destrancar a porta':'Trancar a porta','lock','primary full')}<p>Tranque antes de descansar ou sair. Reforços, iluminação e vigilância reduzem oportunidades de furto. Nenhuma pessoa aparece dentro da casa sem antes chegar à entrada.</p>${state.threat?button('Conversar da entrada e pedir ajuda','deter','secondary full'):''}${button('Planejar construções','build-menu','secondary full')}`);return;
  }
  if(type==='build-menu'){
    panel('O quintal pode sustentar o amanhã','Leve os materiais na mochila. Escolha uma construção e clique em uma célula do quintal.',`<p class="muted">Quintal ao norte da casa. Vá pela lateral para alcançar os canteiros.</p><div class="recipe-list">${Object.entries(RECIPES).map(([k,r])=>`<div class="recipe"><div class="construction-icon ${k}"></div><div><h3>${r.name}</h3><p>${r.wood} madeira · ${r.metal} ferragens · ${r.time} s de trabalho</p></div>${button('Posicionar',`place:${k}`,'tiny')}</div>`).join('')}</div>`,true);return;
  }
  if(type==='build'){
    const b=state.builds.find(b=>b.id===id);if(!b){close();return;}
    if(b.type==='bed'){
      const d=b.crop?CROPS[b.crop.kind]:null;
      panel('Canteiro',`Umidade ${Math.round(b.moisture)}% · fertilidade ${Math.round(b.fertility)}% · vitalidade ${Math.round(b.health)}%`,`${d?`<div class="crop-status"><h3>${d.name}</h3><p>${b.crop.age.toFixed(1)} / ${d.days} dias de desenvolvimento</p><div class="progress"><i style="width:${Math.min(100,b.crop.age/d.days*100)}%"></i></div>${button('Colher',`garden:${id}:harvest`,'primary full')}</div>`:`<h3>Solo preparado · escolha o plantio</h3><div class="crop-grid">${Object.entries(CROPS).map(([k,c])=>button(`${c.name}<small>${c.days} dias</small>`,`plant:${id}:${k}`,'crop-choice')).join('')}</div>${button('Plantar muda de alface · 45 dias já desenvolvidos',`seedling:${id}`,'secondary full')}`}<div class="row-actions spaced">${button('Regar · 1 L',`garden:${id}:water`,'tiny')}${button(`Remover ervas · ${Math.round(b.weeds)}%`,`garden:${id}:weed`,'tiny')}${button('Aplicar composto',`garden:${id}:compost`,'tiny')}</div><p class="muted">A chuva altera a umidade. Sem boas condições, o desenvolvimento desacelera. As espécies de ciclo longo não amadurecem dentro dos 30 dias.</p>${button('Remover canteiro vazio · recuperar metade da madeira',`remove:${id}`,'text-button')}`,true);return;
    }
    if(b.type==='coop'&&b!==state.builds.find(v=>v.type==='coop')){panel('Abrigo desativado','As aves vivem no primeiro galinheiro.',`<p>Esta estrutura antiga foi preservada. Os cuidados e ovos ficam no abrigo ativo.</p>${button('Desmontar estrutura vazia',`remove:${id}`,'secondary full')}`);return;}
    if(b.type==='coop'){
      panel('Galinheiro',`${state.chickens.length} / 4 aves · ${b.eggs||0} ovos · higiene ${100-Math.round(b.dirt||0)}%`,`<div class="pause-summary"><div><strong>${(b.feed||0).toFixed(2)} kg</strong><span>ração</span></div><div><strong>${(b.water||0).toFixed(1)} L</strong><span>água</span></div><div><strong>${state.chickens.length?Math.round(state.chickens.reduce((a,c)=>a+c.health,0)/state.chickens.length):'—'}</strong><span>saúde média</span></div></div><p>Por ave/dia: cerca de 120 g de ração e 300 mL de água. Produção média modelada: até 0,75 ovo por dia saudável.</p><div class="menu-stack">${button('Abastecer ração · 1 kg','chicken-feed','secondary')}${button('Abastecer água · 1 L','chicken-water','secondary')}${button('Limpar abrigo','chicken-clean','secondary')}${button('Coletar ovos','chicken-eggs','primary')}</div>${button('Remover abrigo vazio',`remove:${id}`,'text-button')}`);return;
    }
    if(b.type==='barrel'){
      panel('Reservatório coberto',`${(b.liters||0).toFixed(1)} / 60 litros · água não potável`,`<p>Uma calha de 4 m² conduz chuva ao recipiente coberto. A capacidade é limitada e o volume só aumenta com precipitação.</p>${button('Retirar 1 L não tratado',`draw:${id}`,'primary full')}${button('Inspecionar e limpar calha e tampa',`clean-build:${id}`,'secondary full')}${button('Remover · água restante será perdida',`remove:${id}`,'text-button')}`);return;
    }
    if(b.type==='compost'){
      panel('Composteira',`${b.ready||0} doses prontas · ${b.filled?`${b.days||0} / 7 dias de maturação`:'aguardando resíduos'}`,`<p>Adicione 2 porções de vegetais ou frutas. A maturação é simplificada e produz duas doses para melhorar a fertilidade.</p>${button('Adicionar resíduos',`compost:${id}`,'primary full')}${button('Remover',`remove:${id}`,'text-button')}`);return;
    }
    if(b.type==='crate'){menu={...menu,type:'storage'};renderMenu();return;}
    panel(RECIPES[b.type].name,'Construção doméstica.',`<p>Reforços iluminam o quintal e reduzem oportunidades de furto. Cercas demarcam áreas e bloqueiam a passagem.</p>${button('Desmontar · recuperar madeira',`remove:${id}`,'secondary full')}`);return;
  }
  if(type==='work'||type==='patrol'||type==='fair'||type==='clinic'||type==='farm'||type==='salvage'||type==='forest'){
    const info={work:['Mural do depósito','Há trabalho de manutenção e organização. Uma jornada disponível por dia.','45 segundos ativos · R$ 65 · recursos e confiança para o bairro.',button('Aceitar jornada','work','primary full')],patrol:['Cuidar de quem está perto','O posto organiza turnos e avisos entre os vizinhos.','30 segundos ativos · vigilância por 3 dias · aumenta segurança e confiança.',button('Organizar vigilância','patrol','primary full')],fair:['Feira comunitária',state.town.fair?'A feira está funcionando.':'Beatriz espera confiança suficiente para reunir os produtores.','Ajude moradores, trabalhe no depósito e organize vigilância. Precisa de 45 de confiança.',button('Organizar a feira','fair','primary full')],clinic:['Unidade de saúde','Marina oferece cuidados dentro dos recursos do posto.','R$ 10 ou apoio solidário para confiança acima de 55. Consome 1 kit do estoque.',button('Receber cuidados','clinic','primary full')],farm:['Sítio do João','O sítio ainda produz. Animais adultos têm custo e exigem abrigo.','Galinhas: R$ 85 cada. Até 4 por galinheiro.',button('Negociar produtos','open-joao','secondary full')+button('Comprar galinha adulta','chicken-buy','primary full')],salvage:['Reaproveitar materiais','Há madeira e ferragens no terreno, em quantidade limitada.','18 segundos ativos · 2 madeiras + 2 ferragens · uma coleta por dia.',button('Separar materiais','salvage','primary full')],forest:['Bosque de Santa Aurora','Recolha apenas lenha caída.','18 segundos ativos · 3 madeiras · uma coleta por dia.',button('Recolher lenha','forest','primary full')]}[type];
    panel(info[0],info[1],`<p>${info[2]}</p>${info[3]}`);return;
  }
  if(type==='ending'){
    const won=state.phase==='won';
    panel(won?state.ending:'A cidade continua. Sua história termina.',won?'Trinta dias se passaram. O mundo não voltou ao que era. Mas você continua aqui.':`Causa: ${esc(state.deathCause)}`,`<div class="ending-banner">${won?'UM NOVO AMANHECER':'O ÚLTIMO SILÊNCIO'}</div><div class="stats-grid">${Object.entries({'Dias completos':won?30:state.day-1,'Tempo ativo':`${Math.floor(state.activeTime/60)} min`,'Porções consumidas':state.stats.food,'Água usada (L)':state.stats.water,'Dinheiro restante':money(state.player.cash+state.house.safeCash),'Negociações':state.stats.trades,'Pessoas ajudadas':state.stats.helped,'Galinhas criadas':state.stats.chickens,'Ovos produzidos':state.stats.eggs,'Colheitas':state.stats.harvests,'Ocorrências':state.stats.events,'Reputação':Math.round(state.town.trust)}).map(([k,v])=>`<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div><div class="menu-stack">${button('Compartilhar resultado','share-result','primary')}${button(`${shareIcon}<span>Compartilhar jogo</span>`,'share','secondary share-button')}${button('Exportar esta história','export','secondary')}${button('Começar outra história','new','secondary')}${button('Voltar ao início','title','text-button')}</div>`,true);return;
  }
}
function controls(){return `<div class="controls"><div><kbd>W A S D</kbd><span>mover</span></div><div><kbd>SHIFT</kbd><span>correr</span></div><div><kbd>E</kbd><span>interagir</span></div><div><kbd>X</kbd><span>atacar</span></div><div><kbd>I</kbd><span>mochila</span></div><div><kbd>M</kbd><span>mapa</span></div><div><kbd>J</kbd><span>diário</span></div><div><kbd>B</kbd><span>construir</span></div><div><kbd>F</kbd><span>lanterna</span></div><div><kbd>ESC</kbd><span>pausar</span></div></div><p class="touch-help">No celular: mova pelo joystick, segure ⇧ para correr, use E para a ação próxima, ⚔ para atacar quando disponível e ▣ para abrir a mochila.</p>`;}
let draft={mode:'normal',seed:1};
async function persist(manual=false){
  if(saving){await saving;return persist(manual);}if(!state)return true;if(saveConflict)return false;if(saveUnavailable&&!manual)return false;
  const target=state,snapshot=structuredClone(target);
  saving=(async()=>{try{const write=saveGame(snapshot,{replace:saveUnavailable});await write;saveUnavailable=false;target.saveRevision=Math.max(target.saveRevision,snapshot.saveRevision);target.saveToken=snapshot.saveToken;if(state===target)saved=snapshot;if(manual)notify('Progresso salvo neste navegador.','success');return true;}catch(e){if(e.name==='SaveConflict'){saveConflict=true;open('pause');}notify(e.message,'warning');return false;}})();
  const result=await saving;saving=null;return result;
}
async function shareNatively(withResult=false){
  if(!navigator.share){notify('O compartilhamento nativo não está disponível neste navegador. Use as redes sociais ou copie o link.','warning');return;}
  const text=withResult?resultShareText(state).replace(`\n${SITE_URL}`,''):GAME_SHARE_TEXT;
  const data={title:'APAGÃO: 30 DIAS',text,url:SITE_URL};
  try{
    if(withResult){const file=imageFile(resultImage(state));if(navigator.canShare?.({files:[file]}))data.files=[file];}
    await navigator.share(data);notify('Compartilhamento concluído.','success');
  }
  catch(error){
    if(error.name==='AbortError'){notify('Compartilhamento cancelado.');return;}
    if(error.name==='NotAllowedError'){notify('O navegador bloqueou o compartilhamento. Tente copiar o link.','warning');return;}
    notify(`Não foi possível compartilhar: ${error.message}`,'warning');
  }
}
async function downloadImage(source,filename){
  const response=await fetch(source);
  if(!response.ok)throw new Error(`O servidor respondeu ${response.status}.`);
  const blob=await response.blob(),bytes=new Uint8Array(await blob.slice(0,8).arrayBuffer());
  const png=blob.type==='image/png'&&[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value);
  const jpeg=blob.type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!png&&!jpeg)throw new Error('O arquivo recebido não é uma imagem PNG ou JPEG válida.');
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function action(act){
  sound.init();sound.click();const [a,b,c,d,e]=act.split(':');
  if(a==='close'){if(menu?.type==='share'||menu?.type==='share-result'){returnFromShare();return;}if(!state){open('title');return;}if(['won','dead'].includes(state.phase)){open('ending');return;}if(menu?.type==='tutorial'){open('new');return;}close();return;}
  if(a==='share'||a==='share-result'){open(a);return;}
  if(a==='copy-link'){try{await copyText(SITE_URL);notify('Link copiado.','success');}catch(error){notify(error.message,'warning');}return;}
  if(a==='share-native'){await shareNatively();return;}
  if(a==='share-result-native'){await shareNatively(true);return;}
  if(a==='share-platform'||a==='share-result-platform'){
    const text=a==='share-result-platform'?resultShareText(state):GAME_SHARE_TEXT;
    window.open(platformShareUrl(b,text),'_blank','noopener,noreferrer');return;
  }
  if(a==='download-preview'){try{await downloadImage(SOCIAL_IMAGE_PATH,'apagao-30-dias.png');notify('Arte promocional baixada.','success');}catch(error){notify(`Não foi possível baixar a arte promocional: ${error.message}`,'warning');}return;}
  if(a==='download-result'){try{await downloadImage(resultImage(state),'apagao-resultado.png');notify('Imagem do resultado salva neste dispositivo.','success');}catch(error){notify(`Não foi possível salvar a imagem do resultado: ${error.message}`,'warning');}return;}
  if(a==='new'){if(state&&['prologue','survival'].includes(state.phase))await persist();open('new');return;}
  if(a==='tutorial'){draft={mode:$('mode').value,seed:Math.max(0,Math.min(4294967295,Number($('seed').value)||0))>>>0};open('tutorial');return;}
  if(a==='begin'){if(saving)await saving;const fresh=Sim.createGame(draft.seed,draft.mode);try{await saveGame(fresh,{replace:true});saveUnavailable=false;saved=structuredClone(fresh);}catch(e){saveUnavailable=true;notify(`O salvamento falhou: ${e.message} A partida pode continuar; use Exportar progresso ou tente Salvar agora.`, 'warning');}state=fresh;saveConflict=false;noticeId=0;lastPhase='prologue';lastDay=1;autoAt=0;close();updateHUD();return;}
  if(a==='continue'){const latest=await loadGame();if(latest){saved=latest;state=Sim.validateSave(saved);autoAt=state.activeTime;saveConflict=false;saveUnavailable=false;lastPhase=state.phase;lastDay=state.day;noticeId=state.serial;close();if(['won','dead'].includes(state.phase))open('ending');notify('História retomada. O tempo passou apenas durante a partida.','success');}return;}
  if(a==='title'){if(!await persist())return;state=null;placement=null;renderer.place=null;open('title');updateHUD();return;}
  if(['help','settings','credits','pause','inventory','map','journal','build-menu'].includes(a)){open(a);return;}
  if(a==='apply-settings'){preferences.volume=Number($('volume').value)/100;for(const channel of ['ambience','effects']){preferences[channel]=Number($(channel).value)/100;sound[channel]=preferences[channel];}preferences.reduced=$('reduced').checked;preferences.scale=Number($('ui-scale').value);sound.volume=preferences.volume;document.documentElement.style.setProperty('--ui',preferences.scale);prefSave();state?open('pause'):open('title');return;}
  if(a==='save'){await persist(true);return;}if(a==='export'){if(state)exportSave(state);return;}if(a==='import'){$('import-file').click();return;}
  if(!state||!['prologue','survival'].includes(state.phase))return;
  let r;
  switch(a){
    case 'interact':interact();return;
    case 'withdraw':r=Sim.withdraw(state,Number(b));break;
    case 'buy-tab':menu.sell=false;renderMenu();return;
    case 'sell-tab':menu.sell=true;renderMenu();return;
    case 'trade':r=Sim.trade(state,b,c,Number(d),e==='sell');break;
    case 'black-market':r=Sim.buyBlackMarket(state,b);break;
    case 'equip':r=Sim.equipWeapon(state,b);break;
    case 'attack':r=Sim.attack(state);break;
    case 'barter':r=Sim.barter(state,b);break;
    case 'donate':r=Sim.community(state,'donate',b);break;
    case 'consume':r=Sim.consume(state,Number(b));break;
    case 'transfer':r=Sim.transfer(state,Number(b),c==='in');break;
    case 'discard':r=Sim.discard(state,Number(b),c);break;
    case 'cash-in':r=Sim.bankHome(state);break;
    case 'cash-out':r=Sim.bankHome(state,false);break;
    case 'cook':r=Sim.cook(state,b);if(r.ok)close();break;
    case 'treat':r=Sim.treat(state);if(r.ok)close();break;
    case 'sleep':r=Sim.startTask(state,'sleep',Number(b));if(r.ok)close();break;
    case 'fill':r=Sim.fill(state,b);break;
    case 'lock':if(!state.house.locked&&Math.abs(state.player.x-23.5*TILE)<18&&Math.abs(state.player.y-24*TILE)<10){r={ok:false,message:'Dê um passo para dentro ou para fora antes de trancar a porta.'};}else{state.house.locked=!state.house.locked;r={ok:true,message:state.house.locked?'Porta trancada.':'Porta destrancada.'};}break;
    case 'lantern':state.player.lantern=!state.player.lantern&&state.player.battery>0;r={ok:true,message:state.player.lantern?'Lanterna ligada. Pilhas consumidas apenas à noite.':'Lanterna desligada.'};break;
    case 'place':placement=b;close();notify('Escolha uma célula do quintal com o mouse. Clique para construir; Esc cancela.');return;
    case 'garden':r=Sim.garden(state,b,c);break;
    case 'plant':r=Sim.garden(state,b,'plant',c);break;
    case 'seedling':r=Sim.garden(state,b,'plant','lettuce',true);break;
    case 'chicken-buy':r=Sim.livestock(state,'buy');break;
    case 'chicken-feed':r=Sim.livestock(state,'feed');break;
    case 'chicken-water':r=Sim.livestock(state,'water');break;
    case 'chicken-clean':r=Sim.livestock(state,'clean');break;
    case 'chicken-eggs':r=Sim.livestock(state,'eggs');break;
    case 'remove':r=Sim.buildAction(state,b,'remove');if(r.ok)close();break;
    case 'draw':r=Sim.buildAction(state,b,'draw');break;
    case 'clean-build':r=Sim.buildAction(state,b,'clean');break;
    case 'compost':r=Sim.buildAction(state,b,'compost');break;
    case 'work':r=Sim.community(state,'work');if(r.ok)close();break;
    case 'patrol':r=Sim.community(state,'patrol');if(r.ok)close();break;
    case 'fair':r=Sim.community(state,'fair');break;
    case 'clinic':r=Sim.treatClinic(state);break;
    case 'salvage':r=Sim.salvage(state);if(r.ok)close();break;
    case 'forest':r=Sim.salvage(state,true);if(r.ok)close();break;
    case 'open-joao':open('trade','joao');return;
    case 'scam-inspect':r=Sim.scam(state,'inspect');break;
    case 'scam-buy':r=Sim.scam(state,'buy');break;
    case 'cancel-task':r=Sim.cancelTask(state);break;
    case 'deter':if(state.threat){state.threat=null;state.player.stress=Math.max(0,state.player.stress-3);r={ok:true,message:'Você conversou da entrada. A pessoa se afastou.'};}break;
  }
  apply(r);
}
function interact(){
  if(!state||placement)return;if(state.task){notify('Você está ocupado. Cancele a atividade para sair.','warning');return;}
  const n=nearest(state);if(!n){notify('Aproxime-se de uma porta, objeto ou morador.');return;}
  const map={shop:'trade',npc:'trade'};open(map[n.kind]||n.kind,n.kind==='shop'?n.trader:n.kind==='build'?n.build.id:n.id);menu.anchor=n;
}
function timeOf(t){const minutes=(360+Math.floor(t/DAY*1440))%1440;return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
function clock(){return state.phase==='prologue'?'06:00':timeOf(state.dayTime);}
function updateHUD(){
  const on=!!state;for(const id of ['hud','toolbar','objectives'])$(id).hidden=!on;$('touch').hidden=!on||!!menu||!matchMedia('(pointer:coarse)').matches;
  if(!on){$('context').hidden=true;$('countdown').hidden=true;$('touch-attack').hidden=true;return;}
  const p=state.player;
  const hud=$('hud');
  if(!hud.dataset.ready){
    updateMarkup(hud,createHUDMarkup(vitalUnitCount()));
    hud.dataset.ready='true';
  }
  const prologue=state.phase==='prologue';
  const setText=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
  setText(hud.querySelector('[data-hud-day]'),prologue?'PRÓLOGO':`DIA ${String(state.day).padStart(2,'0')}`);
  setText(hud.querySelector('.game-hud__clock-value'),prologue?`00:${String(Math.ceil(state.prologue)).padStart(2,'0')}`:clock());
  setText(hud.querySelector('#money'),money(p.cash));
  const weatherName=`${state.weather.kind.toUpperCase()} · ${state.weather.temp}°`;
  const services=`${state.services.power?'LUZ ✓':'LUZ ×'} · ${state.services.water?'ÁGUA ✓':'ÁGUA ×'}`;
  setText(hud.querySelector('.game-hud__weather'),`${weatherName} · ${services}`);
  updateVitals(hud,p,vitalUnitCount());
  $('touch-attack').hidden=!Sim.nearestCombatTarget(state);
  $('countdown').hidden=!prologue||!!menu;
  if(prologue)updateMarkup($('countdown'),`<span>A CONEXÃO TERMINA EM</span><strong class="${state.prologue<10?'urgent':''}">00:${String(Math.ceil(state.prologue)).padStart(2,'0')}</strong>`);
  $('objectives').classList.toggle('prologue',prologue);
  const movementHelp=matchMedia('(pointer:coarse)').matches?'Joystick mover · ⇧ correr · E ação · ⚔ atacar':'WASD mover · Shift correr · E interagir · X atacar';
  updateMarkup($('objectives'),prologue?`<span class="eyebrow">OS ÚLTIMOS 30 SEGUNDOS</span><p class="${p.bank<150000?'done':''}">01 &nbsp; Saque dinheiro no banco →</p><p class="${state.stats.trades?'done':''}">02 &nbsp; Escolha reservas no mercado →</p><small>${movementHelp}</small>`:`<span class="eyebrow">${esc(Sim.arc(state))}</span><p>${state.town.fair?'A feira está funcionando.':state.day<6?'Cuide de hoje. Prepare o amanhã.':'Ajude a organizar a feira.'}</p><small>Confiança ${Math.round(state.town.trust)} · ${insideBuilding(p.x,p.y)?.name||'Santa Aurora'}</small>`);
  updateMarkup($('toolbar'),`<div class="toolbar-actions">${button('<kbd>I</kbd> Mochila','inventory')}${button('<kbd>M</kbd> Mapa','map')}${button('<kbd>J</kbd> Diário','journal')}${button('<kbd>B</kbd> Construir','build-menu')}${button(`<kbd>F</kbd> ${p.lantern?'Lanterna ligada':'Lanterna'}`,'lantern')}</div><div class="toolbar-right"><span>${Sim.load(state).toFixed(1)} / 22 kg</span><span>ESTRESSE ${Math.round(p.stress)} · EXPOSIÇÃO ${Math.round(p.exposure)}</span><span id="save-status">LOCAL</span></div>`);
  const n=nearest(state);$('context').hidden=!!menu||(!n&&!state.task&&!placement);
  const interactionLabel=n?({npc:'Conversar',shop:'Comprar',door:'Entrar',build:'Cuidar',atm:'Sacar',bed:'Descansar',kitchen:'Cozinhar',tap:'Água',well:'Água'}[n.kind]||'Interagir'):'Interagir';
  $('touch-interact').querySelector('span').textContent=interactionLabel;
  $('touch-interact').setAttribute('aria-label',n?`${interactionLabel}: ${n.name}`:'Interagir com o alvo próximo');
  if(state.task){updateMarkup($('context'),`<div class="task"><span>${({sleep:'Descansando',cook:'Cozinhando',treat:'Filtrando e fervendo',work:'Trabalhando',patrol:'Organizando vigilância',build:'Construindo',salvage:'Recolhendo materiais'})[state.task.type]} · ${Math.ceil(state.task.remaining)} s</span><div class="progress"><i style="width:${(1-state.task.remaining/state.task.total)*100}%"></i></div>${button('Cancelar','cancel-task','tiny')}</div>`);}
  else if(placement)updateMarkup($('context'),`<kbd>CLIQUE</kbd> Posicionar ${RECIPES[placement].name} <small>Esc cancela</small>`);
  else if(n)updateMarkup($('context'),`${button(`<kbd>E</kbd> ${esc(n.name)}`,'interact','context-button')}`);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&!b.disabled)action(b.dataset.act).catch(err=>{console.error(err);notify('Não foi possível concluir a ação. Seu progresso atual foi mantido.','warning');});});
document.addEventListener('keydown',e=>{
  if(e.key==='Tab'&&menu){const controls=[...$('overlay').querySelectorAll('button:not(:disabled),input,select')].filter(el=>el.offsetParent!==null);if(controls.length){const index=controls.indexOf(document.activeElement),next=(index+(e.shiftKey?-1:1)+controls.length)%controls.length;e.preventDefault();controls[next].focus();}return;}
  if(e.target.matches('input,select')&&e.key!=='Escape')return;
  if(e.target.closest('button')&&[' ','Enter'].includes(e.key))return;
  let key=e.key.toLowerCase();const arrows={arrowup:'w',arrowdown:'s',arrowleft:'a',arrowright:'d'};key=arrows[key]||key;
  if(['w','a','s','d','x',' ','escape','shift'].includes(key))e.preventDefault();
  if(e.repeat)return;
  if(key==='escape'){if(menu?.type==='share'||menu?.type==='share-result'){returnFromShare();return;}if(state&&['won','dead'].includes(state.phase)){open('ending');return;}if(placement){placement=null;renderer.place=null;notify('Construção cancelada.');return;}if(menu){if(state&&menu.type==='pause')close();else if(state)open('pause');else open('title');}else if(state)open('pause');return;}
  if(menu||saveConflict)return;
  keys.add(key);
  const shortcuts={e:'interact',x:'attack',i:'inventory',m:'map',j:'journal',b:'build-menu',f:'lantern'};if(shortcuts[key])action(shortcuts[key]);
});
document.addEventListener('keyup',e=>{const arrows={arrowup:'w',arrowdown:'s',arrowleft:'a',arrowright:'d'};keys.delete(arrows[e.key.toLowerCase()]||e.key.toLowerCase());});
window.addEventListener('blur',()=>{clearInputs();if(state&&['prologue','survival'].includes(state.phase)&&!state.paused)open('pause');});
window.addEventListener('orientationchange',clearInputs);
document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden&&state){clearInputs();state.paused=true;persist();if(['prologue','survival'].includes(state.phase))open('pause');}});
// Best effort only: closing a tab must never bypass revision checks.
window.addEventListener('pagehide',()=>{if(state&&!saveConflict)void persist();});
canvas.addEventListener('pointermove',e=>{
  if(!placement||!state)return;const r=canvas.getBoundingClientRect(),x=Math.floor(((e.clientX-r.left)/r.width*canvas.width+renderer.camera.x)/TILE),y=Math.floor(((e.clientY-r.top)/r.height*canvas.height+renderer.camera.y)/TILE);renderer.place={x,y,valid:!canBuild(state,placement,x,y)};
});
canvas.addEventListener('pointerdown',e=>{
  if(menu||!placement||!state)return;
  const r=canvas.getBoundingClientRect(),x=Math.floor(((e.clientX-r.left)/r.width*canvas.width+renderer.camera.x)/TILE),y=Math.floor(((e.clientY-r.top)/r.height*canvas.height+renderer.camera.y)/TILE);
  const result=Sim.construct(state,placement,x,y);apply(result);if(result.ok){placement=null;renderer.place=null;}
});
function joystickMove(e){
  if(e.pointerId!==joystickPointer)return;
  const r=joystick.getBoundingClientRect(),radius=Math.min(r.width,r.height)*.36,dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),distance=Math.hypot(dx,dy),factor=distance>radius?radius/distance:1,x=dx*factor,y=dy*factor;
  joystickKnob.style.transform=`translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  const nx=x/radius,ny=y/radius,dead=.2,threshold=.34,active=new Set();
  if(Math.hypot(nx,ny)>=dead){if(nx<=-threshold)active.add('a');if(nx>=threshold)active.add('d');if(ny<=-threshold)active.add('w');if(ny>=threshold)active.add('s');}
  touchInputs.set(e.pointerId,active);
}
joystick.addEventListener('pointerdown',e=>{if(menu||joystickPointer!==null)return;e.preventDefault();joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);joystickMove(e);});
joystick.addEventListener('pointermove',joystickMove);
for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>releaseTouchPointer(e.pointerId));
for(const b of document.querySelectorAll('[data-key]')){
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(menu)return;b.setPointerCapture(e.pointerId);touchInputs.set(e.pointerId,new Set([b.dataset.key]));});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>releaseTouchPointer(e.pointerId));
}
const runButton=$('touch-run');
runButton.addEventListener('pointerdown',e=>{e.preventDefault();if(menu)return;runButton.setPointerCapture(e.pointerId);touchInputs.set(e.pointerId,new Set(['shift']));runButton.setAttribute('aria-pressed','true');});
for(const event of ['pointerup','pointercancel','lostpointercapture'])runButton.addEventListener(event,e=>releaseTouchPointer(e.pointerId));
$('touch-interact').addEventListener('click',interact);
$('import-file').addEventListener('change',async e=>{
  const file=e.target.files[0];try{const imported=await importSave(file);if(saving)await saving;await saveGame(imported,{replace:true});state=imported;saveConflict=false;saveUnavailable=false;autoAt=state.activeTime;placement=null;renderer.place=null;saved=structuredClone(state);noticeId=state.serial;lastPhase=state.phase;lastDay=state.day;close();if(['won','dead'].includes(state.phase))open('ending');else open('pause');notify('Progresso importado e validado.','success');}catch(err){notify(`Importação recusada: ${err.message}`,'warning');}finally{e.target.value='';}
});
function frame(now){
  sound.ambientEnabled=!!state&&!state.paused&&['prologue','survival'].includes(state.phase);
  const dt=Math.max(0,(now-last)/1000);last=now;
  if(state){
    if(menu?.anchor&&!Sim.playerCanReach(state,menu.anchor)){close();notify('A interação terminou: o alvo se afastou ou há uma parede no caminho.');}
    const phase=state.phase;
    if(!menu&&!saveConflict)Sim.move(state,(inputDown('d')?1:0)-(inputDown('a')?1:0),(inputDown('s')?1:0)-(inputDown('w')?1:0),inputDown('shift'),dt);
    else{state.player.moving=false;state.player.running=false;}
    if(!saveConflict)Sim.advance(state,dt);
    if(state.phase!==lastPhase){
      lastPhase=state.phase;
      if(state.phase==='survival'){
        close();const div=document.createElement('div');div.className='chapter-card';div.innerHTML='<small>30 SEGUNDOS DEPOIS</small><strong>DIA 1</strong><span>O mundo ficou offline.</span>';$('game').append(div);setTimeout(()=>div.remove(),3600);sound.alert();persist();
      }
      if(['won','dead'].includes(state.phase)){clearInputs();open('ending');persist();}
    }
    if(lastDay!==state.day){lastDay=state.day;if(menu&&!['settings','new','tutorial'].includes(menu.type))renderMenu();persist();}
    for(const n of state.notices)if(n.id>noticeId){noticeId=n.id;notify(n.text,n.type);}
    if(state.activeTime-autoAt>=20){autoAt=state.activeTime;persist();}
    if(!state.paused&&['survival','prologue'].includes(phase)){if(state.player.moving)sound.step(now);sound.ambient(now,Sim.isNight(state),state.weather.rain);}
  }
  renderer.draw(state,now,preferences.reduced);
  if(now-hudAt>150){hudAt=now;updateHUD();}
  if(now-menuAt>1000){menuAt=now;if(menu&&['inventory','storage','trade','npc','journal','build','coop','garden','barrel','compost'].includes(menu.type))renderMenu();if(menu?.type==='map')renderer.minimap($('minimap'),state);}
  requestAnimationFrame(frame);
}
try{saved=await loadGame();}catch(err){notify(`Não foi possível ler o progresso: ${err.message} Você pode importar uma cópia.`, 'warning');}
renderMenu();requestAnimationFrame(frame);
if('serviceWorker'in navigator&&document.querySelector('meta[name="apagao-build"]')){
  document.body.dataset.offline='installing';
  navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{document.body.dataset.offline='ready';notify('Jogo instalado no cache local. Esta versão está disponível sem conexão.','success');}).catch(()=>{document.body.dataset.offline='unavailable';notify('Cache offline indisponível. A partida continua funcionando online.','warning');});
}
