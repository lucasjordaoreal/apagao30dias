import { chromium } from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const context=await browser.newContext({viewport:{width:1366,height:768}}),p=await context.newPage(),errors=[];
try{
 p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||'http://127.0.0.1:4181');await p.locator('[data-act="new"]').click();await p.locator('[data-act="tutorial"]').click();await p.locator('[data-act="begin"]').click();await p.locator('#hud').waitFor({state:'visible'});
 await p.evaluate(()=>{window.metrics={frames:0,deltas:[],longTasks:0,initialHeap:performance.memory?.usedJSHeapSize};let last=performance.now();function frame(t){window.metrics.frames++;window.metrics.deltas.push(t-last);last=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);new PerformanceObserver(list=>window.metrics.longTasks+=list.getEntries().length).observe({entryTypes:['longtask']});});
 const start=Date.now();let cycles=0;
 while(Date.now()-start<180000){await p.keyboard.down(cycles%2?'a':'d');await p.waitForTimeout(1000);await p.keyboard.up(cycles%2?'a':'d');await p.waitForTimeout(12000);await p.keyboard.press('Escape');await p.locator('[data-act="save"]').click();await p.locator('[data-act="close"]').first().click();cycles++;}
 const metrics=await p.evaluate(()=>({...window.metrics,finalHeap:performance.memory?.usedJSHeapSize}));metrics.deltas.sort((a,b)=>a-b);const report={seconds:(Date.now()-start)/1000,cycles,frames:metrics.frames,p95FrameMs:metrics.deltas[Math.floor(metrics.deltas.length*.95)],longTasks:metrics.longTasks,initialHeap:metrics.initialHeap,finalHeap:metrics.finalHeap,errors};await mkdir('test-results',{recursive:true});await p.screenshot({path:'test-results/soak-final.png'});await writeFile('test-results/soak.json',JSON.stringify(report,null,2));console.log(report);if(errors.length)process.exitCode=1;
}finally{await browser.close();}
