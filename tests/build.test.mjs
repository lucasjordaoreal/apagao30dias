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
test('service worker instala todos os recursos e atende cache sem rede, inclusive em subcaminho',async()=>{
  const source=await readFile('dist/sw.js','utf8'),origin='https://example.test/repositorio/',cache=new Map(),events={};
  const storage={open:async()=>({match:async r=>cache.get(typeof r==='string'?r:r.url||r.href)?.clone(),addAll:async paths=>{for(const p of paths){const key=new URL(p,origin).href,body=await readFile('dist/'+(p==='./'?'index.html':p.slice(2)));cache.set(key,new Response(body));}}}),keys:async()=>[],delete:async()=>true,match:async r=>cache.get(typeof r==='string'?r:r.url||r.href)?.clone()};
  vm.runInNewContext(source,{self:{location:{origin:'https://example.test',href:origin+'sw.js'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>events[name]=fn},caches:storage,URL,Response,fetch:async()=>{throw new Error('Sem rede');}});
  let pending;events.install({waitUntil:p=>pending=p});await pending;assert.ok(cache.size>=12);
  for(const resource of ['src/main.js','src/style.css','public/icon.svg','src/systems/simulation.js']){
    let response;events.fetch({request:{method:'GET',url:origin+resource,mode:'cors'},respondWith:p=>response=p});const r=await response;assert.equal(r.status,200);assert.ok((await r.text()).length>0);
  }
  let navigation;events.fetch({request:{method:'GET',url:origin+'historias',mode:'navigate'},respondWith:p=>navigation=p});assert.match(await(await navigation).text(),/APAGÃO/);
});
