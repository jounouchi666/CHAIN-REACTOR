import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';

test('command boundary protects paused replay and preserves live state',()=>{
  const s=new Simulation('bridge');s.execute({type:'power'});
  for(let i=0;i<240;i++)s.advance();s.playing=false;
  const live=s.world.snapshot();s.execute({type:'replay'});s.update(100);
  assert.equal(s.world.tick,240);assert.throws(()=>s.execute({type:'tool',kind:'fuel',x:500,y:500}));
  s.execute({type:'seek',tick:10});s.execute({type:'step'});assert.equal(s.view().world.tick,11);
  s.execute({type:'replay'});assert.deepEqual(s.world.snapshot(),live);
  const v=s.view();v.world.parts[0].body.position.y=99999;v.world.coolant.cells.fill(0);
  assert.notEqual(s.world.parts.values().next().value.body.position.y,99999);assert.ok(s.world.coolant.mass()>0);
});

test('invalid commands/imports are atomic and worker-sized history stays bounded',()=>{
  const s=new Simulation('core'),before=s.world.parts.size;
  assert.throws(()=>s.execute({type:'tool',kind:'fuel',x:NaN,y:50}));
  assert.throws(()=>s.execute({type:'import',blueprint:{}}));assert.equal(s.world.parts.size,before);
  for(let i=0;i<1600;i++)s.advance();assert.equal(s.history.length,12);
  s.execute({type:'pause'});const tick=s.world.tick;s.execute({type:'rewind'});assert.ok(s.world.tick<=tick-360);
  assert.ok(s.tape.end<=s.world.tick);
  s.execute({type:'tool',kind:'glass',x:700,y:200});const added=s.world.parts.size;
  s.execute({type:'undo'});assert.equal(s.world.parts.size,added-1);
});

test('reset repeats an imported machine rather than replacing it with a preset',()=>{
  const source=new Simulation('magnet'),target=new Simulation('foundry');
  target.execute({type:'import',blueprint:source.execute({type:'export'})});
  const size=target.world.parts.size;target.execute({type:'tool',kind:'fuel',x:350,y:400});
  target.execute({type:'reset'});assert.equal(target.world.parts.size,size);assert.equal(target.view().custom,true);
  assert.equal(target.battery.enabled,false);
  target.execute({type:'scene',id:'core'});assert.equal(target.view().custom,false);
});

test('rewinding keeps one measured previous future, and a shot creates real divergence',()=>{
  const s=new Simulation('foundry');s.execute({type:'power'});for(let i=0;i<480;i++)s.advance();
  s.execute({type:'rewind'});assert.equal(s.playing,false);assert.equal(s.view().ghost.available,true);
  const old=s.ghost;const id=s.world.nextId;s.execute({type:'tool',kind:'fire',x:420,y:400});
  for(let i=0;i<120;i++)s.advance();const view=s.view();
  assert.equal(view.ghost.frame.parts.some(p=>p.id===id),false);
  let delta=0;for(const p of view.ghost.frame.parts){const actual=s.world.parts.get(p.id);if(actual)delta=Math.max(delta,Math.hypot(actual.body.position.x-p.body.position.x,actual.body.position.y-p.body.position.y));}
  assert.ok(delta>10,`branches did not diverge: ${delta}`);
  s.execute({type:'ghost'});assert.equal(s.view().ghost.frame,null);assert.equal(s.ghost,old);
  s.execute({type:'reset'});assert.equal(s.view().ghost.available,false);
});

test('authoring can rotate and anchor a panel, undo it, but cannot remove the chamber',()=>{
  const s=new Simulation();s.execute({type:'blank'});s.execute({type:'tool',kind:'glass',x:700,y:400});const id=s.world.nextId-1;
  s.execute({type:'rotate',x:700,y:400,delta:Math.PI/12});assert.ok(Math.abs(s.world.parts.get(id).body.angle-Math.PI/12)<1e-10);
  s.execute({type:'anchor',x:700,y:400});assert.equal(s.world.parts.get(id).fixed,false);
  s.execute({type:'undo'});assert.equal(s.world.parts.get(id).fixed,true);
  assert.throws(()=>s.execute({type:'tool',kind:'delete',x:700,y:790}),/保護/);
});

test('consecutive rewinds keep the full old future until a new future is recorded',()=>{
  const s=new Simulation('foundry');for(let i=0;i<720;i++)s.advance();
  s.execute({type:'rewind'});const future=s.ghost;assert.equal(future.end,720);
  s.execute({type:'rewind'});assert.equal(s.world.tick,0);assert.equal(s.ghost,future);assert.equal(s.ghost.end,720);
  for(let i=0;i<730;i++)s.advance();assert.equal(s.ghost,null);
});
