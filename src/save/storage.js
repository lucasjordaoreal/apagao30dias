import { validateSave } from '../systems/simulation.js';
const KEY='apagao-save-v1';let dbPromise;
function database(){
  if(!globalThis.indexedDB)return Promise.reject(new Error('IndexedDB indisponível.'));
  return dbPromise??=new Promise((resolve,reject)=>{const r=indexedDB.open('apagao30dias',1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>resolve(r.result);r.onerror=()=>{dbPromise=null;reject(r.error);};r.onblocked=()=>{dbPromise=null;reject(new Error('Feche outras abas antigas do jogo.'));};});
}
export async function saveGame(state){
  state.saveRevision++;const snapshot=structuredClone(state);snapshot.notices=[];snapshot.paused=false;
  try{const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(snapshot,'campaign');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});try{const fallback=JSON.parse(localStorage.getItem(KEY)||'null');if(!fallback||fallback.saveRevision<=snapshot.saveRevision)localStorage.removeItem(KEY);}catch{}return 'IndexedDB';}
  catch(error){try{localStorage.setItem(KEY,JSON.stringify(snapshot));return 'armazenamento alternativo';}catch{throw new Error(`Não foi possível salvar neste navegador: ${error.message}`);}}
}
export async function loadGame(){
  let primary=null,fallback=null;const errors=[];
  try{const raw=localStorage.getItem(KEY);if(raw)fallback=validateSave(JSON.parse(raw));}catch(e){errors.push(e);}
  try{const db=await database();const raw=await new Promise((resolve,reject)=>{const r=db.transaction('saves').objectStore('saves').get('campaign');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(raw)primary=validateSave(raw);}catch(e){errors.push(e);}
  if(primary&&fallback)return primary.saveRevision>=fallback.saveRevision?primary:fallback;
  if(primary||fallback)return primary||fallback;
  if(errors.length)throw errors[0];return null;
}
export function exportSave(state){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`apagao-dia-${String(state.day).padStart(2,'0')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function importSave(file){if(!file||file.size>2_000_000)throw new Error('Selecione um arquivo de até 2 MB.');return validateSave(JSON.parse(await file.text()));}
