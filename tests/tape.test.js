import test from 'node:test';
import assert from 'node:assert/strict';
import {RigidWorld} from '../src/rigid-world.js';
import {Tape} from '../src/tape.js';

test('cumulative explosions survive rolling window and restore on branch',()=>{
  const w=new RigidWorld(),t=new Tape();t.capture(w);
  for(let tick=1;tick<=4000;tick++){
    w.tick=tick;w.events=tick===5||tick===3995?[{type:'explosion',tick}]:[];t.capture(w);
  }
  assert.equal(t.sample(3990).explosionCount,1);
  assert.equal(t.sample(3995).explosionCount,2);
  assert.equal(t.sample(4000).explosionCount,2);
  t.truncate(3990);assert.equal(t.explosionCount,1);
  t.clear();assert.equal(t.explosionCount,0);
});

test('deep coincident inputs are rejected atomically but broad contact floors are allowed',()=>{
  const w=new RigidWorld();for(let i=0;i<12;i++)w.add({x:100,y:100,angle:Math.PI/4,width:100,height:4});
  const id=w.nextId;
  assert.throws(()=>w.add({x:100,y:100,angle:Math.PI/4,width:100,height:4}),/密集/);
  assert.equal(w.parts.size,12);assert.equal(w.nextId,id);
  const floor=new RigidWorld();for(let i=0;i<32;i++)floor.add({x:20+i*40,y:80,width:30,height:40});
  assert.doesNotThrow(()=>floor.add({x:650,y:110,width:1400,height:20,fixed:true}));
});

test('render tape interpolates actual poses, is isolated and bounded, truncates branches',()=>{
  const w=new RigidWorld(),p=w.add({x:100,y:100});const t=new Tape();t.capture(w);
  for(let i=0;i<20;i++){w.step();t.capture(w);}
  const initial=t.sample(0),last=t.sample(20),mid=t.sample(15);
  assert.equal(initial.parts.get(p.id).body.position.y,100);
  assert.equal(last.parts.get(p.id).body.position.y,p.body.position.y);
  assert.ok(mid.parts.get(p.id).body.position.y>t.sample(10).parts.get(p.id).body.position.y);
  mid.parts.get(p.id).body.position.y=-100;
  assert.notEqual(t.sample(15).parts.get(p.id).body.position.y,-100);
  assert.notEqual(p.body.position.y,-100);
  t.truncate(10);assert.equal(t.end,10);
  for(let i=0;i<4000;i++){w.step();t.capture(w);}
  assert.equal(t.frames.length,360);assert.ok(t.start>0);
});
