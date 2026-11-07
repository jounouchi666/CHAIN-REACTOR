import test from 'node:test';import assert from 'node:assert/strict';import {Camera} from '../src/camera.js';
test('zoom anchors the pointer and inverse coordinates roundtrip',()=>{
  const c=new Camera();const before=c.world(450,320);c.zoomAt(450,320,2);
  assert.deepEqual(c.world(450,320),before);c.pan(35,-12);
  const point=c.screen(100,250),roundtrip=c.world(point.x,point.y);
  assert.equal(roundtrip.x,100);assert.equal(roundtrip.y,250);
  c.zoomAt(0,0,999);assert.equal(c.zoom,3);
});
