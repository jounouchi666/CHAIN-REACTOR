import test from 'node:test';
import assert from 'node:assert/strict';
import { RigidWorld } from '../src/rigid-world.js';

test('electric ignition becomes a delayed physical explosion chain', () => {
  const w = new RigidWorld(); w.engine.gravity.y = 0;
  const battery = w.add({ x: 100, y: 100, fixed: true }); battery.device = 'battery';
  const igniter = w.add({ x: 200, y: 100, fixed: true }); igniter.device = 'igniter';
  w.wire(battery, igniter);
  const a = w.add({ x: 230, y: 100, material: 'fuel', fixed: true });
  const b = w.add({ x: 340, y: 100, material: 'fuel', fixed: true });
  const projectile = w.add({ x: 390, y: 100 });
  const initialX = projectile.body.position.x;
  const events = [];
  for (let i = 0; i < 180; i++) { w.step(); events.push(...w.events.filter(e => e.type === 'explosion')); }
  assert.ok(a.spent && b.spent);
  assert.ok(events.find(e => e.source === b.id).tick > events.find(e => e.source === a.id).tick);
  assert.equal(events.find(e=>e.source===a.id).parent.type,'electric');
  assert.equal(events.find(e=>e.source===b.id).parent.source,a.id);
  assert.equal(events.find(e=>e.source===b.id).depth,1);
  assert.ok(projectile.body.position.x > initialX + 30);
});

test('wire break removes power and field force', () => {
  const w = new RigidWorld(); w.engine.gravity.y = 0;
  const battery = w.add({ x: 100, y: 100, fixed: true }); battery.device = 'battery';
  const magnet = w.add({ x: 220, y: 100, fixed: true }); magnet.device = 'magnet';
  const wire = w.wire(battery, magnet, 150);
  const target = w.add({ x: 350, y: 100 });
  w.step(); assert.ok(target.body.velocity.x < 0); assert.ok(magnet.powered);
  wire.broken = true; w.step(); assert.equal(magnet.powered, false);
});
