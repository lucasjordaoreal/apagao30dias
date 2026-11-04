// Sons originais sintetizados localmente. O contexto só nasce após um gesto do jogador.
export class Sound{
  constructor(){this.ctx=null;this.volume=.25;this.last=0;this.ambientAt=0;}
  init(){try{this.ctx??=new(window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume();}catch{/* A partida não depende de áudio. */}}
  tone(freq=440,duration=.1,type='sine',volume=.2,slide=0){if(!this.ctx||!this.volume)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume*this.volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+duration+.02);}
  click(){this.tone(660,.06,'triangle',.15,-180);}
  alert(){this.tone(330,.3,'triangle',.18,110);}
  step(time){if(time-this.last<230)return;this.last=time;this.tone(90,.045,'triangle',.07,-25);}
  ambient(time,night,rain){if(time<this.ambientAt)return;this.ambientAt=time+(night?3200:5200);if(rain){this.tone(110,.5,'sawtooth',.012,50);return;}this.tone(night?1600:950,night?.1:.16,'sine',.025,night?80:400);if(!night)setTimeout(()=>this.tone(1400,.1,'sine',.02,-350),160);}
}
