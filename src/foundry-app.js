import { stableFoundry, STEP_MS } from './rigid-world.js';
import { createScene, SCENES } from './scenes.js';
import { exportBlueprint, importBlueprint } from './blueprint.js';
import { Editor } from './editor.js';
import { MachineSound } from './sound.js';
import { Camera } from './camera.js';
import { arrangeWorkspace } from './layout.js';
import { createMachineSprites } from './symbols.js';
import { Effects } from './effects.js';
import { Tape } from './tape.js';
import { drawWorld } from './world-renderer.js';
import { CoolantPainter } from './coolant-painter.js';
import { freeFlight } from './trajectory.js';
const coolantPainter=new CoolantPainter();
const tape=new Tape();let replay=null;
const effects=new Effects();
const sprites=createMachineSprites();
const camera=new Camera();
const sound=new MachineSound();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.querySelector('#view'), ctx = canvas.getContext('2d');
const toolSelect=document.createElement('select');toolSelect.setAttribute('aria-label','制作ツール');
for(const [value,label] of [['fire','発射'],['move','掴んで移動'],['delete','削除'],['joint','接合する'],['steel','鋼材を置く'],['fuel','燃料を置く'],['water','冷却水を注ぐ'],['magnet','磁石を置く'],['igniter','点火器を置く'],['relay','衝撃リレーを置く'],['wire','配線する']]){const o=document.createElement('option');o.value=value;o.textContent=label;toolSelect.append(o);}
document.querySelector('header').append(toolSelect);
const panOption=document.createElement('option');panOption.value='pan';panOption.textContent='視点を動かす';toolSelect.append(panOption);
let panPoint=null;
let connectionStart=null, editor, dragging=null;
let world, battery, playing = true, speed = 1, acc = 0, previous = performance.now(), scars = [], waves = [], history = [];
const log=document.createElement('ol');log.id='reaction-log';log.setAttribute('aria-label','反応履歴');document.body.append(log);
function logEvent(e){
  const line=document.createElement('li');
  line.textContent=`${(e.tick/120).toFixed(2)}s — 部品${e.source} 爆発 / ${e.parent?.type==='electric'?'通電点火':e.parent?.type==='explosion'?`部品${e.parent.source}から延焼`:'点火'} / ${e.depth}段目`;
  log.prepend(line);while(log.children.length>8)log.lastChild.remove();
}
function reset() {
  replay=null;tape.clear();
  ({world,battery}=createScene(sceneSelect.value)); scars = []; waves = []; history = [];
  connectionStart=null;dragging=null;panPoint=null;acc=0;
  effects.clear();
  camera.reset();
  log.replaceChildren();
  editor=new Editor(world);
  tape.capture(world);
  document.querySelector('p').textContent=SCENES.find(s=>s.id===sceneSelect.value).prompt;
  document.querySelector('#power').setAttribute('aria-pressed','false');
}
const sceneSelect=document.createElement('select');sceneSelect.setAttribute('aria-label','実験場');
for(const scene of SCENES){const option=document.createElement('option');option.value=scene.id;option.textContent=scene.name;sceneSelect.append(option);}
document.querySelector('header').prepend(sceneSelect);sceneSelect.onchange=reset;
reset();
document.querySelector('#reset').onclick = reset;
function button(id,label,action){const b=document.createElement('button');b.id=id;b.textContent=label;b.onclick=action;document.querySelector('header').append(b);return b;}
const soundButton=button('sound','音を開く',async()=>{
  try{if(sound.enabled){sound.mute();soundButton.textContent='音を開く';}else{await sound.enable();soundButton.textContent='無音にする';}soundButton.setAttribute('aria-pressed',String(sound.enabled));}
  catch{soundButton.textContent='音を再試行';}
});soundButton.setAttribute('aria-pressed','false');
const volume=document.createElement('input');volume.type='range';volume.min='0';volume.max='.7';volume.step='.01';volume.value='.35';volume.setAttribute('aria-label','音量');volume.oninput=()=>sound.setVolume(volume.value);document.querySelector('header').append(volume);
button('undo','編集を戻す',()=>{const id=battery.id;if(editor.undo()){battery=world.parts.get(id);connectionStart=null;dragging=null;history=[];scars=[];waves=[];effects.clear();log.replaceChildren();tape.clear();tape.capture(world);}});
button('camera-reset','全体を見る',()=>camera.reset());
const speedButton=button('speed','速度 1倍',()=>{speed=speed===1?.25:1;speedButton.textContent=`速度 ${speed}倍`;});
function advance(){
  if(world.tick%30===0){history.push({tick:world.tick,snapshot:world.snapshot(),scars:structuredClone(scars)});if(history.length>40)history.shift();}
  world.step();for(const e of world.events){sound.event(e);effects.emit(e,world);if(e.type==='explosion'){scars.push(e);logEvent(e);if(!reducedMotion.matches)waves.push({...e,age:0});}}
  if(connectionStart&&!world.parts.has(connectionStart.id))connectionStart=null;
  tape.capture(world);
}
button('step','1step',()=>{if(replay){replay.playing=false;replay.tick=Math.min(tape.end,replay.tick+1);}else{playing=false;advance();}document.querySelector('#pause').textContent='再開';});
const feedback=document.createElement('span');feedback.setAttribute('role','status');document.querySelector('header').append(feedback);
button('save','設計図を保存',()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(exportBlueprint(world),null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='chain-reactor-blueprint.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
const file=document.createElement('input');file.type='file';file.accept='.json';file.hidden=true;document.body.append(file);
button('load','設計図を読込',()=>file.click());
file.onchange=async()=>{
  const selected=file.files[0];file.value='';if(!selected)return;
  try{
    if(selected.size>2000000)throw new Error('設計図は2MB以内にしてください');
    const restored=importBlueprint(JSON.parse(await selected.text()));
    const source=[...restored.parts.values()].find(p=>p.device==='battery');
    if(!source)throw new Error('電池が必要です');
    world=restored;battery=source;editor=new Editor(world);history=[];scars=[];waves=[];connectionStart=null;dragging=null;playing=false;
    effects.clear();camera.reset();log.replaceChildren();acc=0;
    replay=null;tape.clear();tape.capture(world);
    document.querySelector('#pause').textContent='再開';document.querySelector('#power').setAttribute('aria-pressed',String(battery.enabled));feedback.textContent='読込済み・停止中';
  }catch(error){feedback.textContent=`読込失敗: ${error.message}`;}
};
const rewindButton = document.createElement('button');
rewindButton.textContent = '3秒戻す'; rewindButton.id = 'rewind';
document.querySelector('header').insertBefore(rewindButton, document.querySelector('#stats'));
rewindButton.onclick = () => {
  if(replay){replay.tick=Math.max(tape.start,replay.tick-360);return;}
  const target = [...history].reverse().find(h => h.tick <= world.tick - 360) || history[0];
  if (!target) return;
  const batteryId = battery.id;
  world.restore(target.snapshot); battery = world.parts.get(batteryId);
  editor=new Editor(world);connectionStart=null;dragging=null;
  scars = structuredClone(target.scars); waves = [];effects.clear();acc=0;
  log.replaceChildren();for(const event of scars.slice(-8))logEvent(event);
  history = history.filter(h => h.tick <= target.tick);
  tape.truncate(target.tick);
  document.querySelector('#power').setAttribute('aria-pressed', String(battery.enabled));
};
document.querySelector('#power').onclick = () => { if(replay)return;battery.enabled = !battery.enabled; document.querySelector('#power').setAttribute('aria-pressed',String(battery.enabled)); };
document.querySelector('#pause').onclick = () => { if(replay){replay.playing=!replay.playing;}else playing=!playing;document.querySelector('#pause').textContent=(replay?replay.playing:playing)?'停止':'再開'; };
const replayButton=button('replay','結果を再生',()=>{
  if(replay){replay=null;effects.clear();acc=0;log.replaceChildren();for(const e of scars.slice(-8))logEvent(e);}
  else if(tape.frames.length>1){replay={tick:tape.start,playing:true};effects.clear();}
  document.querySelector('#pause').textContent=(replay?replay.playing:playing)?'停止':'再開';
});
const timeline=document.createElement('input');timeline.type='range';timeline.id='timeline';timeline.min='0';timeline.max='0';timeline.step='1';timeline.value='0';timeline.setAttribute('aria-label','記録の再生位置');
timeline.oninput=()=>{replay={tick:Number(timeline.value),playing:false};effects.clear();document.querySelector('#pause').textContent='再開';};document.querySelector('header').append(timeline);
let aim={x:700,y:450};
function pointer(e){const b=canvas.getBoundingClientRect();return camera.world((e.clientX-b.left)/b.width*1400,(e.clientY-b.top)/b.height*800);}
canvas.addEventListener('wheel',e=>{e.preventDefault();const b=canvas.getBoundingClientRect();camera.zoomAt((e.clientX-b.left)/b.width*1400,(e.clientY-b.top)/b.height*800,Math.exp(-e.deltaY*.001));},{passive:false});
canvas.onpointermove=e=>{
  if(panPoint){const b=canvas.getBoundingClientRect();camera.pan((e.clientX-panPoint.x)/b.width*1400,(e.clientY-panPoint.y)/b.height*800);panPoint={x:e.clientX,y:e.clientY};return;}
  aim=pointer(e);if(dragging)editor.move(dragging,aim.x,aim.y);
};
canvas.onpointerup=canvas.onpointercancel=()=>{dragging=null;panPoint=null;};
canvas.onpointerdown=e=>{
  canvas.focus({preventScroll:true});
  aim=pointer(e);
  if(toolSelect.value==='pan'){panPoint={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
  useTool(e.pointerId);
};
function fire(){
  if(replay){feedback.textContent='記録再生中です。「実験に戻る」で操作を再開できます。';return;}
  if(world.parts.size>=800){feedback.textContent='部品上限800です。削除か再実験で空きを作れます。';return;}
  world.launch(90,550,aim.x,aim.y,45);
  effects.emit({type:'shot',x:90,y:550,tick:world.tick},world);
}
function useTool(pointerId=null){
  if(replay){feedback.textContent='記録再生中は編集できません。「実験に戻る」を選んでください。';return;}
  if(toolSelect.value==='move'||toolSelect.value==='delete'){
    if(toolSelect.value==='move'&&dragging){dragging=null;return;}
    const part=editor.pick(aim.x,aim.y);if(!part||part===battery)return;
    editor.checkpoint();
    if(toolSelect.value==='delete')editor.remove(part.id);
    else {playing=false;document.querySelector('#pause').textContent='再開';dragging=part.id;if(pointerId!==null)canvas.setPointerCapture(pointerId);}
    return;
  }
  if(toolSelect.value==='fire'){fire();return;}
  if(toolSelect.value==='water'){
    editor.checkpoint();const fluid=world.enableCoolant();fluid.rasterize(world.parts.values());fluid.seed(aim.x-24,aim.y-24,48,48);return;
  }
  if(toolSelect.value==='pan')return;
  if(toolSelect.value==='wire'||toolSelect.value==='joint'){
    const near=[...world.parts.values()].sort((a,b)=>Math.hypot(a.body.position.x-aim.x,a.body.position.y-aim.y)-Math.hypot(b.body.position.x-aim.x,b.body.position.y-aim.y))[0];
    if(!near||Math.hypot(near.body.position.x-aim.x,near.body.position.y-aim.y)>65)return;
    if(connectionStart&&connectionStart!==near){editor.checkpoint();if(toolSelect.value==='wire')world.wire(connectionStart,near,1500);else world.connect(connectionStart,near);connectionStart=null;}else connectionStart=near;
    return;
  }
  if(world.parts.size>=600){feedback.textContent='制作上限600です。削除して空きを作れます。';return;}
  editor.checkpoint();
  const type=toolSelect.value;
  const isDevice=['magnet','igniter','relay'].includes(type);
  const part=world.add({x:aim.x,y:aim.y,width:48,height:40,material:type==='fuel'?'fuel':'steel',fixed:isDevice});
  if(isDevice)part.device=type;
}
canvas.onkeydown=e=>{
  const arrows={ArrowLeft:[-25,0],ArrowRight:[25,0],ArrowUp:[0,-25],ArrowDown:[0,25]};
  if(arrows[e.code]){e.preventDefault();const [x,y]=arrows[e.code];if(e.shiftKey)camera.pan(-x,-y);else{aim.x+=x;aim.y+=y;if(dragging)editor.move(dragging,aim.x,aim.y);}return;}
  if(e.code==='Enter'){e.preventDefault();useTool();}
  if(e.code==='Equal')camera.zoomAt(700,400,1.2);
  if(e.code==='Minus')camera.zoomAt(700,400,1/1.2);
  if(e.code==='Space'){e.preventDefault();fire();}
  if(e.code==='KeyR')reset();if(e.code==='KeyE')document.querySelector('#power').click();
};
function render(now){
  const elapsed=Math.min(100,now-previous);effects.measure(elapsed);effects.reduced=reducedMotion.matches;effects.update(!replay&&playing?elapsed/1000*speed:0);
  const previousReplayTick=replay?.tick;
  if(replay&&replay.playing){replay.tick=Math.min(tape.end,replay.tick+elapsed*.12*speed);if(replay.tick===tape.end){replay.playing=false;document.querySelector('#pause').textContent='再開';}}
  acc+=Math.min(40,elapsed)*speed;previous=now;
  while(acc>=STEP_MS){if(playing&&!replay){
    advance();
  }acc-=STEP_MS;}
  const display=replay?tape.sample(replay.tick):world;
  const shownScars=replay?display.events.filter(e=>e.type==='explosion'):scars;
  if(replay){
    for(const e of display.events)if(e.tick>previousReplayTick&&e.tick<=replay.tick)sound.event(e);
    if(replay.logTick!==Math.floor(replay.tick/10)){log.replaceChildren();for(const e of shownScars.slice(-8))logEvent(e);replay.logTick=Math.floor(replay.tick/10);}
  }
  ctx.fillStyle='#10141c';ctx.fillRect(0,0,1400,800);
  ctx.save();ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
  if(!reducedMotion.matches)ctx.translate(Math.sin(now*.07)*effects.shake,Math.cos(now*.09)*effects.shake*.6);
  drawWorld(ctx,display,{sprites,scars:shownScars,reduced:reducedMotion.matches,coolantPainter});
  if(!replay&&toolSelect.value==='fire'){
    ctx.strokeStyle='#f4ca59';ctx.setLineDash([4,10]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(90,550);
    for(const point of freeFlight(90,550,aim.x,aim.y)){if(point.x<0||point.x>1400||point.y>775)break;ctx.lineTo(point.x,point.y);}ctx.stroke();ctx.setLineDash([]);
  }
  ctx.save();ctx.translate(90,550);ctx.rotate(Math.atan2(aim.y-550,aim.x-90));ctx.fillStyle='#c8d7dd';ctx.fillRect(-24,-13,70,26);ctx.fillStyle='#41596b';ctx.fillRect(-28,-23,35,46);ctx.restore();
  if(connectionStart){ctx.strokeStyle='#f4ca59';ctx.lineWidth=3;ctx.beginPath();ctx.arc(connectionStart.body.position.x,connectionStart.body.position.y,35,0,Math.PI*2);ctx.stroke();}
  if(dragging){const selected=world.parts.get(dragging);if(selected){ctx.strokeStyle='#f4ca59';ctx.lineWidth=3;ctx.strokeRect(selected.body.bounds.min.x-5,selected.body.bounds.min.y-5,selected.body.bounds.max.x-selected.body.bounds.min.x+10,selected.body.bounds.max.y-selected.body.bounds.min.y+10);}}
  effects.draw(ctx);
  const displayWaves=replay?(reducedMotion.matches?[]:shownScars.filter(e=>display.tick-e.tick<60).map(e=>({...e,age:(display.tick-e.tick)/120}))):waves;
  for(const e of displayWaves){if(!replay)e.age+=playing?elapsed/1000*speed:0;ctx.globalAlpha=Math.max(0,1-e.age*2);ctx.strokeStyle='#ffc75c';ctx.lineWidth=6;ctx.beginPath();ctx.arc(e.x,e.y,240*e.age*2,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;waves=waves.filter(e=>e.age<.5);
  ctx.restore();
  replayButton.textContent=replay?'実験に戻る':'結果を再生';replayButton.setAttribute('aria-pressed',String(Boolean(replay)));replayButton.disabled=!replay&&tape.frames.length<2;
  timeline.min=String(tape.start);timeline.max=String(tape.end);timeline.value=String(replay?replay.tick:tape.end);timeline.disabled=tape.frames.length<2;timeline.setAttribute('aria-valuetext',`${((replay?replay.tick:tape.end)/120).toFixed(2)}秒`);
  document.querySelector('#power').disabled=Boolean(replay);document.querySelector('#undo').disabled=Boolean(replay);
  document.querySelector('#stats').textContent=`T${Math.floor(display.tick)} / ${shownScars.length} 爆発 / ${display.parts.size} 部品 / ${replay?'記録再生':`電力 ${battery.enabled?'ON':'OFF'}`} / ${camera.zoom.toFixed(1)}x${display.coolant?` / 水${coolantPainter.waterCount} 蒸気${coolantPainter.steamCount}`:''}`;
  requestAnimationFrame(render);
}arrangeWorkspace();requestAnimationFrame(render);
