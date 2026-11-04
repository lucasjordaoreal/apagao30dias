import { chromium } from '@playwright/test';
import {spawn} from 'node:child_process';
import {cp,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='test-results/hosting';await mkdir(root,{recursive:true});for(const scope of ['a','b'])await cp('dist',`${root}/${scope}`,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs',root],{env:{...process.env,PORT:'4182'},windowsHide:true,stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`Server exited ${code}`)));});
let browser;const errors=[];
try{
 browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const context=await browser.newContext();const pages=[];
 for(const scope of ['a','b']){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:4182/${scope}/`);await p.waitForFunction(()=>document.body.dataset.offline==='ready');await p.waitForFunction(()=>!!navigator.serviceWorker.controller);pages.push(p);}
 const cachesFound=await pages[0].evaluate(()=>caches.keys());assert.equal(cachesFound.filter(k=>k.startsWith('apagao-scope-')).length,2);
 await context.setOffline(true);for(const p of pages){await p.reload();await p.locator('[data-act="new"]').click();await p.locator('[data-act="tutorial"]').click();await p.locator('[data-act="begin"]').click();await p.locator('#hud').waitFor({state:'visible'});assert.ok(await p.locator('#world').evaluate(c=>c.width>0&&c.getContext('2d').getImageData(0,0,1,1).data[3]===255));}
 assert.deepEqual(errors,[]);const report={scopes:['/a/','/b/'],caches:cachesFound,offlineReloadAndNewGame:true,errors};await writeFile('test-results/production.json',JSON.stringify(report,null,2));console.log(report);
}finally{if(browser)await browser.close();server.kill();}
