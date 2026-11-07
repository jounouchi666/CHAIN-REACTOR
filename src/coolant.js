import Matter from 'matter-js';
export const WATER=1,STEAM=2;
/** Deterministic cellular liquid. Mass is one parcel per occupied cell; boiling
 * changes its phase, never deletes it. This is an artistic fluid approximation,
 * not an incompressible Navier–Stokes solver. Rigids rasterize their real polygons.
 */
export class Coolant {
  constructor(width=350,height=200,cell=4){
    this.width=width;this.height=height;this.cell=cell;this.tick=0;
    const n=width*height;this.cells=new Uint8Array(n);this.life=new Uint16Array(n);
    this.solid=new Uint8Array(n);this.owner=new Uint32Array(n);this.stamp=new Uint32Array(n);
  }
  index(x,y){return x<0||y<0||x>=this.width||y>=this.height?-1:y*this.width+x;}
  at(x,y){const i=this.index(Math.floor(x/this.cell),Math.floor(y/this.cell));return i<0?0:this.cells[i];}
  seed(x,y,width,height,type=WATER){
    let count=0;
    for(let cy=Math.max(0,Math.floor(y/this.cell));cy<Math.min(this.height,Math.ceil((y+height)/this.cell));cy++)
      for(let cx=Math.max(0,Math.floor(x/this.cell));cx<Math.min(this.width,Math.ceil((x+width)/this.cell));cx++){
        const i=this.index(cx,cy);if(!this.cells[i]&&!this.solid[i]){this.cells[i]=type;this.life[i]=type===STEAM?180:0;count++;}
      }
    return count;
  }
  rasterize(parts){
    this.solid.fill(0);this.owner.fill(0);
    for(const p of parts){
      const {bounds,vertices}=p.body;if(!bounds||!vertices)continue;
      const minY=Math.max(0,Math.floor(bounds.min.y/this.cell)),maxY=Math.min(this.height-1,Math.floor(bounds.max.y/this.cell));
      const minX=Math.max(0,Math.floor(bounds.min.x/this.cell)),maxX=Math.min(this.width-1,Math.floor(bounds.max.x/this.cell));
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const px=(x+.5)*this.cell,py=(y+.5)*this.cell;let inside=false;
        for(let a=0,b=vertices.length-1;a<vertices.length;b=a++){
          const va=vertices[a],vb=vertices[b];
          if((va.y>py)!==(vb.y>py)&&px<(vb.x-va.x)*(py-va.y)/(vb.y-va.y)+va.x)inside=!inside;
        }
        if(inside){const index=this.index(x,y);this.solid[index]=1;this.owner[index]=p.id;}
      }
    }
  }
  move(from,x,y){
    const to=this.index(x,y);if(to<0||this.solid[to]||this.cells[to])return false;
    this.cells[to]=this.cells[from];this.life[to]=this.life[from];this.stamp[to]=this.tick;
    this.cells[from]=0;this.life[from]=0;return true;
  }
  level(from,x,y,side){
    // Pressure relaxation: parcels can exchange places through contiguous water,
    // but never cross a solid wall. Local one-cell side motion behaves like sand.
    for(let r=1;r<=16;r++){
      const to=this.index(x+side*r,y);if(to<0||this.solid[to])break;
      if(!this.cells[to])return this.move(from,x+side*r,y);
      if(this.cells[to]===STEAM)break;
    }
    return false;
  }
  step(){
    this.tick++;
    // Bottom-up water prevents moving one parcel repeatedly in a single step.
    for(let y=this.height-1;y>=0;y--)for(let n=0;n<this.width;n++){
      const x=this.tick%2?n:this.width-1-n,i=this.index(x,y);
      if(this.cells[i]!==WATER||this.stamp[i]===this.tick)continue;
      const side=((x*13+y*7+this.tick)%2)*2-1;
      if(this.solid[i]){
        // A newly entering rigid displaces, rather than destroys, trapped liquid.
        // Fully sealed parcels remain compressed until an opening is available.
        const owner=this.owner[i];let moved=false;
        for(const [dx,dy] of [[0,-1],[side,0],[-side,0],[0,1]]){
          for(let r=1;r<=8;r++){
            const to=this.index(x+dx*r,y+dy*r);if(to<0||(this.solid[to]&&this.owner[to]!==owner))break;
            if(this.move(i,x+dx*r,y+dy*r)){moved=true;break;}
          }
          if(moved)break;
        }
        continue;
      }
      this.move(i,x,y+1)||this.move(i,x+side,y+1)||this.move(i,x-side,y+1)||this.level(i,x,y,side)||this.level(i,x,y,-side);
    }
    for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++){
      const i=this.index(x,y);if(this.cells[i]!==STEAM||this.stamp[i]===this.tick)continue;
      if(this.life[i]>0)this.life[i]--;else{this.cells[i]=WATER;continue;}
      const side=((x+y+this.tick)%2)*2-1;
      this.move(i,x,y-1)||this.move(i,x+side,y-1)||this.move(i,x-side,y-1)||this.move(i,x+side,y)||this.move(i,x-side,y);
    }
  }
  couple(parts){
    for(const p of parts){
      p.wet=0;if(p.fixed&&p.width>300)continue;
      const b=p.body,hw=p.width/2,hh=p.height/2;
      const probes=p.radius?Array.from({length:12},(_,i)=>[Math.cos(i*Math.PI/6)*(p.radius+this.cell),Math.sin(i*Math.PI/6)*(p.radius+this.cell)]):
        [-1,0,1].flatMap(t=>[[-hw-this.cell,t*(hh-2)],[hw+this.cell,t*(hh-2)],[t*(hw-2),-hh-this.cell],[t*(hw-2),hh+this.cell]]);
      const cos=Math.cos(b.angle),sin=Math.sin(b.angle);
      for(const [dx,dy] of probes){
        const x=Math.floor((b.position.x+cos*dx-sin*dy)/this.cell),y=Math.floor((b.position.y+sin*dx+cos*dy)/this.cell),i=this.index(x,y);
        if(i<0||this.cells[i]!==WATER)continue;
        p.wet+=1/probes.length;
        if(p.heat>.5){this.cells[i]=STEAM;this.life[i]=180;}
      }
      if(!p.wet)continue;
      p.heat=Math.max(0,p.heat-p.wet*.45);
      if(p.heat<.6)p.burning=false;
      if(!p.fixed){
        const lift=p.material==='fuel'?1.8:.7;
        Matter.Body.applyForce(b,b.position,{x:0,y:-b.mass*.001*p.wet*lift});
        Matter.Body.setVelocity(b,{x:b.velocity.x*(1-p.wet*.025),y:b.velocity.y*(1-p.wet*.025)});
      }
    }
  }
  blast(x,y,radius=180){
    const moved=new Set();
    const cx=x/this.cell,cy=y/this.cell,r=radius/this.cell;
    for(let gy=Math.max(0,Math.floor(cy-r));gy<Math.min(this.height,cy+r);gy++)for(let gx=Math.max(0,Math.floor(cx-r));gx<Math.min(this.width,cx+r);gx++){
      const i=this.index(gx,gy);if(!this.cells[i]||moved.has(i))continue;
      const dx=gx-cx,dy=gy-cy,d=Math.hypot(dx,dy);if(d>r)continue;
      if(d<r*.2){this.cells[i]=STEAM;this.life[i]=180;}
      const distance=(1-d/r)*8;
      const tx=Math.round(gx+dx/Math.max(1,d)*distance),ty=Math.round(gy+dy/Math.max(1,d)*distance);
      let blocked=false;const steps=Math.max(Math.abs(tx-gx),Math.abs(ty-gy));
      for(let s=1;s<=steps;s++){const next=this.index(Math.round(gx+(tx-gx)*s/steps),Math.round(gy+(ty-gy)*s/steps));if(next<0||this.solid[next]){blocked=true;break;}}
      if(!blocked&&this.move(i,tx,ty))moved.add(this.index(tx,ty));
    }
  }
  mass(){let n=0;for(const cell of this.cells)if(cell)n++;return n;}
}
