import { Physics } from './physics.js';

export function createProbe(kind) {
  const w = new Physics({ gravity: kind === 'ricochet' ? 0 : 700 });
  if (kind === 'ricochet') {
    for (let y = 130; y < 700; y += 95) for (let x = 350; x < 1300; x += 110) {
      w.body({ x, y: y + (x % 3) * 12, r: 22, fixed: true });
    }
    for (let i = 0; i < 40; i++) w.body({ x: 70 + i % 5 * 14, y: 250 + Math.floor(i / 5) * 14, r: 5, vx: 600 + i * 7, vy: (i - 20) * 9 });
  } else {
    for (let tower = 0; tower < 5; tower++) {
      let previous = w.body({ x: 400 + tower * 170, y: 770, fixed: true, r: 14 });
      for (let i = 1; i <= 14; i++) {
        const b = w.body({ x: previous.x, y: 770 - i * 26, r: 12, material: kind === 'reactor' && i % 3 === 0 ? 'fuel' : 'steel' });
        w.joint(previous, b, { strength: 400 }); previous = b;
      }
    }
    w.body({ x: 100, y: 530, r: 28, mass: 9, vx: 950 });
  }
  return w;
}
