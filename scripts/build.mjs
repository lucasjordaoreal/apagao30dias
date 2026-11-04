import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { SITE_URL, SOCIAL_IMAGE_URL } from '../src/site-config.js';
const root=process.cwd(),out=path.join(root,'dist');
await mkdir(out,{recursive:true});
for(const p of ['src','public','index.html'])await cp(path.join(root,p),path.join(out,p),{recursive:true});
if(SITE_URL!=='https://apagao.netlify.app/'||new URL(SITE_URL).protocol!=='https:')throw new Error('A URL pública oficial deve ser definida em src/site-config.js.');
const publicUrl=SITE_URL,socialImageUrl=SOCIAL_IMAGE_URL;
const socialImagePath=path.join(out,new URL(socialImageUrl).pathname.replace(/^\/+/,''));
const socialImage=await readFile(socialImagePath);
if(socialImage.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||socialImage.readUInt32BE(16)!==1200||socialImage.readUInt32BE(20)!==630){
  throw new Error('public/social-preview.png precisa ser PNG 1200×630.');
}
for(const file of ['index.html']){
  let contents=await readFile(path.join(out,file),'utf8');
  contents=contents.replaceAll('__APAGAO_PUBLIC_URL__',publicUrl).replaceAll('__APAGAO_SOCIAL_IMAGE__',socialImageUrl);
  if(/__APAGAO_[A-Z_]+__/.test(contents))throw new Error(`Configuração pública não resolvida em ${file}.`);
  if(file==='index.html')contents=contents.replace('<head>','<head>\n  <meta name="apagao-build" content="production">');
  await writeFile(path.join(out,file),contents);
}
async function files(dir){const a=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);a.push(...(e.isDirectory()?await files(p):[path.relative(out,p).split(path.sep).join('/')]));}return a;}
const assets=['./',...(await files(out)).filter(f=>f!=='sw.js').map(f=>'./'+f)];
const obsoleteDomain=['iridescent-griffin','56c8ea'].join('-')+'.netlify.app';
const sources=await Promise.all(assets.map(f=>readFile(path.join(out,f==='./'?'index.html':f.slice(2)))));
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
for(const file of await files(out)){
  if(/\.(?:html|js|css|json|svg|webmanifest|txt)$/i.test(file)&& (await readFile(path.join(out,file),'utf8')).includes(obsoleteDomain)){
    throw new Error(`Domínio obsoleto encontrado em dist/${file}.`);
  }
}
console.log(`Build estático: ${assets.length} recursos em dist/. Versão offline ${version}. Sem dependências externas.`);
