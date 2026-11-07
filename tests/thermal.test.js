import test from 'node:test';
import assert from 'node:assert/strict';
import { Physics } from '../src/physics.js';

test('one ignition propagates heat, detonates neighbors and breaks physical joints', () => {
  const w = new Physics({ gravity: 0 });
  const fuel = [0, 1, 2, 3].map(i => w.body({ x: 200 + i * 65, y: 200, material: 'fuel', fixed: true }));
  const load = w.body({ x: 200, y: 240 });
  w.joint(fuel[0], load, { strength: 10000 });
  const initial = w.snapshot();
  function run() {
    w.ignite(200, 200, 15);
    const events = [];
    for (let i = 0; i < 600; i++) { w.step(); events.push(...w.events.filter(e => e.type === 'explosion')); }
    return events;
  }
  const events = run();
  assert.equal(events.length, 4);
  assert.ok(events[3].tick > events[0].tick);
  assert.equal(w.joints[0].broken, true);
  const final = w.snapshot();
  w.restore(initial);
  assert.deepEqual(run(), events);
  assert.deepEqual(w.snapshot(), final);
});
