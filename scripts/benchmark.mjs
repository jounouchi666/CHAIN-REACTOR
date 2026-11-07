import {performance} from 'node:perf_hooks';
import {RigidWorld} from '../src/rigid-world.js';
for(const count of [100,300,600]){
  const w=new RigidWorld();w.add({x:700,y:800,width:1500,height:50,fixed:true});
  for(let i=0;i<count;i++)w.add({x:200+(i%24)*42,y:730-Math.floor(i/24)*28,width:38,height:24,material:i%4===0?'fuel':'steel'});
  const times=[];w.ignite(250,700,80);let peak=0;
  for(let i=0;i<600;i++){const start=performance.now();w.step();times.push(performance.now()-start);peak=Math.max(peak,w.events.length);}
  times.sort((a,b)=>a-b);
  console.log(JSON.stringify({bodies:count,p50:times[300],p95:times[570],max:times.at(-1),peakEvents:peak}));
}
