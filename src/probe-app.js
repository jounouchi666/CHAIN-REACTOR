import { createProbe } from './probes.js';
import { DT } from './physics.js';
const canvas = document.querySelector('#view'), ctx = canvas.getContext('2d');
let world, initial, playing = true, accumulator = 0, previous = performance.now(), blasts = [], count = 0;
function load() { world = createProbe(document.querySelector('#kind').value); initial = world.snapshot(); blasts = []; count = 0; }
load();
document.querySelector('#kind').onchange = load;
document.querySelector('#reset').onclick = () => { world.restore(initial); blasts = []; count = 0; };
document.querySelector('#pause').onclick = () => { playing = !playing; document.querySelector('#pause').textContent = playing ? '停止' : '再開'; };
canvas.onpointerdown = event => {
  const box = canvas.getBoundingClientRect(), x = (event.clientX-box.left)/box.width*1400, y = (event.clientY-box.top)/box.height*800;
  if (event.shiftKey) world.ignite(x,y,75); else world.impulse(x,y,220,1800);
};
canvas.onkeydown = event => { if (event.code === 'Space') { event.preventDefault(); document.querySelector('#pause').click(); } if(event.code==='KeyR') document.querySelector('#reset').click(); };
function frame(now) {
  accumulator += Math.min(0.05, (now-previous)/1000); previous=now;
  while(accumulator>=DT) {
    if(playing) { world.step(); for(const e of world.events) if(e.type==='explosion') { blasts.push({...e,age:0}); count++; } }
    accumulator-=DT;
  }
  ctx.fillStyle='#101319'; ctx.fillRect(0,0,1400,800);
  ctx.strokeStyle='#334353'; ctx.lineWidth=2;
  const lookup=new Map(world.bodies.map(b=>[b.id,b]));
  for(const j of world.joints) if(!j.broken) { const a=lookup.get(j.a), b=lookup.get(j.b);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke(); }
  for(const b of world.bodies) { ctx.fillStyle=b.spent?'#4e3734':b.burning?'#fff0a0':b.material==='fuel'?'#f47836':b.inv?'#a6c6dc':'#465973';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill(); }
  for(const e of blasts) { e.age+=0.016;ctx.globalAlpha=Math.max(0,1-e.age*2);ctx.strokeStyle='#ffc05b';ctx.lineWidth=5;ctx.beginPath();ctx.arc(e.x,e.y,e.radius*Math.min(1,e.age*3),0,Math.PI*2);ctx.stroke(); } ctx.globalAlpha=1;blasts=blasts.filter(e=>e.age<0.5);
  document.querySelector('#stats').textContent=`T${world.tick} / 破断 ${world.joints.filter(j=>j.broken).length} / 爆発 ${count}`;
  requestAnimationFrame(frame);
} requestAnimationFrame(frame);
