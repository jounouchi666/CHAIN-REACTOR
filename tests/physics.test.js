import test from 'node:test';
import assert from 'node:assert/strict';
import { Physics } from '../src/physics.js';

test('collision transfers momentum and resolves coincident centers', () => {
  const w = new Physics({ gravity: 0 });
  const a = w.body({ x: 100, y: 100, vx: 120 });
  const b = w.body({ x: 124, y: 100 });
  for (let i = 0; i < 5; i++) w.step();
  assert.ok(b.vx > a.vx);
  const c = w.body({ x: b.x, y: b.y });
  w.step();
  assert.ok(Number.isFinite(c.x));
  assert.ok(Math.hypot(c.x - b.x, c.y - b.y) > 0);
});

test('rewind restores the actual future, including fracture', () => {
  const world = new Physics();
  const anchor = world.body({ x: 300, y: 100, fixed: true });
  const load = world.body({ x: 300, y: 180 });
  world.joint(anchor, load, { strength: 30 });
  const initial = world.snapshot();
  world.impulse(250, 180, 150, 900);
  for (let i = 0; i < 240; i++) world.step();
  const first = world.snapshot();
  assert.equal(first.joints[0].broken, true);
  world.restore(initial);
  world.impulse(250, 180, 150, 900);
  for (let i = 0; i < 240; i++) world.step();
  assert.deepEqual(world.snapshot(), first);
});

test('fixed anchors survive impulses and invalid bodies are rejected', () => {
  const world = new Physics();
  const anchor = world.body({ x: 100, y: 100, fixed: true });
  world.impulse(80, 100, 200, 5000);
  for (let i = 0; i < 120; i++) world.step();
  assert.equal(anchor.x, 100); assert.equal(anchor.y, 100);
  assert.throws(() => world.body({ x: NaN, y: 0 }), /Invalid/);
});
