// Geometry comes only from the solver or a measured tape frame. This renderer
// cannot apply forces, ignite a part, or invent a physical connection.
export const machinePalette={grid:'#1e2c3a',major:'#2b3b48',steel:'#748fa5',edge:'#a6bdc8',shadow:'#253747',fixed:'#29394a',fuel:'#ee6e35',hot:'#fff3b0',ash:'#44342d',scar:'#402a23',power:'#efc74a',off:'#45556a',field:'#7b9ec0',ink:'#18222a',text:'#c8d7dd'};
export function studioPalette(){const style=getComputedStyle(document.documentElement),palette={};for(const key of [...Object.keys(machinePalette),'bg','water','steam','ghost'])palette[key]=style.getPropertyValue(`--color-world-${key}`).trim()||machinePalette[key];palette.font=`14px ${style.getPropertyValue('--font-body').trim()}`;return palette;}
const names={battery:'電源',igniter:'点火',magnet:'磁場',gravity:'重力井戸',relay:'衝撃リレー',switch:'スイッチ'};
export function drawWorld(ctx,world,{sprites,scars=[],reduced=false,coolantPainter,ghost=null,palette: c=machinePalette}={}){
  ctx.save();
  ctx.lineWidth=1;
  for(let x=0;x<=1400;x+=40){ctx.strokeStyle=x%200===0?c.major:c.grid;ctx.beginPath();ctx.moveTo(x,-500);ctx.lineTo(x,800);ctx.stroke();}
  for(let y=-480;y<=800;y+=40){ctx.strokeStyle=y%200===0?c.major:c.grid;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1400,y);ctx.stroke();}
  coolantPainter?.draw(ctx,world.coolant);
  if(ghost){
    ctx.save();ctx.strokeStyle=c.ghost||c.field;ctx.globalAlpha=.7;ctx.lineWidth=2;ctx.setLineDash([5,5]);
    for(const p of ghost.parts){if(p.fixed&&p.material!=='fuel')continue;ctx.save();ctx.translate(p.body.position.x,p.body.position.y);ctx.rotate(p.body.angle);ctx.beginPath();if(p.radius)ctx.arc(0,0,p.radius,0,Math.PI*2);else ctx.rect(-p.width/2,-p.height/2,p.width,p.height);ctx.stroke();ctx.restore();}
    ctx.globalAlpha=.35;for(const d of ghost.differences||[]){ctx.beginPath();ctx.moveTo(d.a.x,d.a.y);ctx.lineTo(d.b.x,d.b.y);ctx.stroke();}
    ctx.globalAlpha=.9;ctx.lineWidth=3;for(const id of ghost.survivors||[]){const p=world.parts.get(id);if(!p)continue;ctx.save();ctx.translate(p.body.position.x,p.body.position.y);ctx.rotate(p.body.angle);ctx.strokeRect(-p.width/2-7,-p.height/2-7,p.width+14,p.height+14);ctx.restore();}
    if(!reduced)for(const e of ghost.explosions){const age=(ghost.tick-e.tick)/120;ctx.globalAlpha=.3*(1-age*2);ctx.beginPath();ctx.arc(e.x,e.y,age*480,0,Math.PI*2);ctx.stroke();}ctx.restore();
  }
  for(const e of scars){ctx.fillStyle=c.scar;ctx.globalAlpha=.65;ctx.beginPath();ctx.ellipse(e.x,e.y,38,17,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  for(const p of world.parts.values())if(p.device==='magnet'||p.device==='gravity'){
    const gravity=p.device==='gravity',radius=gravity?600:360;
    const {x,y}=p.body.position;ctx.save();ctx.translate(x,y);
    ctx.strokeStyle=c.field;ctx.globalAlpha=p.powered?.23:.08;ctx.lineWidth=1;
    ctx.setLineDash([4,10]);ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    if(p.powered){
      for(let i=0;i<12;i++){
        ctx.rotate(Math.PI/6);ctx.beginPath();if(gravity){ctx.moveTo(0,-60);ctx.lineTo(0,-radius);}else ctx.ellipse(0,-95,48,90,0,0,Math.PI*2);ctx.stroke();
        if(!reduced){const t=(world.tick/150+i*.083)%1;ctx.fillStyle=c.field;ctx.beginPath();ctx.arc(0,-30-(radius-60)*(1-t),2,0,Math.PI*2);ctx.fill();}
      }
    }ctx.restore();
  }
  for(const link of world.links){
    if(link.broken)continue;
    const a=world.parts.get(link.a)?.body.position,b=world.parts.get(link.b)?.body.position;if(!a||!b)continue;
    ctx.strokeStyle=c.edge;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.fillStyle=c.shadow;for(const point of [a,b]){ctx.beginPath();ctx.arc(point.x,point.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();}
  }
  for(const wire of world.wires){
    const a=world.parts.get(wire.a),b=world.parts.get(wire.b);if(!a||!b)continue;
    const p=a.body.position,q=b.body.position;
    const powered=a.powered&&b.powered&&!wire.broken;
    ctx.strokeStyle=powered?c.power:c.off;ctx.lineWidth=powered?3:2;
    const sag=Math.min(65,Math.hypot(q.x-p.x,q.y-p.y)*.08),midX=(p.x+q.x)/2,midY=(p.y+q.y)/2+sag;
    ctx.beginPath();ctx.moveTo(p.x,p.y);
    if(wire.broken){ctx.lineTo(p.x+(q.x-p.x)*.12,p.y+30);ctx.moveTo(q.x,q.y);ctx.lineTo(q.x+(p.x-q.x)*.12,q.y+30);}
    else ctx.quadraticCurveTo(midX,midY,q.x,q.y);
    ctx.stroke();
    if(powered&&!reduced){const t=(world.tick/100)%1;ctx.fillStyle=c.hot;ctx.beginPath();ctx.arc((1-t)**2*p.x+2*(1-t)*t*midX+t*t*q.x,(1-t)**2*p.y+2*(1-t)*t*midY+t*t*q.y,3,0,Math.PI*2);ctx.fill();}
  }
  for(const p of world.parts.values()){
    const b=p.body;ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);
    const base=p.spent?c.ash:p.burning?c.hot:p.material==='fuel'?c.fuel:p.material==='glass'?c.field:p.device==='magnet'?c.field:p.device?c.power:p.fixed?c.fixed:c.steel;
    ctx.fillStyle=base;ctx.strokeStyle=p.burning?c.hot:c.edge;ctx.lineWidth=1;
    if(p.burning){ctx.shadowColor=c.fuel;ctx.shadowBlur=24;}
    ctx.beginPath();if(p.radius)ctx.arc(0,0,p.radius,0,Math.PI*2);else ctx.rect(-p.width/2,-p.height/2,p.width,p.height);ctx.globalAlpha=p.material==='glass'?.35:1;ctx.fill();ctx.globalAlpha=1;ctx.stroke();ctx.shadowBlur=0;
    if(!p.radius){
      ctx.strokeStyle=p.spent?c.ash:c.edge;ctx.globalAlpha=.65;ctx.beginPath();ctx.moveTo(-p.width/2+2,p.height/2-2);ctx.lineTo(-p.width/2+2,-p.height/2+2);ctx.lineTo(p.width/2-2,-p.height/2+2);ctx.stroke();ctx.globalAlpha=1;
      if(!p.device&&p.material==='steel'&&p.width<200&&p.width>25&&p.height>20){ctx.fillStyle=c.shadow;for(const s of [-1,1]){ctx.beginPath();ctx.arc(s*(p.width/2-6),s*(p.height/2-6),2,0,Math.PI*2);ctx.fill();}}
    }else{ctx.fillStyle=c.text;ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(-p.radius*.3,-p.radius*.3,p.radius*.3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
    const sprite=sprites?.[p.device||(p.material==='fuel'&&!p.spent?'fuel':'')];
    if(sprite?.complete&&sprite.naturalWidth){const size=Math.min(p.width,p.height)*.72;ctx.drawImage(sprite,-size/2,-size/2,size,size);}
    if(p.material==='fuel'&&!p.spent){ctx.fillStyle=c.ink;ctx.fillRect(-p.width/2+3,p.height/2-5,p.width-6,2);ctx.fillStyle=c.hot;ctx.fillRect(-p.width/2+3,p.height/2-5,(p.width-6)*Math.max(0,p.heat),2);}
    ctx.restore();
    if(p.device){
      ctx.font=c.font||'12px Bahnschrift, sans-serif';ctx.textAlign='center';ctx.fillStyle=c.text;
      const state=p.device==='relay'?(p.latched?'・閉':'・待機'):p.powered?'・通電':'';
      ctx.fillText(`${names[p.device]}${state}`,b.position.x,b.position.y-p.height/2-12);
    }
  }
  ctx.restore();
}
