import { WORLD, TILE, BUILDINGS, POINTS, ITEMS } from '../data.js';
import { terrain, treeAt, rectContains, nearest } from '../world.js';
import { hour, isNight } from '../systems/simulation.js';

const P={grass:'#7d975e',grassLight:'#8ca56b',grassDark:'#6c8753',ink:'#37423b',soil:'#a18b63',road:'#aab0a0',line:'#ddd8b6',wood:'#a17a52',roof:'#bd7859',cream:'#e7dbb8'};
const hash=(x,y)=>{let n=Math.imul(x+73,374761393)^Math.imul(y+117,668265263);n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967296;};
function rect(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
function line(c,color,x,y,x2,y2,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
function label(c,text,x,y,size=7,color='#f7e8bb'){c.textAlign='center';c.font=`bold ${size}px monospace`;c.fillStyle=color;c.fillText(text,x,y);}
function shadow(c,x,y,w=18,h=5){c.fillStyle='#334d4433';c.beginPath();c.ellipse(x,y,w/2,h/2,0,0,7);c.fill();}
export class Renderer{
  constructor(canvas){
    this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.camera={x:0,y:0};this.t=0;this.place=null;
    this.ground=document.createElement('canvas');this.ground.width=WORLD.w*TILE;this.ground.height=WORLD.h*TILE;this.makeGround();
    this.light=document.createElement('canvas');this.visuals=new Map();this.lastTime=0;
    this.trees=[];for(let y=0;y<WORLD.h;y++)for(let x=0;x<WORLD.w;x++)if(treeAt(x,y))this.trees.push({x:x*TILE+12,y:y*TILE+18,variant:hash(x,y)});
    this.resize();window.addEventListener('resize',()=>this.resize());
  }
  resize(){
    const scale=innerWidth<700?1.35:2;this.canvas.width=Math.ceil(innerWidth/scale);this.canvas.height=Math.ceil(innerHeight/scale);
    this.c.imageSmoothingEnabled=false;this.light.width=this.canvas.width;this.light.height=this.canvas.height;
  }
  makeGround(){
    const c=this.ground.getContext('2d');
    for(let ty=0;ty<WORLD.h;ty++)for(let tx=0;tx<WORLD.w;tx++){
      const x=tx*TILE,y=ty*TILE,t=terrain(tx,ty),n=hash(tx,ty);
      rect(c,t==='road'?P.road:t==='soil'?P.soil:t==='plaza'?'#c4bd96':t==='fair'?'#b2a37a':P.grass,x,y,TILE,TILE);
      if(['grass','forest'].includes(t)){
        for(let i=0;i<7;i++){const xx=x+Math.floor(hash(tx+i*5,ty+7)*23),yy=y+Math.floor(hash(tx,ty+i*7)*23);rect(c,i%2?P.grassLight:P.grassDark,xx,yy,i%3===0?3:1,1);}
        if(n>.96){rect(c,'#d8d39a',x+8,y+12,2,2);rect(c,'#e8d9ad',x+15,y+8,1,2);}
      }
      if(t==='soil')for(let i=0;i<3;i++)line(c,'#8e795c',x+2,y+3+i*7,x+21,y+3+i*7);
      if(t==='plaza'){line(c,'#b3ac89',x,y,x+24,y);line(c,'#b3ac89',x,y,x,y+24);rect(c,'#d3cbaa',x+1,y+1,22,1);}
      if(t==='road'){
        if(ty===26&&tx%2===0&&!(tx>=36&&tx<=38))rect(c,'#d9d3b2',x+4,y+12,12,2);
        if(tx===37&&ty%2===0&&!(ty>=25&&ty<=27))rect(c,'#d9d3b2',x+12,y+4,2,12);
        if(n>.8)line(c,'#959f92',x+5,y+9,x+11,y+14);
      }
    }
    // Calçadas, jardins frontais e caminhos de entrada.
    for(const b of BUILDINGS){
      const x=b.x*TILE,y=b.y*TILE,w=b.w*TILE,h=b.h*TILE;
      rect(c,'#b9b69a',x-6,y-4,w+12,h+22);rect(c,'#d0caac',x-5,y+h+1,w+10,16);
      for(let xx=x;xx<x+w;xx+=12)line(c,'#aaa88e',xx,y+h+2,xx,y+h+17);
      const dx=x+w/2;rect(c,'#c9bea0',dx-12,y+h+17,24,12);
      rect(c,'#85945d',x+2,y+h+2,23,12);rect(c,'#85945d',x+w-26,y+h+2,23,12);
      for(let i=0;i<5;i++){rect(c,'#d9b080',x+4+i*4,y+h+5,2,2);rect(c,'#ad796b',x+w-24+i*4,y+h+7,2,2);}
    }
    // Cerca baixa do quintal, com passagem ao lado da casa.
    for(let x=19*TILE;x<28*TILE;x+=8){rect(c,'#d6ca9e',x,9*TILE,3,9);rect(c,'#a89a76',x,9*TILE+3,8,2);}
    for(let y=9*TILE;y<18*TILE;y+=8){rect(c,'#d6ca9e',19*TILE,y,3,7);rect(c,'#a89a76',19*TILE+1,y+2,2,8);}
    // Praça: bancos, fonte seca, canteiros e coreto.
    for(const [x,y]of [[29,29],[32,31],[28,32]])this.bench(c,x*TILE,y*TILE);
    const fx=30.7*TILE,fy=29.5*TILE;shadow(c,fx,fy+5,39,15);rect(c,'#9b9d83',fx-18,fy-10,36,19);rect(c,'#d3c8a3',fx-16,fy-12,32,16);rect(c,'#6f9290',fx-12,fy-10,24,11);rect(c,'#bdd0b8',fx-7,fy-8,4,1);rect(c,'#b5b598',fx-3,fy-24,6,22);rect(c,'#d9d3af',fx-7,fy-25,14,5);
    // Feira, propriedade rural e caminhos secundários.
    for(let i=0;i<3;i++)this.stall(c,(29+i*2.5)*TILE,34*TILE,i);
    for(let j=0;j<5;j++)for(let i=0;i<12;i++){rect(c,'#7c7650',(58+i*.6)*TILE,(29+j)*TILE,9,3);rect(c,'#69844e',(58+i*.6)*TILE+2,(29+j)*TILE-3,4,5);}
    for(const [x,y]of [[35,23],[38,17],[48,25],[17,25],[38,40],[56,16]])this.lamppost(c,x*TILE,y*TILE,false);
    // Poço coberto e materiais reaproveitáveis.
    rect(c,'#868c77',35*TILE-10,29*TILE-7,20,14);rect(c,'#c2b99a',35*TILE-10,29*TILE-11,20,9);rect(c,'#3f625e',35*TILE-5,29*TILE-9,10,5);
    for(let i=0;i<8;i++){const x=18*TILE+hash(i,2)*45,y=36*TILE+hash(i,7)*40;rect(c,i%2?'#899089':'#a28059',x,y,14,4);}
    // Marcação da área inicial.
    label(c,'RUA DAS PAINEIRAS',29*TILE,27*TILE-3,7,'#737f71');
    label(c,'PRAÇA DA MATRIZ',31*TILE,32*TILE+10,6,'#6b715c');
  }
  bench(c,x,y){shadow(c,x+12,y+7,29,6);rect(c,'#756a4d',x+2,y,3,10);rect(c,'#756a4d',x+21,y,3,10);rect(c,'#ab8b56',x,y-5,26,4);rect(c,'#b89a63',x,y,26,4);}
  stall(c,x,y,i){shadow(c,x+12,y+5,38,9);rect(c,'#7f6b47',x-3,y-20,2,25);rect(c,'#7f6b47',x+28,y-20,2,25);rect(c,'#a8885c',x-4,y-3,36,9);rect(c,'#d9cda4',x-6,y-28,40,9);for(let j=0;j<5;j++)rect(c,i%2?'#879b79':'#b96f54',x-6+j*8,y-28,4,11);rect(c,'#c3ad76',x,y-7,9,5);rect(c,'#77965c',x+11,y-8,9,6);rect(c,'#ce9d5f',x+22,y-7,6,5);}
  tree(c,x,y,t,v=0){
    const sway=Math.round(Math.sin(t*.0015+v*20)*1.4);
    shadow(c,x+5,y+3,34,12);rect(c,'#786847',x-3,y-22,7,25);rect(c,'#9c8556',x-2,y-21,2,21);line(c,'#786847',x,y-10,x-9,y-23,3);
    const xx=x+sway;
    rect(c,'#536e47',xx-17,y-39,33,22);rect(c,'#536e47',xx-21,y-33,41,13);rect(c,'#62844f',xx-17,y-44,32,24);rect(c,'#719358',xx-12,y-47,23,25);rect(c,'#87a366',xx-9,y-44,16,6);rect(c,'#78995b',xx-17,y-35,13,7);rect(c,'#78995b',xx+2,y-31,14,7);rect(c,'#516f48',xx-4,y-22,17,6);
    if(v>.7){rect(c,'#b69159',xx-10,y-33,2,2);rect(c,'#c1a567',xx+7,y-37,2,2);}
  }
  building(c,b,s,t){
    const x=b.x*TILE,y=b.y*TILE,w=b.w*TILE,h=b.h*TILE,inside=rectContains(b,s.player.x,s.player.y,-3);
    shadow(c,x+w/2+6,y+h+3,w+15,15);
    if(inside){
      rect(c,'#796d54',x,y,w,h);rect(c,'#c1b18d',x+7,y+8,w-14,h-12);
      for(let j=y+12;j<y+h;j+=12){line(c,'#b5a582',x+8,j,x+w-8,j);for(let i=x+9;i<x+w-8;i+=24)line(c,'#b5a582',i,j,i,j+12);}
      rect(c,'#ddcba8',x,y,w,9);rect(c,'#ddcba8',x,y,9,h);rect(c,'#ddcba8',x+w-9,y,9,h);
      if(b.id==='home'){
        // Cozinha, sala, quarto e banheiro com mobiliário original.
        rect(c,'#d6c89e',x+10,y+12,48,17);rect(c,'#7c9487',x+11,y+13,18,15);rect(c,'#c6cdb5',x+13,y+15,14,10);rect(c,'#577675',x+16,y+17,8,6);
        rect(c,'#4b5b52',x+33,y+13,21,15);for(const [xx,yy]of [[37,17],[47,17],[37,24],[47,24]]){rect(c,'#a0aaa0',x+xx,y+yy,4,3);rect(c,'#414f48',x+xx+1,y+yy,2,2);}
        rect(c,'#d8d9ba',x+12,y+37,18,30);rect(c,'#829c90',x+13,y+38,16,2);rect(c,'#a9bba3',x+13,y+52,16,1);rect(c,'#687e74',x+26,y+43,2,5);
        rect(c,'#a68f67',x+75,y+48,21,17);rect(c,'#d9b471',x+80,y+49,6,6);rect(c,'#80976f',x+87,y+50,5,4);
        rect(c,'#8c7857',x+100,y+12,40,43);rect(c,'#e8dfbf',x+102,y+13,36,39);rect(c,'#6c9d98',x+102,y+26,36,26);rect(c,'#83b4a8',x+103,y+28,34,3);rect(c,'#eee5c8',x+106,y+16,27,8);
        rect(c,'#d3c7a5',x+102,y+65,48,37);rect(c,'#a6bdb2',x+106,y+69,14,11);rect(c,'#e3e0c2',x+127,y+76,13,16);rect(c,'#79968b',x+130,y+80,7,8);
        rect(c,'#a69271',x+91,y+7,5,38);rect(c,'#a69271',x+98,y+59,55,4);
        rect(c,'#b47f5e',x+37,y+96,36,18);rect(c,'#d4a16c',x+39,y+97,32,11);rect(c,'#8c9a72',x+89,y+107,25,15);
        rect(c,'#71684e',x+13,y+87,20,10);rect(c,'#405d57',x+16,y+88,14,7);if(s.phase==='prologue')rect(c,'#a8c9bb',x+17,y+89,12,5);
        label(c,'COZINHA',x+42,y+78,5,'#7b715b');label(c,'QUARTO',x+122,y+58,5,'#7b715b');label(c,'BANHEIRO',x+126,y+110,5,'#7b715b');
      }else{
        for(let i=0;i<3;i++){rect(c,'#927e58',x+15+i*34,y+25,25,44);for(let j=0;j<3;j++)for(let k=0;k<4;k++)rect(c,['#a6ac76','#c5a36b','#99aaa2'][j],x+17+i*34+k*5,y+27+j*13,4,8);}
        rect(c,'#a99164',x+15,y+h-35,w-30,13);label(c,b.name,x+w/2,y+h-45,6,'#605f4f');
      }
      rect(c,'#b9a784',x,y+h-7,w/2-14,7);rect(c,'#b9a784',x+w/2+14,y+h-7,w/2-14,7);return;
    }
    rect(c,'#8c8269',x,y+3,w,h);rect(c,b.wall,x+2,y+5,w-4,h-10);
    rect(c,'#c9b891',x+2,y+h-20,w-4,13);
    for(let xx=x+19;xx<x+w-12;xx+=34){
      rect(c,'#977e59',xx-2,y+h-49,23,28);rect(c,'#e1d4ac',xx-1,y+h-48,21,26);rect(c,isNight(s)&&s.services.power?'#edce7d':'#648b8d',xx+1,y+h-46,17,21);
      rect(c,'#a7c4b4',xx+2,y+h-45,4,8);rect(c,'#d9c599',xx+9,y+h-46,2,22);rect(c,'#d9c599',xx+1,y+h-36,17,2);rect(c,'#8a7858',xx-3,y+h-20,25,3);
    }
    const dx=x+w/2;rect(c,'#806e50',dx-13,y+h-37,26,32);rect(c,b.id==='home'&&s.house.locked?'#65776c':'#554e3f',dx-10,y+h-34,20,30);rect(c,'#bcad75',dx+5,y+h-20,2,2);rect(c,'#c9bc99',dx-14,y+h-5,28,5);
    // Telhas francesas desenhadas em grade, cumeeira e beiral.
    rect(c,'#715e49',x-6,y-6,w+12,h-56);rect(c,b.color,x-6,y-14,w+12,h-53);rect(c,'#d39570',x-7,y-15,w+14,5);
    for(let yy=y-8;yy<y+h-69;yy+=8){line(c,'#8e5d49',x-6,yy+6,x+w+6,yy+6);for(let xx=x-4;xx<x+w+6;xx+=8){rect(c,'#d09a73',xx,yy,2,5);rect(c,'#a76851',xx+5,yy,2,6);}}
    rect(c,'#d6a479',x-8,y+h-68,w+16,4);rect(c,'#775f4a',x-8,y+h-64,w+16,4);
    const sign=b.sign,sw=Math.max(34,sign.length*5+10);rect(c,'#f0dfb5',dx-sw/2,y+h-58,sw,13);rect(c,'#6e7d6b',dx-sw/2+1,y+h-57,sw-2,11);label(c,sign,dx,y+h-49,7,'#f0dfb5');
    // Caixa d'água, chaminé e antena sobre alguns telhados.
    if(['home','joao','clinic'].includes(b.id)){rect(c,'#456f79',x+w-31,y-11,23,13);rect(c,'#779da0',x+w-33,y-13,27,4);rect(c,'#a0bdb0',x+w-27,y-10,3,9);}
    if(b.id==='home'){line(c,'#5c695e',x+28,y-12,x+28,y-32);line(c,'#5c695e',x+15,y-28,x+41,y-28);line(c,'#5c695e',x+19,y-33,x+37,y-33);}
    if(b.id==='bank'){rect(c,'#586d68',x+w/2+14,y+h-26,13,23);rect(c,s.phase==='prologue'?'#9fcaac':'#344b47',x+w/2+16,y+h-24,9,7);rect(c,'#a9b0a0',x+w/2+16,y+h-14,9,2);}
    if(b.id==='pharmacy'||b.id==='clinic'){rect(c,'#d4dfbf',x+7,y+h-48,18,18);rect(c,'#7e9d80',x+14,y+h-46,4,14);rect(c,'#7e9d80',x+9,y+h-41,14,4);}
    if(b.id==='market')for(let i=0;i<3;i++){rect(c,'#8c7951',x+9+i*18,y+h-8,15,11);rect(c,['#d6b477','#8d9a60','#b67c57'][i],x+10+i*18,y+h-10,13,6);}
    if(b.id==='depot'){rect(c,'#8a7858',dx-10,y+h+4,20,17);rect(c,'#e7d9af',dx-8,y+h+6,16,13);for(let i=0;i<3;i++)rect(c,'#b1aa8b',dx-6,y+h+8+i*3,12,1);}
  }
  person(c,p,t,player=false){
    const x=Math.round(p.x),y=Math.round(p.y),step=p.moving?Math.sin(t*(player&&p.running?.022:.014)):0,dir=p.dir??2;
    shadow(c,x,y+1,15,5);const skin=p.skin||'#d6a374',shirt=p.color||'#5b9d9b';
    rect(c,'#3b4844',x-4,y-6,3,6+Math.round(step*2));rect(c,'#3b4844',x+1,y-6,3,6-Math.round(step*2));
    rect(c,'#d4bd89',x-5,y-13,10,8);rect(c,shirt,x-4,y-13,8,8);rect(c,skin,x-6,y-12+Math.round(step),2,6);rect(c,skin,x+4,y-12-Math.round(step),2,6);
    if(player){rect(c,'#b2a26f',x-4,y-12,4,7);rect(c,'#6b7860',x-4,y-10,4,4);}
    rect(c,skin,x-4,y-21,8,8);rect(c,'#504736',x-4,y-22,8,4);rect(c,'#504736',x-5,y-20,2,5);rect(c,'#795a3b',x-4,y-23,7,2);
    if(dir===2){rect(c,'#3e4338',x-2,y-17,1,1);rect(c,'#3e4338',x+2,y-17,1,1);}if(dir===1)rect(c,'#3e4338',x+3,y-17,1,1);if(dir===3)rect(c,'#3e4338',x-4,y-17,1,1);if(dir===0)rect(c,'#504736',x-4,y-20,8,6);
    if(player){rect(c,'#d3bd84',x-6,y-22,12,2);rect(c,'#c2aa72',x-4,y-26,8,4);rect(c,'#7d7852',x-4,y-23,8,1);}
  }
  build(c,b,s,t){
    const x=b.x*TILE,y=b.y*TILE;
    if(b.type==='bed'){
      shadow(c,x+12,y+21,27,6);rect(c,'#8f714d',x-1,y-1,27,27);rect(c,'#bb9565',x,y,25,2);rect(c,'#775d42',x+2,y+3,21,20);for(let i=0;i<3;i++)rect(c,'#92724c',x+3,y+6+i*6,19,2);
      if(b.crop){const progress=Math.min(1,b.crop.age/({lettuce:65,radish:30}[b.crop.kind]||90));for(let j=0;j<2;j++)for(let i=0;i<2;i++){const xx=x+7+i*11,yy=y+10+j*10,h=3+Math.floor(progress*8);rect(c,b.moisture<15?'#a7a064':'#568a51',xx-2,yy-h,5,h);rect(c,'#7fa862',xx-4,yy-h+2,8,3);if(progress>.4){rect(c,'#99b76b',xx-3,yy-h,5,3);rect(c,'#6f9d59',xx-5,yy-h+4,10,3);}if(b.crop.kind==='radish'&&progress>.7)rect(c,'#c17876',xx-1,yy-2,3,3);}}
    }else if(b.type==='coop'){
      shadow(c,x+14,y+19,37,13);rect(c,'#907347',x-4,y-11,32,31);rect(c,'#b79b62',x-2,y-12,28,31);rect(c,'#67785c',x+3,y+6,9,13);rect(c,'#b17453',x-7,y-22,38,12);for(let i=0;i<5;i++)rect(c,'#cf9668',x-5+i*7,y-21,2,9);rect(c,'#786d4c',x+18,y+2,7,11);if(b.eggs)rect(c,'#f3dfaf',x+20,y+8,3,3);
      s.chickens.forEach((ch,i)=>{const xx=x-10+Math.sin(t*.0006+i*8)*18,yy=y+27+Math.cos(t*.0008+i*5)*8;this.chicken(c,xx,yy,t+i*700);});
    }else if(b.type==='barrel'){
      shadow(c,x+12,y+23,25,8);rect(c,'#456f7a',x+3,y+2,20,22);rect(c,'#6d99a0',x+2,y,22,5);rect(c,'#2f5768',x+3,y+18,20,3);rect(c,'#96b4ac',x+5,y+5,3,11);rect(c,'#b7ba91',x+18,y+20,7,2);
    }else if(b.type==='fence'){
      for(let i=0;i<3;i++)rect(c,'#c1ac79',x+i*10,y-1,4,24);rect(c,'#b29a66',x,y+3,24,4);rect(c,'#9c865c',x,y+14,24,4);
    }else if(b.type==='reinforcement'){
      rect(c,'#85917b',x+9,y-8,5,32);rect(c,'#d3bc81',x+2,y-13,19,10);rect(c,'#f3d795',x+5,y-11,13,7);
    }else{
      rect(c,'#826b47',x+1,y+1,23,21);rect(c,'#b3915e',x,y,25,6);for(let j=0;j<3;j++)line(c,'#6f5c42',x+2,y+8+j*6,x+23,y+8+j*6);rect(c,'#c8aa71',x+4,y+7,3,13);rect(c,'#c8aa71',x+18,y+7,3,13);if(b.type==='compost')rect(c,'#70834f',x+3,y-3,19,5);
    }
  }
  chicken(c,x,y,t){const step=Math.round(Math.sin(t*.01));shadow(c,x,y+3,11,3);rect(c,'#c79a54',x-2,y+1,1,3+step);rect(c,'#c79a54',x+2,y+1,1,3-step);rect(c,'#e1d9b4',x-5,y-5,9,7);rect(c,'#f1e6c1',x-3,y-7,6,7);rect(c,'#e6d9b4',x+3,y-9,4,6);rect(c,'#ae6654',x+3,y-11,3,3);rect(c,'#d4a151',x+7,y-6,3,2);rect(c,'#3e4d41',x+5,y-8,1,1);}
  lamppost(c,x,y,on){shadow(c,x+5,y+1,15,5);rect(c,'#68776a',x-1,y-34,3,35);rect(c,'#536b61',x-5,y-35,11,3);rect(c,on?'#ebd58d':'#b8c4aa',x-4,y-42,9,7);rect(c,'#718274',x-5,y-44,11,3);}
  draw(s,time,reduced=false){
    const c=this.c,w=this.canvas.width,h=this.canvas.height;this.t=time;
    const smoothing=1-Math.exp(-Math.min(100,time-this.lastTime)/130);this.lastTime=time;
    const target=s?.player||{x:30*TILE,y:25*TILE};
    this.camera.x=Math.max(0,Math.min(WORLD.w*TILE-w,target.x-w/2));this.camera.y=Math.max(0,Math.min(WORLD.h*TILE-h,target.y-h*.56));
    const cx=Math.round(this.camera.x),cy=Math.round(this.camera.y);
    c.setTransform(1,0,0,1,0,0);rect(c,P.grass,0,0,w,h);c.drawImage(this.ground,-cx,-cy);c.save();c.translate(-cx,-cy);
    const state=s||{player:target,phase:'prologue',services:{power:true},dayTime:200,builds:[],chickens:[],npcs:[],weather:{rain:0},house:{locked:false}};
    const visible=(x,y,pad=80)=>x>cx-pad&&y>cy-pad&&x<cx+w+pad&&y<cy+h+pad;
    const objects=[];
    for(const b of BUILDINGS)if(visible((b.x+b.w/2)*TILE,(b.y+b.h)*TILE,220))objects.push({y:rectContains(b,state.player.x,state.player.y,-3)?-10000:(b.y+b.h)*TILE-8,draw:()=>this.building(c,b,state,time)});
    for(const tr of this.trees)if(visible(tr.x,tr.y))objects.push({y:tr.y,draw:()=>this.tree(c,tr.x,tr.y,reduced?0:time,tr.variant)});
    for(const b of state.builds)if(visible(b.x*TILE,b.y*TILE))objects.push({y:b.y*TILE+24,draw:()=>this.build(c,b,state,time)});
    for(const n of state.npcs){
      let v=this.visuals.get(n.id);if(!v||Math.hypot(v.x-n.x,v.y-n.y)>200){v={x:n.x,y:n.y};this.visuals.set(n.id,v);}else{v.x+=(n.x-v.x)*smoothing;v.y+=(n.y-v.y)*smoothing;}
      if(visible(v.x,v.y)&&(!insideOther(n,state.player)||insideOther(n,state.player)==='same'))objects.push({y:v.y,draw:()=>this.person(c,{...n,x:v.x,y:v.y},time)});
    }
    if(s)objects.push({y:s.player.y,draw:()=>this.person(c,s.player,time,true)});
    if(s?.threat)objects.push({y:s.threat.y,draw:()=>this.person(c,{...s.threat,color:'#727d70',skin:'#b78d6a',moving:true,dir:3},time)});
    objects.sort((a,b)=>a.y-b.y);for(const o of objects)o.draw();
    for(const [x,y]of [[35,23],[38,17],[48,25],[17,25],[38,40],[56,16]])if(visible(x*TILE,y*TILE))this.lamppost(c,x*TILE,y*TILE,isNight(state)&&state.services.power);
    if(s){
      const n=nearest(s);if(n){const yy=n.y-29+(reduced?0:Math.sin(time*.004)*2);rect(c,'#203d37',n.x-8,yy-9,16,14);label(c,'E',n.x,yy+1,9,'#f0d39b');}
      // Limites et prévia de construção seguem a grade usada pela simulação.
      if(this.place){
        const p=this.place;for(let y=10;y<=16;y++)for(let x=19;x<=27;x++){c.strokeStyle='#e8e4bb55';c.strokeRect(x*TILE,y*TILE,TILE,TILE);}
        c.globalAlpha=.55;rect(c,p.valid?'#b8d596':'#cc7e6a',p.x*TILE,p.y*TILE,TILE,TILE);c.globalAlpha=1;c.strokeStyle=p.valid?'#e5efb5':'#efac83';c.strokeRect(p.x*TILE,p.y*TILE,TILE,TILE);
      }
    }
    c.restore();
    if(s){
      const hr=hour(s);let night=hr>=20.4||hr<5?.64:hr>=18?(hr-18)/2.4*.64:hr<6?(6-hr)*.64:0;
      if(s.weather.kind==='temporal')night=Math.max(night,.18);else if(s.weather.rain)night=Math.max(night,.07);
      if(night>0){
        const l=this.light.getContext('2d');l.clearRect(0,0,w,h);l.fillStyle=`rgba(14,31,44,${night})`;l.fillRect(0,0,w,h);
        const glow=(x,y,r)=>{const g=l.createRadialGradient(x-cx,y-cy,3,x-cx,y-cy,r);g.addColorStop(0,'rgba(0,0,0,.94)');g.addColorStop(1,'rgba(0,0,0,0)');l.globalCompositeOperation='destination-out';l.fillStyle=g;l.fillRect(x-cx-r,y-cy-r,r*2,r*2);};
        if(s.player.lantern&&s.player.battery>0)glow(s.player.x,s.player.y,100);
        if(s.services.power)for(const b of BUILDINGS)glow((b.x+b.w/2)*TILE,(b.y+b.h-.7)*TILE,65);
        for(const b of s.builds.filter(b=>b.type==='reinforcement'))glow(b.x*TILE,b.y*TILE,65);
        l.globalCompositeOperation='source-over';c.drawImage(this.light,0,0);
        if(hr>=18&&hr<20.4){c.fillStyle=`rgba(216,135,75,${Math.sin((hr-18)/2.4*Math.PI)*.12})`;c.fillRect(0,0,w,h);}
      }
      if(s.weather.rain&&!reduced){const indoors=BUILDINGS.find(b=>rectContains(b,s.player.x,s.player.y,-3));c.strokeStyle='#cad9ce88';c.lineWidth=1;for(let i=0;i<150*s.weather.rain;i++){const x=(hash(i,1)*w+time*.018)%w,y=(hash(i,2)*h+time*.2)%h;if(indoors&&rectContains(indoors,x+cx,y+cy))continue;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y+9);c.stroke();}}
      if(!reduced&&!s.weather.rain){for(let i=0;i<9;i++){const x=(hash(i,4)*w+time*.005)%w,y=(hash(i,7)*h+Math.sin(time*.0006+i)*20+time*.003)%h;rect(c,'#b9b77577',x,y,2,1);}}
      if(s.player.sleeping){rect(c,'#152d2844',0,0,w,h);label(c,'z  z  z',s.player.x-cx,s.player.y-cy-33,9,'#eee5c2');}
    }
  }
  minimap(canvas,s){
    const c=canvas.getContext('2d'),scale=canvas.width/(WORLD.w*TILE);c.imageSmoothingEnabled=false;c.drawImage(this.ground,0,0,canvas.width,canvas.height);
    c.save();c.scale(scale,scale);
    for(const b of BUILDINGS){rect(c,b.color,b.x*TILE,b.y*TILE,b.w*TILE,b.h*TILE);label(c,b.sign,(b.x+b.w/2)*TILE,(b.y+b.h/2)*TILE+4,22,'#fff0c8');}
    for(const n of s.npcs){rect(c,'#f4ce8c',n.x-5,n.y-5,10,10);}
    c.strokeStyle='#fff3b7';c.lineWidth=7;c.beginPath();c.arc(s.player.x,s.player.y,16,0,7);c.stroke();rect(c,'#e98f5d',s.player.x-5,s.player.y-5,10,10);c.restore();
  }
}
function insideOther(n,p){const a=BUILDINGS.find(b=>rectContains(b,n.x,n.y,-3));if(!a)return null;return rectContains(a,p.x,p.y,-3)?'same':a.id;}
export function itemIcon(item){
  const d=ITEMS[item];const canvas=document.createElement('canvas');canvas.width=20;canvas.height=20;const c=canvas.getContext('2d');
  if(d.category==='Água'){rect(c,'#dbe2bd',8,1,5,3);rect(c,d.color,5,5,11,13);rect(c,'#d7e6cf',7,6,2,8);rect(c,'#a5c1b1',5,10,11,3);}
  else if(item==='egg'||item==='cookedEgg'){rect(c,d.color,6,5,9,12);rect(c,d.color,8,3,5,2);rect(c,'#c3b891',6,14,9,3);}
  else if(d.category==='Alimentos'){rect(c,'#6b7257',3,5,14,13);rect(c,d.color,4,3,12,14);rect(c,'#ede0ad',5,5,10,3);rect(c,'#fff0c3',5,10,3,5);}
  else if(item==='wood'){rect(c,'#775639',2,5,15,10);rect(c,d.color,3,4,15,8);line(c,'#c7a06c',5,6,16,6);rect(c,'#bf9c6d',2,5,3,9);}
  else if(d.category==='Sementes'){rect(c,'#c7ad75',4,3,12,15);rect(c,'#e6d3a3',5,4,10,12);rect(c,d.color,9,7,3,7);rect(c,d.color,6,8,4,3);rect(c,d.color,11,6,3,3);}
  else{rect(c,'#67786e',3,5,14,12);rect(c,d.color,4,3,12,13);rect(c,'#e1d4a5',6,7,8,3);rect(c,'#fff0ca',6,7,2,6);}
  return canvas.toDataURL();
}
