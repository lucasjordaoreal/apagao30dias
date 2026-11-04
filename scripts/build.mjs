import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'dist');
await mkdir(out,{recursive:true});
for(const p of ['src','public','index.html'])await cp(path.join(root,p),path.join(out,p),{recursive:true});
const siteConfig=JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8'));
const rawPublicUrl=process.env.APAGAO_PUBLIC_URL||siteConfig.publicUrl;
let publicUrl;
try{
  const parsed=new URL(rawPublicUrl);
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash)throw new Error('Use uma URL pública HTTPS sem credenciais, parâmetros ou fragmento.');
  parsed.pathname=parsed.pathname.endsWith('/')?parsed.pathname:`${parsed.pathname}/`;
  publicUrl=parsed.href;
}catch(error){throw new Error(`APAGAO_PUBLIC_URL inválida: ${error.message}`);}
const socialImageUrl=new URL('public/social-preview.png',publicUrl).href;
const replacements={'__APAGAO_PUBLIC_URL__':publicUrl,'__APAGAO_SOCIAL_IMAGE__':socialImageUrl};
const socialImage=await readFile(path.join(out,'public','social-preview.png'));
if(socialImage.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||socialImage.readUInt32BE(16)!==1200||socialImage.readUInt32BE(20)!==630){
  throw new Error('public/social-preview.png precisa ser PNG 1200×630.');
}
for(const file of ['index.html','src/site-config.js']){
  let contents=await readFile(path.join(out,file),'utf8');
  for(const [marker,value] of Object.entries(replacements))contents=contents.replaceAll(marker,value);
  if(/__APAGAO_[A-Z_]+__/.test(contents))throw new Error(`Configuração pública não resolvida em ${file}.`);
  if(file==='index.html')contents=contents.replace('<head>','<head>\n  <meta name="apagao-build" content="production">');
  await writeFile(path.join(out,file),contents);
}
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
