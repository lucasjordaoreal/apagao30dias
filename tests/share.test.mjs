import test from 'node:test';
import assert from 'node:assert/strict';
import { SITE_URL } from '../src/site-config.js';
import { GAME_SHARE_TEXT, WHATSAPP_SHARE_TEXT, X_SHARE_TEXT, platformShareUrl, resultShareText, imageFile } from '../src/share.js';

test('social share targets use only the explicit official game URL',()=>{
  const expected='https://apagao.netlify.app/';
  assert.equal(SITE_URL,expected);
  const targets={
    whatsapp:['api.whatsapp.com','/send','text'],
    x:['twitter.com','/intent/tweet','url'],
    facebook:['www.facebook.com','/sharer/sharer.php','u'],
    telegram:['t.me','/share/url','url'],
    linkedin:['www.linkedin.com','/sharing/share-offsite/','url'],
    reddit:['www.reddit.com','/submit','url']
  };
  for(const [platform,[host,path,param]] of Object.entries(targets)){
    const url=new URL(platformShareUrl(platform));
    assert.equal(url.hostname,host);
    assert.equal(url.pathname,path);
    if(platform==='whatsapp')assert.ok(url.searchParams.get(param).includes(expected));
    else assert.equal(url.searchParams.get(param),expected);
  }
  const x=new URL(platformShareUrl('x'));
  assert.match(x.searchParams.get('text'),/30 segundos.*30 dias/s);
  assert.match(new URL(platformShareUrl('whatsapp')).searchParams.get('text'),/A internet mundial acabou!.*Plante/s);
  assert.equal(WHATSAPP_SHARE_TEXT,GAME_SHARE_TEXT);
  assert.match(GAME_SHARE_TEXT,/proteja sua casa/);
  assert.match(X_SHARE_TEXT,/30 segundos.*30 dias/s);
  assert.throws(()=>platformShareUrl('unknown'),/desconhecida/);
  assert.equal(GAME_SHARE_TEXT.includes(expected),false);
  for(const platform of Object.keys(targets)){
    const url=new URL(platformShareUrl(platform,`Mensagem de resultado\nhttps://untrusted.invalid/`));
    assert.doesNotMatch(url.href,/untrusted\.invalid/);
    assert.ok(Object.values(Object.fromEntries(url.searchParams)).every(value=>!value.includes('untrusted.invalid')));
    if(platform==='whatsapp')assert.ok(url.searchParams.get('text').includes(expected));
    else assert.equal(url.searchParams.get(targets[platform][2]),expected);
  }
});

test('result messages use campaign statistics and do not include save contents',()=>{
  const state={phase:'dead',day:17,deathCause:'Desidratação',ending:'',player:{cash:125000},house:{safeCash:5000},stats:{helped:3,harvests:4,eggs:7},journal:[{text:'local'}]};
  const text=resultShareText(state);
  assert.match(text,/CHEGUEI AO DIA 17, COM 16 DIAS COMPLETOS/);
  assert.match(text,/Desidratação/);
  assert.match(text,/Pessoas ajudadas: 3 · Colheitas: 4/);
  assert.match(text,/R\$\s*1\.300,00/);
  assert.doesNotMatch(text,/local/);
  assert.match(platformShareUrl('x',text),/twitter\.com\/intent\/tweet/);
  assert.match(new URL(platformShareUrl('x',text)).searchParams.get('text'),/CHEGUEI AO DIA 17/);
  assert.equal(new URL(platformShareUrl('x',text)).searchParams.get('text').includes(new URL(SITE_URL).href),false);
  assert.match(resultShareText({...state,phase:'won',ending:'Autossuficiente'}),/EU SOBREVIVI AOS 30 DIAS!.*Perfil: Autossuficiente/s);
});

test('result image data converts to a named PNG file for native share',()=>{
  const file=imageFile('data:image/png;base64,iVBORw0KGgo=','resultado.png');
  assert.equal(file.name,'resultado.png');
  assert.equal(file.type,'image/png');
  assert.equal(file.size,8);
});
