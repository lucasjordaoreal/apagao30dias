import { BUILDINGS, POINTS, TILE, WORLD } from './data.js';
export const home = BUILDINGS[0];
export const rectContains = (b,x,y,pad=0) => x>=b.x*TILE-pad && x<=(b.x+b.w)*TILE+pad && y>=b.y*TILE-pad && y<=(b.y+b.h)*TILE+pad;
export function insideBuilding(x,y) { return BUILDINGS.find(b=>rectContains(b,x,y,-3)); }
export function terrain(tx,ty) {
  if ((ty>=25&&ty<=27)||(tx>=36&&tx<=38)||(ty>=15&&ty<=16)||(ty>=42&&ty<=43)) return 'road';
  if ((ty>=28&&ty<=32&&tx>=28&&tx<=35)) return 'plaza';
  if ((tx>=57&&tx<=66&&ty>=28&&ty<=34)||(tx>=19&&tx<=27&&ty>=10&&ty<=17)) return 'soil';
  if (tx>=28&&tx<=35&&ty>=33&&ty<=37) return 'fair';
  if (tx<6||tx>67||ty<5||ty>48) return 'forest';
  return 'grass';
}
export function treeAt(tx,ty) {
  if (BUILDINGS.some(b=>tx>=b.x-1&&tx<=b.x+b.w&&ty>=b.y-2&&ty<=b.y+b.h+1)) return false;
  if (POINTS.some(p=>Math.hypot(p.x-tx,p.y-ty)<2)) return false;
  const t=terrain(tx,ty);
  if(t==='road'||t==='plaza'||t==='fair'||t==='soil'||(tx>=19&&tx<=28&&ty>=9&&ty<=24)) return false;
  const n=((tx*374761393+ty*668265263)>>>0)%101;
  return n<(t==='forest'?28:5);
}
export function blocked(x,y,state,ignoreDoor=false,ignoreFurniture=false,ignoredBuild=null) {
  if(x<24||y<24||x>WORLD.w*TILE-24||y>WORLD.h*TILE-24) return true;
  for(const b of BUILDINGS){
    const left=b.x*TILE,right=(b.x+b.w)*TILE,top=b.y*TILE,bottom=(b.y+b.h)*TILE;
    const door=left+b.w*TILE/2;
    if(x>left-5&&x<right+5&&y>top-5&&y<bottom+5){
      if(!ignoreFurniture)for(const [ox,oy,w,h] of furniture(b))if(x>left+ox-2&&x<left+ox+w+2&&y>top+oy-2&&y<top+oy+h+2)return true;
      if(y<top+9||x<left+9||x>right-9) return true;
      if(y>bottom-9 && (Math.abs(x-door)>13 || (b.id==='home'&&state?.house.locked&&!ignoreDoor))) return true;
    }
  }
  if(treeAt(Math.floor(x/TILE),Math.floor(y/TILE))){
    const cx=Math.floor(x/TILE)*TILE+12,cy=Math.floor(y/TILE)*TILE+17;
    if(Math.abs(x-cx)<7&&Math.abs(y-cy)<7) return true;
  }
  for(const [left,top,w,h] of sceneryFootprints())if(x>left-2&&x<left+w+2&&y>top-2&&y<top+h+2)return true;
  for(const b of state?.builds||[]){
    if(b.id===ignoredBuild)continue;
    if(b.type==='coop'&&x>b.x*TILE-7&&x<b.x*TILE+35&&y>b.y*TILE-3&&y<b.y*TILE+46)return true;
    if(['fence','coop','crate','barrel','compost'].includes(b.type)&&Math.abs(x-b.x*TILE-12)<15&&Math.abs(y-b.y*TILE-12)<15) return true;
  }
  return false;
}
export function nearest(state) {
  const {x,y}=state.player;
  const building=insideBuilding(x,y);
  const objects=POINTS.filter(p=>!p.inside||p.inside===building?.id).map(p=>({...p,x:p.x*TILE,y:p.y*TILE}));
  objects.push(...state.npcs.filter(n=>n.combat?.alive!==false).map(n=>({id:n.id,name:n.name,kind:'npc',x:n.x,y:n.y})));
  objects.push(...state.builds.map(b=>({id:b.id,name:b.type==='bed'?'Canteiro':b.type==='coop'?'Galinheiro':b.type==='barrel'?'Reservatório':b.type==='compost'?'Composteira':b.type==='crate'?'Caixa de armazenamento':b.type==='reinforcement'?'Reforço doméstico':'Cerca',kind:'build',build:b,x:b.x*TILE+12,y:b.y*TILE+12})));
  return objects.map(p=>({...p,distance:Math.hypot(x-p.x,y-p.y)})).filter(p=>p.distance<43&&playerCanReach(state,p)).sort((a,b)=>a.distance-b.distance)[0];
}
export function playerCanReach(state,anchor){
  const target=anchor.kind==='npc'?state.npcs.find(n=>n.id===anchor.id):anchor;
  if(!target||target.combat?.alive===false)return false;const p=state.player,d=Math.hypot(p.x-target.x,p.y-target.y);if(d>=43)return false;
  if(anchor.kind==='npc'&&insideBuilding(p.x,p.y)?.id!==insideBuilding(target.x,target.y)?.id)return false;
  if(anchor.kind==='door')return true;
  for(let t=4;t<d-12;t+=4)if(blocked(p.x+(target.x-p.x)*t/d,p.y+(target.y-p.y)*t/d,state,false,!!anchor.inside,anchor.kind==='build'?anchor.id:null))return false;
  return true;
}
export function canBuild(state,type,tx,ty){
  if(!Number.isInteger(tx)||!Number.isInteger(ty))return 'Escolha uma célula válida.';
  if(type==='coop'&&state.builds.some(b=>b.type==='coop'))return 'As quatro aves compartilham um único galinheiro.';
  if(tx<19||tx>27||ty<10||ty>16) return 'Construa no quintal de casa: área de terra ao norte.';
  if(state.builds.some(b=>Math.abs(b.x-tx)<(type==='coop'||b.type==='coop'?2:1)&&Math.abs(b.y-ty)<(type==='coop'||b.type==='coop'?2:1))) return 'Este espaço já está ocupado.';
  if(type==='coop'&&blocked(state.player.x,state.player.y,{...state,builds:[...state.builds,{id:'preview',type,x:tx,y:ty}]}))return 'Saia da area do abrigo antes de construir.';
  if(Math.hypot(state.player.x-(tx*TILE+12),state.player.y-(ty*TILE+12))<27)return 'Saia da célula antes de iniciar a construção.';
  if(Math.hypot(state.player.x-(tx*24+12),state.player.y-(ty*24+12))>130) return 'Aproxime-se do terreno para construir.';
  return null;
}
// Busca em grade; a aresta também precisa estar livre para não atravessar paredes.
export function findPath(state,from,to){
  const sx=Math.floor(from[0]/TILE),sy=Math.floor(from[1]/TILE),gx=Math.floor(to[0]/TILE),gy=Math.floor(to[1]/TILE);
  const index=(x,y)=>y*WORLD.w+x,start=index(sx,sy),goal=index(gx,gy),parents=new Map([[start,-1]]),queue=[start];
  let head=0;
  while(head<queue.length){
    const node=queue[head++];if(node===goal)break;const x=node%WORLD.w,y=Math.floor(node/WORLD.w);
    for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){
      const nx=x+dx,ny=y+dy,n=index(nx,ny);if(nx<1||ny<1||nx>=WORLD.w-1||ny>=WORLD.h-1||parents.has(n))continue;
      if(blocked((nx+.5)*TILE,(ny+.5)*TILE,state,true)||blocked((x+.5+dx*.5)*TILE,(y+.5+dy*.5)*TILE,state,true))continue;
      parents.set(n,node);queue.push(n);
    }
  }
  if(!parents.has(goal))return [];
  const result=[];for(let n=goal;n!==start;n=parents.get(n))result.push([(n%WORLD.w+.5)*TILE,(Math.floor(n/WORLD.w)+.5)*TILE]);
  result.reverse();result.push(to);return result;
}

