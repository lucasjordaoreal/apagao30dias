import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
const root=path.resolve(process.argv[2]||'.'),port=Number(process.env.PORT)||4173;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname),target=path.resolve(root,'.'+name);
    if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const info=await stat(target),file=info.isDirectory()?path.join(target,'index.html'):target;
    const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(bytes);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Arquivo não encontrado. Execute npm run build para gerar a versão de produção.');}
}).listen(port,'127.0.0.1',()=>console.log(`APAGÃO: http://127.0.0.1:${port} · ${root}`));
