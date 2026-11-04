import { validateSave } from '../systems/simulation.js';
const KEY='apagao-save-v1', BACKUP=KEY+'-backup';
let dbPromise, queue=Promise.resolve();
export class SaveConflict extends Error { constructor(){super('Outra aba gravou um progresso mais recente. Exporte esta partida e recarregue antes de continuar.');this.name='SaveConflict';} }
function database(){
  if(!globalThis.indexedDB)return Promise.reject(new Error('IndexedDB indisponível.'));
  return dbPromise??=new Promise((resolve,reject)=>{const r=indexedDB.open('apagao30dias',1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>resolve(r.result);r.onerror=()=>{dbPromise=null;reject(r.error);};r.onblocked=()=>{dbPromise=null;reject(new Error('Feche outras abas antigas do jogo.'));};});
}
function localRead(key){const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}
function valid(raw){try{return raw?validateSave(raw):null;}catch{return null;}}
const revisionOf=raw=>Number.isSafeInteger(raw?.saveRevision)&&raw.saveRevision>=0&&raw.saveRevision<1e12?raw.saveRevision:0;
function checkRevision(current,base,replace,token){if(!replace&&current&&(current.saveRevision!==base||current.saveToken!==token))throw new SaveConflict();}
export function saveGame(state,{replace=false}={}){
  const snapshot=validateSave(state),base=state.saveRevision,baseToken=state.saveToken;
  const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  const run=async()=>{
    const write=async()=>{
      let fallback=null,rawFallback=null;try{rawFallback=localRead(KEY);fallback=valid(rawFallback);}catch(e){console.warn('Fallback ilegível preservado:',e.message);}
      let db;try{db=await database();}catch(e){
        if(typeof window!=='undefined'&&!navigator.locks)throw new Error('Gravação alternativa indisponível sem coordenação entre abas. Exporte seu progresso.');
        checkRevision(fallback,base,replace,baseToken);snapshot.saveToken=token();snapshot.saveRevision=Math.max(base,revisionOf(rawFallback))+1;
        const raw=localStorage.getItem(KEY);if(raw)localStorage.setItem(fallback?BACKUP:KEY+'-damaged',raw);
        localStorage.setItem(KEY,JSON.stringify(snapshot));state.saveRevision=snapshot.saveRevision;state.saveToken=snapshot.saveToken;return 'armazenamento alternativo';
      }
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves');let failure;
        const req=store.get('campaign'),previous=store.get('backup');previous.onsuccess=()=>{try{
          const primary=valid(req.result),current=[primary,fallback,valid(previous.result)].filter(Boolean).sort((a,b)=>b.saveRevision-a.saveRevision)[0];
          checkRevision(current,base,replace,baseToken);snapshot.saveToken=token();snapshot.saveRevision=Math.max(base,current?.saveRevision||0,revisionOf(req.result),revisionOf(rawFallback))+1;
          if(req.result)store.put(req.result,primary?'backup':'damaged');
          if(fallback&&(!primary||fallback.saveRevision>primary.saveRevision))store.put(fallback,'backup');
          store.put(snapshot,'campaign');
        }catch(e){failure=e;tx.abort();}};
        tx.oncomplete=resolve;tx.onerror=()=>reject(failure||tx.error);tx.onabort=()=>reject(failure||tx.error||new Error('Gravação cancelada.'));
      });
      state.saveRevision=snapshot.saveRevision;state.saveToken=snapshot.saveToken;return 'IndexedDB';
    };
    return globalThis.navigator?.locks?navigator.locks.request('apagao-save-write',write):write();
  };
  const result=queue.then(run);queue=result.catch(()=>{});return result;
}
export async function loadGame(){
  await queue;const candidates=[],errors=[];
  for(const key of [KEY,BACKUP])try{const raw=localRead(key);if(raw)candidates.push({raw,backup:key===BACKUP});}catch(e){errors.push(e);}
  try{const db=await database();await Promise.all(['campaign','backup'].map(key=>new Promise((resolve,reject)=>{const r=db.transaction('saves').objectStore('saves').get(key);r.onsuccess=()=>{if(r.result)candidates.push({raw:r.result,backup:key==='backup'});resolve();};r.onerror=()=>reject(r.error);})));}catch(e){errors.push(e);}
  const good=[];for(const c of candidates)try{good.push({...c,state:validateSave(c.raw)});}catch(e){errors.push(e);}
  good.sort((a,b)=>b.state.saveRevision-a.state.saveRevision||Number(a.backup)-Number(b.backup));
  if(good.length){const best=good[0];if(best.backup)best.state.journal.unshift({day:best.state.day,time:best.state.dayTime,type:'warning',text:'Progresso recuperado da cópia anterior. O registro original foi preservado.'});return best.state;}
  if(candidates.length||errors.length)throw errors[0]||new Error('Nenhuma cópia válida. Importe uma exportação de progresso.');return null;
}
export function exportSave(state){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='apagao-dia-'+String(state.day).padStart(2,'0')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function importSave(file){if(!file||file.size>2_000_000)throw new Error('Selecione um arquivo de até 2 MB.');return validateSave(JSON.parse(await file.text()));}
