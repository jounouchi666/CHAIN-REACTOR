/** A bounded recording of measured render states, not a second physics simulation.
 * Contact caches belong to rewind checkpoints; tapes never retain those graphs.
 * 12 samples/s, last 30 seconds. Interpolation is visual only and cannot alter a world.
 */
export class Tape {
  constructor(){this.frames=[];this.pending=[];this.limit=360;this.explosionCount=0;}
  clear(){this.frames=[];this.pending=[];this.explosionCount=0;}
  capture(world){
    this.explosionCount+=world.events.filter(e=>e.type==='explosion').length;
    let impact=false;this.pending.push(...world.events.filter(e=>{if(['explosion','relay','fracture'].includes(e.type))return true;if(e.type==='impact'&&e.speed>=2&&!impact){impact=true;return true;}return false;}).map(e=>({...e})));
    if(world.tick%10&&this.frames.length)return;
    const parts=new Map();
    for(const p of world.parts.values())parts.set(p.id,{
      id:p.id,width:p.width,height:p.height,radius:p.radius,fixed:p.fixed,material:p.material,
      heat:p.heat,burning:p.burning,spent:p.spent,powered:p.powered,device:p.device,latched:p.latched,
      body:{position:{...p.body.position},angle:p.body.angle},
    });
    this.frames.push({tick:world.tick,explosionCount:this.explosionCount,parts,links:world.links.map(l=>({a:l.a,b:l.b,broken:l.broken})),
      wires:world.wires.map(w=>({...w})),coolant:world.coolant?{width:world.coolant.width,height:world.coolant.height,cell:world.coolant.cell,cells:world.coolant.cells.slice()}:null,events:this.pending});
    this.pending=[];if(this.frames.length>this.limit)this.frames.shift();
  }
  get start(){return this.frames[0]?.tick??0;}
  get end(){return this.frames.at(-1)?.tick??0;}
  truncate(tick){this.frames=this.frames.filter(f=>f.tick<=tick);this.pending=[];this.explosionCount=this.frames.at(-1)?.explosionCount??0;}
  sample(tick){
    if(!this.frames.length)return null;
    tick=Math.max(this.start,Math.min(this.end,tick));
    let index=this.frames.findIndex(f=>f.tick>tick);if(index<0)index=this.frames.length;
    const a=this.frames[Math.max(0,index-1)],b=this.frames[Math.min(this.frames.length-1,index)];
    const ratio=a===b?0:(tick-a.tick)/(b.tick-a.tick),parts=new Map();
    for(const [id,p] of a.parts){
      const q=b.parts.get(id)||p;
      // Geometry may change after undo/branch; no interpolation between different objects.
      const same=p.width===q.width&&p.height===q.height&&p.radius===q.radius&&p.material===q.material;
      const t=same?ratio:0;
      parts.set(id,{...p,body:{position:{x:p.body.position.x+(q.body.position.x-p.body.position.x)*t,y:p.body.position.y+(q.body.position.y-p.body.position.y)*t},angle:p.body.angle+(q.body.angle-p.body.angle)*t}});
    }
    const events=this.frames.slice(0,index+1).flatMap(f=>f.events).filter(e=>e.tick<=tick);
    const explosionCount=a.explosionCount+(b===a?0:b.events.filter(e=>e.type==='explosion'&&e.tick>a.tick&&e.tick<=tick).length);
    return {...a,tick,parts,events,explosionCount};
  }
}
