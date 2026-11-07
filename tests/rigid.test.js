import test from 'node:test';
import assert from 'node:assert/strict';
import { stableFoundry,RigidWorld } from '../src/rigid-world.js';

test('full rigid checkpoint replays rotations and contacts exactly', () => {
  const world = stableFoundry();
  for (let i = 0; i < 120; i++) world.step();
  world.launch(100, 550, 500, 550, 45);
  for (let i = 0; i < 30; i++) world.step();
  const checkpoint = world.snapshot();
  function finish() {
    for (let i = 0; i < 240; i++) world.step();
    return [...world.parts.values()].map(p => [p.id, p.body.position.x, p.body.position.y, p.body.angle, p.body.velocity.x, p.body.velocity.y]);
  }
  const first = finish();
  world.restore(checkpoint);
  assert.deepEqual(finish(), first);
});

test('foundry waits intact, aimed shot changes its physical outcome', () => {
  const idle = stableFoundry(), hit = stableFoundry();
  for (let i = 0; i < 600; i++) { idle.step(); hit.step(); }
  const baseline = [...idle.parts.values()].filter(p => !p.fixed);
  assert.ok(baseline.every(p => Math.abs(p.body.angle) < 0.1));
  hit.launch(100, 550, 500, 550, 45);
  for (let i = 0; i < 360; i++) { idle.step(); hit.step(); }
  let displaced = 0;
  for (const p of baseline) {
    const other = hit.parts.get(p.id);
    if (Math.hypot(p.body.position.x - other.body.position.x, p.body.position.y - other.body.position.y) > 20) displaced++;
  }
  assert.ok(displaced >= 3, `only ${displaced} parts displaced`);
});

test('rigid API rejects corrupt geometry and foreign endpoints without partial mutation',()=>{
  const w=new RigidWorld(),a=w.add({x:10,y:10}),b=w.add({x:80,y:10}),foreign=new RigidWorld().add({x:0,y:0});
  for(const input of [{x:NaN,y:0},{x:0,y:0,width:-1},{x:0,y:0,material:'unknown'}])assert.throws(()=>w.add(input));
  assert.throws(()=>w.launch(0,0,Infinity,0));assert.equal(w.parts.size,2);
  assert.throws(()=>w.connect(a,foreign));assert.throws(()=>w.wire(a,a));
  assert.equal(w.connect(a,b),w.connect(b,a));assert.equal(w.wire(a,b),w.wire(b,a));
  assert.equal(w.links.length,1);assert.equal(w.wires.length,1);
});
