import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'dist');
await mkdir(out,{recursive:true});
for(const p of ['src','public','index.html'])await cp(path.join(root,p),path.join(out,p),{recursive:true});
await writeFile(path.join(out,'index.html'),(await readFile(path.join(out,'index.html'),'utf8')).replace('<head>','<head>\n  <meta name="apagao-build" content="production">'));
async function files(dir){const a=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);a.push(...(e.isDirectory()?await files(p):[path.relative(out,p).split(path.sep).join('/')]));}return a;}
const assets=['./',...(await files(out)).filter(f=>f!=='sw.js').map(f=>'./'+f)];
const sources=await Promise.all(assets.filter(f=>f!=='./').map(f=>readFile(path.join(out,f))));
const { createHash }=await import('node:crypto');const hash=createHash('sha256');for(const s of sources)hash.update(s);const version=hash.digest('hex').slice(0,12);
const sw=`// Gerado pelo build. Cache integral e imutável por versão.
const PREFIX='apagao-scope-'+encodeURIComponent(new URL('./',self.location.href).pathname)+'-';
const CACHE=PREFIX+'${version}';
const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(hit=>hit||fetch(event.request).then(response=>{
    if(!response.ok)return response;
    return response;
  })).catch(()=>event.request.mode==='navigate'?caches.open(CACHE).then(cache=>cache.match(new URL('./',self.location.href))):Response.error()));
});
`;
await writeFile(path.join(out,'sw.js'),sw);
console.log(`Build estático: ${assets.length} recursos em dist/. Versão offline ${version}. Sem dependências externas.`);
