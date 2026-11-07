export class Effects {
  constructor(){this.particles=[];this.shake=0;this.level=1;this.average=16;this.reduced=false;}
  clear(){this.particles=[];this.shake=0;}
  measure(ms){this.average=this.average*.95+Math.min(100,ms)*.05;this.level=this.average>28?.35:this.average>21?.65:1;}
  emit(event, world){
    if(this.reduced)return;
    const explosion=event.type==='explosion';
    if(!explosion&&event.type!=='impact'&&event.type!=='fracture'&&event.type!=='shot')return;
    const part=world.parts.get(event.a||event.source);
    const x=event.x??part?.body.position.x,y=event.y??part?.body.position.y;
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const count=Math.round((explosion?48:event.type==='shot'?14:7)*this.level);
    for(let i=0;i<count&&this.particles.length<420;i++){
      const angle=i*2.39996+(event.tick||0)*.7;
      const speed=(explosion?280:110)*(0.3+((i*37)%101)/100);
      this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:explosion?.9:.35,max:explosion?.9:.35,hot:explosion});
    }
    this.shake=Math.min(8,this.shake+(explosion?5:.4));
  }
  update(dt){
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;}
    this.particles=this.particles.filter(p=>p.life>0);this.shake*=Math.exp(-dt*15);
    if(this.reduced)this.clear();
  }
  draw(ctx,palette=null){
    ctx.save();
    for(const p of this.particles){ctx.globalAlpha=p.life/p.max;ctx.strokeStyle=p.hot?(palette?.hot||'#ffd87a'):(palette?.edge||'#b7deed');ctx.lineWidth=p.hot?2:1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.025,p.y-p.vy*.025);ctx.stroke();}
    ctx.restore();
  }
}
