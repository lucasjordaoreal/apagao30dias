import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
async function walk(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;files.push(...(e.isDirectory()?await walk(p):[p]));}return files;}
for(const file of [...await walk('src'),...await walk('scripts'),...await walk('tests')].filter(f=>/\.(mjs|js)$/.test(f))){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status){console.error(result.stderr);process.exit(1);}}
console.log('Sintaxe de todos os módulos verificada.');
