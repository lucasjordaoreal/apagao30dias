import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
const out='test-results/visual';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const base=process.env.TEST_URL||'http://127.0.0.1:4181';const report=[];const errors=[];
for(const [width,height] of [[1920,1080],[1600,900],[1366,768],[1280,720],[1024,768],[800,600],[390,844],[360,800]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<700,isMobile:width<700});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.locator('[data-act="new"]').waitFor();await page.screenshot({path:`${out}/${width}-title.png`});
  const title=await page.locator('.title-layout').evaluate(el=>({scroll:el.scrollHeight,height:el.clientHeight}));
  await page.locator('[data-act="new"]').click();await page.locator('[data-act="tutorial"]').click();await page.locator('[data-act="begin"]').click();await page.locator('#hud').waitFor({state:'visible'});await page.waitForTimeout(800);
  await page.screenshot({path:`${out}/${width}-game.png`});
  const overlap=await page.evaluate(()=>{const a=document.querySelector('#countdown').getBoundingClientRect(),b=document.querySelector('#objectives').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;});
  const button=page.locator('#toolbar [data-act="inventory"]');await button.focus();const focus=await button.elementHandle();await page.waitForTimeout(1200);const stable=await focus.evaluate(el=>el===document.activeElement&&el.isConnected);if(!stable)errors.push(`Focus lost ${width}`);
  await button.click();await page.waitForTimeout(200);await page.screenshot({path:`${out}/${width}-inventory.png`});await page.locator('[data-act="close"]').click();await page.keyboard.press('m');await page.waitForTimeout(200);await page.screenshot({path:`${out}/${width}-map.png`});
  report.push({width,height,title,overlap,stable,bodyWidth:await page.evaluate(()=>document.body.scrollWidth)});await context.close();
}
for(const scene of ['interior','garden','night','market']){
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  await page.evaluate(async scene=>{const S=await import('./src/systems/simulation.js'),{saveGame}=await import('./src/save/storage.js');const s=S.createGame(2026);S.advance(s,30);s.player.cash=30000;
    if(scene==='interior'){s.player.x=564;s.player.y=515;}
    if(scene==='market'){s.player.x=1008;s.player.y=614;s.npcs[1].x=1020;s.npcs[1].y=614;}
    if(scene==='garden'){s.player.x=550;s.player.y=328;s.builds.push({id:'coop',type:'coop',x:25,y:12,feed:1,water:2,dirt:5,eggs:2});s.chickens.push(...[1,2,3,4].map(i=>({id:++s.serial,health:90,lay:0,age:240})));s.builds.push({id:'barrel',type:'barrel',x:21,y:11,liters:40,clean:true});}
    if(scene==='night'){s.dayTime=400;s.activeTime=430;s.weather={kind:'temporal',temp:21,rain:1};s.player.lantern=true;}
    await saveGame(s,{replace:true});
  },scene);await page.reload();await page.locator('[data-act="continue"]').click();await page.waitForTimeout(500);await page.screenshot({path:`${out}/${scene}.png`});
  if(scene==='market'){await page.keyboard.press('e');await page.screenshot({path:`${out}/trade.png`});}
  await context.close();
}
await browser.close();await writeFile(`${out}/report.json`,JSON.stringify({report,errors},null,2));console.log(JSON.stringify({report,errors},null,2));assert.deepEqual(errors,[]);for(const r of report){assert.ok(r.title.scroll<=r.height,`Clipped title ${r.width}`);assert.equal(r.overlap,false);assert.equal(r.stable,true);assert.equal(r.bodyWidth,r.width);}
