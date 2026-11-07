/** Matches Matter's fixed-step free flight, including air friction and gravity.
 * It intentionally predicts no collisions, magnetic forces or liquid drag.
 */
export function freeFlight(x,y,targetX,targetY,speed=45,steps=120){
  const dt=1000/120,base=1000/60,distance=Math.hypot(targetX-x,targetY-y)||1;
  let vx=(targetX-x)/distance*speed*dt/base,vy=(targetY-y)/distance*speed*dt/base;
  const points=[{x,y}];
  for(let i=0;i<steps;i++){vx*=1-.001*dt/base;vy=vy*(1-.001*dt/base)+.001*dt*dt;x+=vx;y+=vy;points.push({x,y});}
  return points;
}
