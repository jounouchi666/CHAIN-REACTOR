import Matter from 'matter-js';
export class Editor {
  constructor(world) { this.world=world;this.undoStack=[]; }
  checkpoint() { this.undoStack.push(this.world.snapshot());const limit=this.world.parts.size>180||this.world.coolant?6:24;while(this.undoStack.length>limit)this.undoStack.shift(); }
  undo() { const state=this.undoStack.pop();if(!state)return false;this.world.restore(state);return true; }
  pick(x,y) {
    const bodies=Matter.Query.point([...this.world.parts.values()].map(p=>p.body),{x,y});
    return bodies.length?this.world.parts.get(bodies.at(-1).plugin.partId):null;
  }
  move(id,x,y) {
    const part=this.world.parts.get(id);if(!part||!Number.isFinite(x)||!Number.isFinite(y))return;
    Matter.Body.setPosition(part.body,{x,y});Matter.Body.setVelocity(part.body,{x:0,y:0});Matter.Body.setAngularVelocity(part.body,0);
    Matter.Pairs.clear(this.world.engine.pairs);
  }
  rotate(id,delta){const p=this.world.parts.get(id);if(!p)return;Matter.Body.setAngle(p.body,Math.atan2(Math.sin(p.body.angle+delta),Math.cos(p.body.angle+delta)));Matter.Body.setAngularVelocity(p.body,0);Matter.Pairs.clear(this.world.engine.pairs);}
  anchor(id){const p=this.world.parts.get(id);if(!p)return;p.fixed=!p.fixed;Matter.Body.setStatic(p.body,p.fixed);Matter.Body.setVelocity(p.body,{x:0,y:0});Matter.Body.setAngularVelocity(p.body,0);Matter.Pairs.clear(this.world.engine.pairs);return p.fixed;}
  remove(id) {
    const part=this.world.parts.get(id);if(!part)return false;
    for(const link of this.world.links)if(link.a===id||link.b===id)Matter.Composite.remove(this.world.engine.world,link.constraint);
    this.world.links=this.world.links.filter(l=>l.a!==id&&l.b!==id);
    this.world.wires=this.world.wires.filter(w=>w.a!==id&&w.b!==id);
    Matter.Composite.remove(this.world.engine.world,part.body);this.world.parts.delete(id);Matter.Pairs.clear(this.world.engine.pairs);return true;
  }
}
