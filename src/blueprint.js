import Matter from 'matter-js';
import { RigidWorld } from './rigid-world.js';
const MATERIALS = new Set(['steel', 'fuel', 'glass']);
const DEVICES = new Set(['battery', 'switch', 'igniter', 'magnet', 'relay','gravity']);
function number(value, min, max, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
  return value;
}
export function exportBlueprint(world) {
  const coolant=world.coolant?{runs:[]}:null;
  if(coolant){const cells=world.coolant.cells;for(let i=0;i<cells.length;i++){if(!cells[i])continue;const start=i,type=cells[i];while(i+1<cells.length&&cells[i+1]===type)i++;coolant.runs.push([start,i-start+1,type]);}}
  return { kind: 'chain-reactor/blueprint', version: 1,
    coolant,
    parts: [...world.parts.values()].map(p => ({ id: p.id, x: p.body.position.x, y: p.body.position.y, angle: p.body.angle,
      width: p.width, height: p.height, radius: p.radius, fixed: p.fixed, material: p.material,
      device: p.device || null, enabled: p.enabled !== false,fragment:Boolean(p.fragment),locked:Boolean(p.locked) })),
    links: world.links.filter(l => !l.broken).map(l => ({ a: l.a, b: l.b, strength: l.strength, stiffness: l.constraint.stiffness, length: l.constraint.length })),
    wires: world.wires.filter(w => !w.broken).map(w => ({ a: w.a, b: w.b, maxLength: w.maxLength })) };
}
export function importBlueprint(input) {
  if (!input || input.kind !== 'chain-reactor/blueprint' || input.version !== 1) throw new Error('Unsupported blueprint');
  if (!Array.isArray(input.parts) || input.parts.length > 800 || !Array.isArray(input.links) || input.links.length > 1200 || !Array.isArray(input.wires) || input.wires.length > 1200) throw new Error('Blueprint capacity exceeded');
  const world = new RigidWorld(), lookup = new Map();
  for (const p of input.parts) {
    if (!p || !Number.isInteger(p.id) || p.id < 1 || lookup.has(p.id)) throw new Error('Invalid or duplicate part ID');
    if (!MATERIALS.has(p.material) || (p.device !== null && !DEVICES.has(p.device)) || typeof p.fixed !== 'boolean' || typeof p.enabled !== 'boolean') throw new Error('Invalid part type');
    const part = world.add({ x: number(p.x,-2000,5000,'x'), y: number(p.y,-2000,5000,'y'),
      angle: number(p.angle,-10000,10000,'angle'), width: number(p.width,2,1500,'width'), height: number(p.height,2,1500,'height'),
      radius: number(p.radius,0,200,'radius'), fixed:p.fixed,material:p.material });
    part.device = p.device; part.enabled = p.enabled; lookup.set(p.id, part);
    if(p.fragment!==undefined&&typeof p.fragment!=='boolean')throw new Error('Invalid fragment');part.fragment=Boolean(p.fragment);
    if(p.locked!==undefined&&typeof p.locked!=='boolean')throw new Error('Invalid protection');part.locked=Boolean(p.locked);
    Matter.Body.setVelocity(part.body,{x:0,y:0});
  }
  function endpoints(link) {
    const a=lookup.get(link.a), b=lookup.get(link.b);
    if (!a || !b || a===b) throw new Error('Invalid connection endpoint');
    return [a,b];
  }
  for (const l of input.links) {
    const [a,b]=endpoints(l);
    const link=world.connect(a,b,{strength:number(l.strength,.01,10000,'strength'),stiffness:number(l.stiffness,.001,1,'stiffness')});
    link.constraint.length=number(l.length,0,5000,'length');
  }
  for (const w of input.wires) { const [a,b]=endpoints(w); world.wire(a,b,number(w.maxLength,1,5000,'wire length')); }
  if(input.coolant!=null){
    if(!Array.isArray(input.coolant.runs)||input.coolant.runs.length>70000)throw new Error('Invalid coolant');
    const fluid=world.enableCoolant();let end=0;
    for(const run of input.coolant.runs){
      if(!Array.isArray(run)||run.length!==3||!run.every(Number.isInteger))throw new Error('Invalid coolant run');
      const [start,length,type]=run;
      if(start<end||length<1||start+length>fluid.cells.length||(type!==1&&type!==2))throw new Error('Invalid coolant bounds');
      fluid.cells.fill(type,start,start+length);if(type===2)fluid.life.fill(180,start,start+length);end=start+length;
    }
  }
  return world;
}
