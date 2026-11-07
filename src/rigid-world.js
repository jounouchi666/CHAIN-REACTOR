import Matter from 'matter-js';
import {Coolant} from './coolant.js';
const { Engine, Bodies, Body, Composite, Constraint, Events } = Matter;
export const STEP_MS = 1000 / 120;

/** Scene-owned IDs keep saved inputs independent of Matter's global ID counter. */
export class RigidWorld {
  constructor() {
    this.engine = Engine.create({ positionIterations: 10, velocityIterations: 8, constraintIterations: 6 });
    this.engine.gravity.y = 1;
    this.parts = new Map(); this.links = []; this.wires = []; this.events = []; this.tick = 0; this.nextId = 1;
    this.coolant=null;
    this.pendingFractures=new Set();
    Events.on(this.engine, 'collisionStart', event => {
      for (const pair of event.pairs) {
        const speed = Math.hypot(pair.bodyA.velocity.x - pair.bodyB.velocity.x, pair.bodyA.velocity.y - pair.bodyB.velocity.y);
        for (const [body, other] of [[pair.bodyA,pair.bodyB],[pair.bodyB,pair.bodyA]]) {
          const relay=this.parts.get(body.plugin.partId);
          if(relay?.material==='glass'&&!relay.fragment&&speed>4)this.pendingFractures.add(relay.id);
          if(relay?.device==='relay' && !relay.latched && !other.isStatic && speed>1) {
            relay.latched=true;
            this.events.push({type:'relay',source:relay.id,trigger:other.plugin.partId,x:body.position.x,y:body.position.y,tick:this.tick});
          }
          if(relay?.fuel>0&&!relay.spent&&!relay.burning&&speed>12){
            relay.heat=1;relay.ignitedBy={type:'impact',source:other.plugin.partId,depth:0};relay.chainDepth=0;
          }
        }
        if (speed > 1){const materials=[this.parts.get(pair.bodyA.plugin.partId)?.material,this.parts.get(pair.bodyB.plugin.partId)?.material];this.events.push({ type: 'impact', a: pair.bodyA.plugin.partId, b: pair.bodyB.plugin.partId, speed,material:materials.includes('glass')?'glass':materials.includes('fuel')?'fuel':'steel', tick: this.tick });}
      }
    });
  }
  add({ x, y, width = 40, height = 40, radius = 0, fixed = false, material = 'steel', angle = 0 }, fragment = false) {
    if(![x,y,width,height,radius,angle].every(Number.isFinite)||Math.abs(x)>1e6||Math.abs(y)>1e6||width<2||width>1500||height<2||height>1500||radius<0||radius>200||Math.abs(angle)>10000||typeof fixed!=='boolean'||!['steel','fuel','glass'].includes(material)||(material==='glass'&&radius!==0))throw new Error('Invalid rigid geometry');
    if(this.parts.size>=800)throw new Error('Part capacity reached (800)');
    const options = { isStatic: fixed, angle, restitution: 0.12, friction: 0.55, frictionAir: 0.001, density: material === 'steel' ? 0.004 : 0.0015 };
    const body = radius ? Bodies.circle(x, y, radius, options) : Bodies.rectangle(x, y, width, height, options);
    // Admission control prevents adversarial coincident piles from creating O(n²)
    // contact graphs. Fragments replace an existing panel's area, not new input.
    if(!fragment){
      let overlaps=0;
      for(const p of this.parts.values()){
        if(fixed&&p.fixed||!Matter.Bounds.overlaps(body.bounds,p.body.bounds))continue;
        const collision=Matter.Collision.collides(body,p.body);
        const thickness=Math.min(radius?radius*2:Math.min(width,height),p.radius?p.radius*2:Math.min(p.width,p.height));
        if(collision?.depth>thickness*.2&&++overlaps>=12)throw new Error('部品が密集しすぎています。重ならない位置へ置いてください');
      }
    }
    const id = this.nextId++;
    body.plugin.partId = id;
    const part = { id, body, material, heat: 0, fuel: material === 'fuel' ? 1 : 0, width, height, radius, fixed };
    this.parts.set(id, part); Composite.add(this.engine.world, body); return part;
  }
  connect(a, b, { strength = 18, stiffness = 0.85 } = {}) {
    if(!a||!b||a===b||this.parts.get(a.id)!==a||this.parts.get(b.id)!==b||!Number.isFinite(strength)||strength<.01||strength>10000||!Number.isFinite(stiffness)||stiffness<.001||stiffness>1)throw new Error('Invalid rigid joint');
    const existing=this.links.find(l=>!l.broken&&((l.a===a.id&&l.b===b.id)||(l.b===a.id&&l.a===b.id)));if(existing)return existing;
    if(this.links.length>=1200)throw new Error('Joint capacity reached (1200)');
    const constraint = Constraint.create({ bodyA: a.body, bodyB: b.body, stiffness, damping: 0.1 });
    const link = { a: a.id, b: b.id, constraint, strength, broken: false };
    this.links.push(link); Composite.add(this.engine.world, constraint); return link;
  }
  launch(x, y, targetX, targetY, speed = 16) {
    if(![x,y,targetX,targetY,speed].every(Number.isFinite)||Math.abs(targetX)>1e6||Math.abs(targetY)>1e6||speed<=0||speed>100)throw new Error('Invalid launch');
    const shot = this.add({ x, y, radius: 16 });
    Body.setMass(shot.body, 24);
    const distance = Math.hypot(targetX - x, targetY - y) || 1;
    Body.setVelocity(shot.body, { x: (targetX - x) / distance * speed, y: (targetY - y) / distance * speed });
    return shot;
  }
  step() {
    this.tick++; this.events = [];
    this.pendingFractures.clear();
    if(this.coolant&&this.tick%4===1){this.coolant.rasterize(this.parts.values());this.coolant.step();}
    this.react();
    Engine.update(this.engine, STEP_MS);
    for(const id of this.pendingFractures)this.fracturePanel(id);
    for (const link of this.links) {
      if (link.broken) continue;
      const a = this.parts.get(link.a).body, b = this.parts.get(link.b).body;
      const strain = Math.abs(Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y) - link.constraint.length);
      if (strain > link.strength) {
        link.broken = true; Composite.remove(this.engine.world, link.constraint);
        this.events.push({ type: 'fracture', a: link.a, b: link.b, tick: this.tick });
      }
    }
  }
  fracturePanel(id){
    const source=this.parts.get(id);if(!source||source.fragment||source.material!=='glass')return;
    const count=Math.max(1,Math.min(4,Math.floor(source.width/2),801-this.parts.size));
    const b=source.body,{x,y}=b.position;
    Composite.remove(this.engine.world,b);this.parts.delete(id);
    for(const link of this.links)if(link.a===id||link.b===id)Composite.remove(this.engine.world,link.constraint);
    this.links=this.links.filter(l=>l.a!==id&&l.b!==id);this.wires=this.wires.filter(w=>w.a!==id&&w.b!==id);
    for(let i=0;i<count;i++){
      const offset=(i-(count-1)/2)*source.width/count;
      const p=this.add({x:x+Math.cos(b.angle)*offset,y:y+Math.sin(b.angle)*offset,width:source.width/count,height:source.height,angle:b.angle,material:'glass'},true);
      p.fragment=true;p.heat=source.heat;Matter.Body.setVelocity(p.body,{x:b.velocity.x+(i-(count-1)/2)*.6,y:b.velocity.y});
      Matter.Body.setAngularVelocity(p.body,b.angularVelocity+(i%2?1:-1)*.015);
    }
    this.events.push({type:'fracture',source:id,x,y,tick:this.tick,kind:'panel'});
  }
  wire(a, b, maxLength = 400) {
    if(!a||!b||a===b||this.parts.get(a.id)!==a||this.parts.get(b.id)!==b||!Number.isFinite(maxLength)||maxLength<1||maxLength>5000)throw new Error('Invalid wire');
    const existing=this.wires.find(w=>!w.broken&&((w.a===a.id&&w.b===b.id)||(w.b===a.id&&w.a===b.id)));if(existing)return existing;
    if(this.wires.length>=1200)throw new Error('Wire capacity reached (1200)');
    const wire = { a: a.id, b: b.id, maxLength, broken: false };
    this.wires.push(wire); return wire;
  }
  enableCoolant(){return this.coolant??=new Coolant();}
  snapshot() {
    // Clone the entire reference graph together: constraints, collision pairs and parts
    // must continue to point at the same cloned bodies. Event closures stay outside it.
    return structuredClone({ engine: { ...this.engine, events: {} }, parts: this.parts,
      links: this.links, wires: this.wires, coolant:this.coolant, tick: this.tick, nextId: this.nextId });
  }
  restore(snapshot) {
    const handlers = this.engine.events;
    const restored = structuredClone(snapshot);
    Object.assign(this, restored);
    if(this.coolant)Object.setPrototypeOf(this.coolant,Coolant.prototype);
    this.engine.events = handlers;
    this.events = [];
  }
  ignite(x, y, radius = 75, cause = null) {
    for (const part of this.parts.values()) if (!part.spent && Math.hypot(part.body.position.x - x, part.body.position.y - y) < radius) {
      if(part.heat<.6&&!part.burning){part.ignitedBy=cause;part.chainDepth=cause?.depth||0;}
      part.heat = 1;
    }
  }
  react() {
    const parts = [...this.parts.values()];
    for (const p of parts) p.powered = p.device === 'battery' && p.enabled !== false && !p.spent;
    for (const wire of this.wires) {
      const a = this.parts.get(wire.a), b = this.parts.get(wire.b);
      if (Math.hypot(a.body.position.x - b.body.position.x, a.body.position.y - b.body.position.y) > wire.maxLength || a.spent || b.spent) wire.broken = true;
    }
    const queue = parts.filter(p => p.powered);
    for (let i = 0; i < queue.length; i++) {
      const source = queue[i];
      if ((source.device === 'switch' && source.enabled === false) || (source.device==='relay'&&!source.latched)) continue;
      for (const wire of this.wires) {
        if (wire.broken || (wire.a !== source.id && wire.b !== source.id)) continue;
        const next = this.parts.get(wire.a === source.id ? wire.b : wire.a);
        if (!next.powered) { next.powered = true; queue.push(next); }
      }
    }
    // Thermal transfer uses the previous solver's actual contacts, not all-pairs proximity.
    // Stage deltas before applying them so part insertion order cannot amplify a hot contact.
    const heatDelta=new Map();
    for(const pair of this.engine.pairs.list) {
      if(!pair.isActive)continue;
      const a=this.parts.get(pair.bodyA.plugin.partId),b=this.parts.get(pair.bodyB.plugin.partId);
      if(!a||!b)continue;
      const transfer=(a.heat-b.heat)*.018;
      heatDelta.set(a.id,(heatDelta.get(a.id)||0)-transfer);
      heatDelta.set(b.id,(heatDelta.get(b.id)||0)+transfer);
      const hot=a.heat>b.heat?a:b,cold=hot===a?b:a;
      if(hot.burning&&!cold.burning&&!cold.spent&&cold.heat<.6) {
        cold.ignitedBy={type:'contact',source:hot.id,depth:(hot.chainDepth||0)+1};
        cold.chainDepth=(hot.chainDepth||0)+1;
      }
    }
    for(const [id,delta] of heatDelta){const p=this.parts.get(id);p.heat=Math.max(0,Math.min(1,p.heat+delta));}
    for (const p of parts) {
      if (p.powered && p.device === 'igniter' && !(p.wet>.2)) this.ignite(p.body.position.x, p.body.position.y, 85, { type:'electric', source:p.id, depth:0 });
      if (p.powered && (p.device === 'magnet'||p.device==='gravity')) {
        const gravity=p.device==='gravity';
        for (const target of parts) {
          if (target.fixed || (!gravity&&target.material !== 'steel')) continue;
          const dx = p.body.position.x - target.body.position.x, dy = p.body.position.y - target.body.position.y;
          const d = Math.hypot(dx, dy);
          if (d < 10 || d > (gravity?600:360)) continue;
          const force = Math.min(gravity?.006:.008, (gravity?260:180) / (d * d)) * target.body.mass;
          Body.applyForce(target.body, target.body.position, { x: dx / d * force, y: dy / d * force });
        }
      }
    }
    if(this.coolant)this.coolant.couple(parts);
    for(const p of parts){
      p.heat = Math.max(0, p.heat - 0.001);
      if (p.fuel > 0 && p.heat > 0.6) p.burning = true;
      if (p.burning && !p.spent) { p.heat = Math.min(1,p.heat+.015); p.fuel -= 1 / 45; if (p.fuel <= 0) this.explode(p); }
    }
  }
  explode(source) {
    source.spent = true; source.burning = false;
    const origin = source.body.position;
    this.coolant?.blast(origin.x,origin.y);
    for (const p of this.parts.values()) {
      const dx = p.body.position.x - origin.x, dy = p.body.position.y - origin.y, d = Math.hypot(dx, dy);
      if (d > 240 || p === source) continue;
      if(p.material==='glass'&&!p.fragment&&d<160)this.pendingFractures.add(p.id);
      if (d < 125 && !p.spent) {
        if(p.heat<.6&&!p.burning){p.ignitedBy={type:'explosion',source:source.id,depth:(source.chainDepth||0)+1};p.chainDepth=(source.chainDepth||0)+1;}
        p.heat = Math.max(p.heat, 0.9);
      }
      if (!p.fixed) Body.setVelocity(p.body, { x: p.body.velocity.x + dx / Math.max(d, 1) * (1 - d / 240) * 18, y: p.body.velocity.y + dy / Math.max(d, 1) * (1 - d / 240) * 18 });
    }
    for (const link of this.links) if (!link.broken && (link.a === source.id || link.b === source.id)) {
      link.broken = true; Composite.remove(this.engine.world, link.constraint);
    }
    this.events.push({ type: 'explosion', source: source.id, parent:source.ignitedBy||null, depth:source.chainDepth||0, x: origin.x, y: origin.y, tick: this.tick });
  }
}

export function stableFoundry() {
  const world = new RigidWorld();
  world.add({ x: 700, y: 800, width: 1500, height: 50, fixed: true });
  for (let tower = 0; tower < 4; tower++) {
    for (let row = 0; row < 7; row++) {
      world.add({ x: 480 + tower * 190, y: 751 - row * 49, width: 74, height: 46, material: row === 3 ? 'fuel' : 'steel' });
    }
  }
  return world;
}
