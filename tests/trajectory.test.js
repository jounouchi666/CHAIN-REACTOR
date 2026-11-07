import test from 'node:test';
import assert from 'node:assert/strict';
import {freeFlight} from '../src/trajectory.js';
import {RigidWorld} from '../src/rigid-world.js';
test('free-flight guide agrees with the real rigid solver before collisions',()=>{
  const w=new RigidWorld(),p=w.launch(90,550,1000,300,45),points=freeFlight(90,550,1000,300);
  for(let i=1;i<80;i++){w.step();assert.ok(Math.hypot(p.body.position.x-points[i].x,p.body.position.y-points[i].y)<1e-7);}
});
