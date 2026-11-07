import test from 'node:test';import assert from 'node:assert/strict';import {Effects} from '../src/effects.js';
test('effects cap load without changing world, reduced motion empties particles',()=>{
 const fx=new Effects(),world={parts:new Map()};
 for(let i=0;i<100;i++)fx.emit({type:'explosion',x:10,y:20,tick:i},world);
 assert.equal(fx.particles.length,420);for(let i=0;i<100;i++)fx.measure(40);assert.equal(fx.level,.35);
 fx.reduced=true;fx.update(.016);assert.equal(fx.particles.length,0);assert.equal(fx.shake,0);
});