// Footprint rectangles follow the visible furniture, excluding bathroom floor tiles.
export function furniture(b){
  if(b.id==='home')return [[10,12,48,17],[12,37,18,30],[75,48,21,17],[100,12,40,43],[106,69,14,11],[127,76,13,16],[91,7,5,38],[98,59,55,4],[37,96,36,18],[13,87,20,10]];
  return [[15,25,25,44],[49,25,25,44],[83,25,25,44],[15,b.h*TILE-35,b.w*TILE-30,13]];
}
export function restorePosition(state,actor,ignoreDoor=false){
  if(!blocked(actor.x,actor.y,state,ignoreDoor))return false;
  const room=insideBuilding(actor.x,actor.y)?.id;let best=null,dist=Infinity;
  for(let dy=-120;dy<=120;dy+=2)for(let dx=-120;dx<=120;dx+=2){
    const x=actor.x+dx,y=actor.y+dy,d=dx*dx+dy*dy;
    if(d>=dist||insideBuilding(x,y)?.id!==room||blocked(x,y,state,ignoreDoor))continue;
    best={x,y};dist=d;
  }
  if(!best)throw new Error('Posicao bloqueada sem recuperacao segura.');
  Object.assign(actor,best);return true;
}

const SCENERY = [
  [19*TILE,9*TILE,3,9*TILE],[19*TILE,9*TILE,9*TILE,3],
  ...[[29,29],[32,31],[28,32]].map(([x,y])=>[x*TILE,y*TILE,26,7]),
  [30.7*TILE-18,29.5*TILE-10,36,19],[35*TILE-10,29*TILE-7,20,14],
  ...[0,1,2].map(i=>[(29+i*2.5)*TILE-4,34*TILE-3,36,9]),
  ...[[35,23],[38,17],[48,25],[17,25],[38,40],[56,16]].map(([x,y])=>[x*TILE-2,y*TILE-2,5,5])
];
export function sceneryFootprints(){return SCENERY;}
