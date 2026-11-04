import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
const built=spawnSync(process.execPath,['scripts/build.mjs'],{encoding:'utf8'});
assert.equal(built.status,0,built.stderr);

test('build e imports usam caminhos relativos válidos em subdiretório do GitHub Pages',async()=>{
  const html=await readFile('dist/index.html','utf8');assert.match(html,/apagao-build/);assert.doesNotMatch(html,/(src|href)=["']\//);
  const modules=['src/main.js','src/data.js','src/world.js','src/scenes/renderer.js','src/systems/simulation.js','src/systems/audio.js','src/save/storage.js'];
  for(const file of modules){const text=await readFile('dist/'+file,'utf8');for(const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)){assert.ok(match[1].startsWith('.'));const url=new URL(match[1],`https://example.test/repositorio/${file}`);assert.ok(url.pathname.startsWith('/repositorio/'));await readFile('dist/'+url.pathname.slice('/repositorio/'.length));}}
});
test('HTML publicado tem metadados sociais absolutos e imagem OG 1200×630 existente',async()=>{
  const html=await readFile('dist/index.html','utf8'),site=JSON.parse(await readFile('site.config.json','utf8'));
  const publicUrl=new URL(process.env.APAGAO_PUBLIC_URL||site.publicUrl);if(!publicUrl.pathname.endsWith('/'))publicUrl.pathname+='/';
  const imageUrl=new URL('public/social-preview.png',publicUrl);
  const meta=(property)=>html.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`, 'i'))?.[1];
  assert.equal(html.match(/<link rel="canonical"/g)?.length,1);
  assert.equal(meta('og:type'),'website');
  assert.equal(meta('og:title'),'APAGÃO: 30 DIAS — Você consegue sobreviver?');
  assert.equal(meta('og:description'),'A internet mundial acabou. Você tem 30 segundos para se preparar e 30 dias para sobreviver. Explore, plante, negocie e resista ao caos neste jogo brasileiro de sobrevivência!');
  assert.equal(meta('og:url'),publicUrl.href);
  assert.equal(meta('og:image'),imageUrl.href);
  assert.equal(meta('og:image:secure_url'),imageUrl.href);
  assert.equal(meta('og:image:type'),'image/png');
  assert.equal(meta('og:image:width'),'1200');
  assert.equal(meta('og:image:height'),'630');
  assert.equal(meta('og:image:alt'),'Arte em pixel art de Santa Aurora à noite, com casas, horta, galinhas e o título APAGÃO: 30 DIAS.');
  assert.equal(meta('og:site_name'),'APAGÃO: 30 DIAS');
  assert.equal(meta('og:locale'),'pt_BR');
  assert.equal(meta('twitter:card'),'summary_large_image');
  assert.equal(meta('twitter:title'),'APAGÃO: 30 DIAS — Você consegue sobreviver?');
  assert.equal(meta('twitter:description'),meta('og:description'));
  assert.equal(meta('twitter:image'),imageUrl.href);
  assert.equal(meta('twitter:image:alt'),meta('og:image:alt'));
  assert.match(html,/<html lang="pt-BR">/);
  assert.equal(new URL(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]).href,publicUrl.href);
  assert.doesNotMatch(html,/__APAGAO_[A-Z_]+__/);
  assert.equal(imageUrl.protocol,'https:');
  const png=await readFile('dist/public/social-preview.png');
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),1200);
  assert.equal(png.readUInt32BE(20),630);
  assert.ok(png.length<500_000);
});
test('service worker instala todos os recursos e atende cache sem rede, inclusive em subcaminho',async()=>{
  const source=await readFile('dist/sw.js','utf8'),origin='https://example.test/repositorio/',cache=new Map(),events={};
  const storage={open:async()=>({match:async r=>cache.get(typeof r==='string'?r:r.url||r.href)?.clone(),addAll:async paths=>{for(const p of paths){const key=new URL(p,origin).href,body=await readFile('dist/'+(p==='./'?'index.html':p.slice(2)));cache.set(key,new Response(body));}}}),keys:async()=>[],delete:async()=>true,match:async r=>cache.get(typeof r==='string'?r:r.url||r.href)?.clone()};
  vm.runInNewContext(source,{self:{location:{origin:'https://example.test',href:origin+'sw.js'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>events[name]=fn},caches:storage,URL,Response,fetch:async()=>{throw new Error('Sem rede');}});
  let pending;events.install({waitUntil:p=>pending=p});await pending;assert.ok(cache.size>=12);
  for(const resource of ['src/main.js','src/share.js','src/style.css','public/icon.svg','public/social-preview.png','src/systems/simulation.js']){
    let response;events.fetch({request:{method:'GET',url:origin+resource,mode:'cors'},respondWith:p=>response=p});const r=await response;assert.equal(r.status,200);assert.ok((await r.text()).length>0);
  }
  let navigation;events.fetch({request:{method:'GET',url:origin+'historias',mode:'navigate'},respondWith:p=>navigation=p});assert.match(await(await navigation).text(),/APAGÃO/);
});
