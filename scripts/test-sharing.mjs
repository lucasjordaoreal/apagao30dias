import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SITE_URL } from '../src/site-config.js';

const browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const base=process.env.TEST_URL||'http://127.0.0.1:4181';
const errors=[];
try{
  const context=await browser.newContext({viewport:{width:1280,height:800},acceptDownloads:true});
  await context.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(window.__clipboardFails)throw new Error('clipboard disabled');window.__copiedText=text;}}});
    Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
      window.__lastShare={title:data.title,text:data.text,url:data.url,files:(data.files||[]).map(file=>({name:file.name,type:file.type,size:file.size}))};
      if(window.__cancelShare)throw new DOMException('cancelled','AbortError');
      if(window.__shareError)throw new DOMException('blocked',window.__shareError);
    }});
    Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>!!data.files?.length});
    window.open=url=>{window.__openedShareUrl=url;return null;};
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(base);

  await page.locator('[data-act="share"]').click();
  await page.locator('.share-preview img').waitFor();
  const poster=await page.locator('.share-preview img').evaluate(image=>({width:image.naturalWidth,height:image.naturalHeight,complete:image.complete}));
  assert.deepEqual(poster,{width:1200,height:630,complete:true});
  const gameUrl=await page.locator('.share-preview a').getAttribute('href');
  assert.equal(gameUrl,SITE_URL);
  assert.match(await page.locator('.share-preview p').innerText(),/30 segundos.*30 dias.*Pixel Art/s);
  const imageSrc=await page.locator('.share-preview img').evaluate(image=>image.currentSrc);
  assert.equal(new URL(imageSrc).origin,new URL(base).origin);
  const imageResponse=await page.request.get(imageSrc);
  assert.equal(imageResponse.status(),200);
  assert.match(imageResponse.headers()['content-type'],/^image\/png(?:;|$)/);
  const promoBytes=await imageResponse.body();
  assert.deepEqual([...promoBytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(promoBytes.readUInt32BE(16),1200);
  assert.equal(promoBytes.readUInt32BE(20),630);
  assert.ok(promoBytes.length<500_000);
  const promoDownloadWait=page.waitForEvent('download');
  await page.locator('[data-act="download-preview"]').click();
  const promoDownload=await promoDownloadWait;
  assert.equal(promoDownload.suggestedFilename(),'apagao-30-dias.png');
  assert.deepEqual(await readFile(await promoDownload.path()),promoBytes);
  await page.locator('[data-act="copy-link"]').click();
  await page.waitForFunction(()=>window.__copiedText==='https://apagao.netlify.app/');
  assert.equal(await page.evaluate(()=>window.__copiedText),SITE_URL);
  assert.match(await page.locator('#notifications').innerText(),/Link copiado/);

  await page.evaluate(()=>{window.__clipboardFails=true;document.execCommand=()=>true;});
  await page.locator('[data-act="copy-link"]').click();
  await page.waitForFunction(()=>document.querySelector('#notifications>*:last-child')?.textContent==='Link copiado.');
  await page.evaluate(()=>{document.execCommand=()=>false;});
  await page.locator('[data-act="copy-link"]').click();
  await page.waitForFunction(()=>document.querySelector('#notifications>*:last-child')?.textContent.includes('não permitiu copiar'));
  await page.evaluate(()=>{window.__clipboardFails=false;});

  await page.locator('[data-act="share-native"]').click();
  await page.waitForFunction(()=>!!window.__lastShare);
  assert.equal(await page.evaluate(()=>window.__lastShare.url),SITE_URL);
  assert.equal(await page.evaluate(()=>window.__lastShare.title),'APAGÃO: 30 DIAS');
  assert.match(await page.evaluate(()=>window.__lastShare.text),/APAGÃO: 30 DIAS.*30 segundos.*30 dias/s);
  await page.evaluate(()=>{window.__cancelShare=true;});
  await page.locator('[data-act="share-native"]').click();
  await page.waitForFunction(()=>document.querySelector('#notifications>*:last-child')?.textContent==='Compartilhamento cancelado.');
  await page.evaluate(()=>{window.__cancelShare=false;window.__shareError='NotAllowedError';});
  await page.locator('[data-act="share-native"]').click();
  await page.waitForFunction(()=>document.querySelector('#notifications>*:last-child')?.textContent.includes('bloqueou o compartilhamento'));
  await page.evaluate(()=>{window.__shareError=null;Object.defineProperty(navigator,'share',{configurable:true,value:undefined});});
  await page.locator('[data-act="share-native"]').click();
  await page.waitForFunction(()=>document.querySelector('#notifications>*:last-child')?.textContent.includes('não está disponível'));
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__lastShare={title:data.title,text:data.text,url:data.url};}}));

  const platforms=['whatsapp','x','facebook','telegram','linkedin','reddit'];
  const hosts=['api.whatsapp.com','twitter.com','www.facebook.com','t.me','www.linkedin.com','www.reddit.com'];
  for(let i=0;i<platforms.length;i++){
    await page.locator(`[data-act="share-platform:${platforms[i]}"]`).click();
    const shared=new URL(await page.evaluate(()=>window.__openedShareUrl));
    assert.equal(shared.hostname,hosts[i]);
    const urlParams={whatsapp:'text',x:'url',facebook:'u',telegram:'url',linkedin:'url',reddit:'url'};
    if(platforms[i]==='whatsapp')assert.ok(shared.searchParams.get(urlParams[platforms[i]]).includes(SITE_URL));
    else assert.equal(shared.searchParams.get(urlParams[platforms[i]]),SITE_URL);
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.act),'share');

  await page.setViewportSize({width:320,height:568});
  await page.locator('[data-act="share"]').click();
  const panelBounds=await page.locator('.panel').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
  assert.ok(panelBounds.left>=0&&panelBounds.right<=320&&panelBounds.top>=0&&panelBounds.bottom<=568,JSON.stringify(panelBounds));
  assert.equal(await page.locator('.share-preview a').getAttribute('href'),SITE_URL);
  for(const button of await page.locator('.share-grid button').all()){
    const box=await button.boundingBox();
    assert.ok(box.width>=44&&box.height>=44);
    assert.ok(box.x>=0&&box.x+box.width<=320);
  }
  const mobileDownload=await page.locator('.panel-body').evaluate(el=>{
    el.scrollTop=el.scrollHeight;
    const body=el.getBoundingClientRect(),button=document.querySelector('[data-act="download-preview"]').getBoundingClientRect();
    return{scrollable:el.scrollHeight>el.clientHeight,buttonVisible:button.top>=body.top&&button.bottom<=body.bottom&&button.right<=innerWidth};
  });
  assert.equal(mobileDownload.scrollable,true);
  assert.equal(mobileDownload.buttonVisible,true);
  await page.locator('[data-act="close"]').click();
  await page.locator('[data-act="new"]').click();
  await page.locator('[data-act="tutorial"]').click();
  await page.locator('[data-act="begin"]').click();
  await page.locator('#hud').waitFor({state:'visible'});
  await page.keyboard.press('Escape');
  await page.locator('#countdown').waitFor({state:'hidden'});
  await page.locator('[data-act="share"]').click();
  const pausedCountdown=await page.locator('#countdown').textContent();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('#countdown').textContent(),pausedCountdown);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.panel-head h2').textContent(),'Um momento de silêncio');
  await context.close();

  const resultContext=await browser.newContext({viewport:{width:1280,height:800},acceptDownloads:true});
  await resultContext.addInitScript(()=>{
    Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
      window.__lastShare={title:data.title,text:data.text,url:data.url,files:(data.files||[]).map(file=>({name:file.name,type:file.type,size:file.size}))};
      if(window.__cancelShare)throw new DOMException('cancelled','AbortError');
    }});
    Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>!!data.files?.length});
    window.open=url=>{window.__openedShareUrl=url;return null;};
  });
  const result=await resultContext.newPage();
  result.on('pageerror',error=>errors.push(error.message));
  await result.goto(base);
  await result.evaluate(async()=>{
    const {createGame}=await import('./src/systems/simulation.js');
    const {saveGame}=await import('./src/save/storage.js');
    const state=createGame(23);
    state.phase='dead';state.day=17;state.activeTime=16*600;state.deathCause='Desidratação';state.player.health=0;
    state.player.cash=125000;state.house.safeCash=5000;state.stats.helped=3;state.stats.harvests=4;state.stats.eggs=7;
    await saveGame(state,{replace:true});
  });
  await result.reload();
  await result.locator('[data-act="continue"]').click();
  await result.locator('[data-act="share-result"]').click();
  const resultImage=await result.locator('.result-share-image').evaluate(image=>({width:image.naturalWidth,height:image.naturalHeight}));
  assert.deepEqual(resultImage,{width:1200,height:630});
  await result.locator('[data-act="share-result-native"]').click();
  await result.waitForFunction(()=>!!window.__lastShare);
  const sharedResult=await result.evaluate(()=>window.__lastShare);
  assert.equal(sharedResult.url,SITE_URL);
  assert.equal(sharedResult.files[0].name,'apagao-resultado.png');
  assert.equal(sharedResult.files[0].type,'image/png');
  assert.match(sharedResult.text,/CHEGUEI AO DIA 17, COM 16 DIAS COMPLETOS/);

  const downloadWait=result.waitForEvent('download');
  await result.locator('[data-act="download-result"]').click();
  assert.equal((await downloadWait).suggestedFilename(),'apagao-resultado.png');
  await result.locator('[data-act="share-result-platform:whatsapp"]').click();
  const resultWhatsApp=new URL(await result.evaluate(()=>window.__openedShareUrl));
  assert.match(resultWhatsApp.searchParams.get('text'),/CHEGUEI AO DIA 17/);
  assert.ok(resultWhatsApp.searchParams.get('text').includes(SITE_URL));
  result.once('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await result.keyboard.press('Escape');
  assert.equal(await result.locator('.panel-head h2').textContent(),'A cidade continua. Sua história termina.');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({poster,resultImage,platforms:platforms.length,nativeFileShare:true,resultDownload:true,errors},null,2));
  await resultContext.close();
}finally{await browser.close();}
