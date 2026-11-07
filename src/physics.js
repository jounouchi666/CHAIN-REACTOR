/** Fixed-step particle rigid-body kernel. SI-like scene units, no rendering dependencies. */
export const DT = 1 / 120;
export class Physics {
  constructor({ gravity = 700, width = 1400, height = 800 } = {}) {
    this.gravity = gravity; this.width = width; this.height = height;
    this.bodies = []; this.joints = []; this.events = []; this.tick = 0; this.nextId = 1;
  }
  body({ x, y, r = 12, mass = 1, fixed = false, vx = 0, vy = 0, material = 'steel' }) {
    if (![x, y, r, mass, vx, vy].every(Number.isFinite) || r <= 0 || mass <= 0) throw new TypeError('Invalid body');
    const b = { id: this.nextId++, x, y, vx, vy, r, mass, inv: fixed ? 0 : 1 / mass, material, heat: 0, fuel: material === 'fuel' ? 1 : 0, burning: false, spent: false };
    this.bodies.push(b); return b;
  }
  joint(a, b, { strength = 180, length = Math.hypot(a.x - b.x, a.y - b.y) } = {}) {
    const j = { a: a.id, b: b.id, length, strength, broken: false }; this.joints.push(j); return j;
  }
  impulse(x, y, radius, force, cause = 'input') {
    for (const b of this.bodies) {
      const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy);
      if (!b.inv || d >= radius) continue;
      const scale = force * (1 - d / radius) * b.inv / Math.max(d, 1);
      b.vx += (d < 1 ? 1 : dx) * scale; b.vy += dy * scale;
    }
    this.events.push({ type: 'impulse', x, y, radius, cause, tick: this.tick });
  }
  step() {
    this.tick++; this.events = [];
    this.thermal();
    const lookup = new Map(this.bodies.map(b => [b.id, b]));
    for (const b of this.bodies) {
      if (!b.inv) continue;
      b.vy += this.gravity * DT; b.x += b.vx * DT; b.y += b.vy * DT;
      b.vx *= 0.999; b.vy *= 0.999;
      if (b.y + b.r > this.height) { b.y = this.height - b.r; b.vy = -Math.abs(b.vy) * 0.48; b.vx *= 0.96; }
      if (b.x < b.r || b.x > this.width - b.r) { b.x = Math.max(b.r, Math.min(this.width - b.r, b.x)); b.vx *= -0.6; }
    }
    for (let iteration = 0; iteration < 4; iteration++) {
      this.collide(iteration === 0);
      for (const j of this.joints) {
        if (j.broken) continue;
        const a = lookup.get(j.a), b = lookup.get(j.b);
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001, error = d - j.length;
        if (Math.abs(error) / DT > j.strength) {
          j.broken = true; this.events.push({ type: 'fracture', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, tick: this.tick }); continue;
        }
        const weight = a.inv + b.inv;
        if (!weight) continue;
        const correction = error / d / weight * 0.7;
        a.x += dx * correction * a.inv; a.y += dy * correction * a.inv;
        b.x -= dx * correction * b.inv; b.y -= dy * correction * b.inv;
      }
    }
  }
  collide(report) {
    const cell = Math.max(16, ...this.bodies.map(b => b.r * 2));
    const buckets = new Map();
    for (const b of this.bodies) {
      const key = `${Math.floor(b.x / cell)},${Math.floor(b.y / cell)}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(b);
    }
    for (const a of this.bodies) {
      const gx = Math.floor(a.x / cell), gy = Math.floor(a.y / cell);
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        for (const b of buckets.get(`${gx + ox},${gy + oy}`) || []) {
          if (b.id <= a.id || !(a.inv + b.inv)) continue;
          const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
          if (dx * dx + dy * dy >= rr * rr) continue;
          const d = Math.hypot(dx, dy), nx = d > 0.001 ? dx / d : 1, ny = d > 0.001 ? dy / d : 0;
          const weight = a.inv + b.inv, penetration = rr - d;
          a.x -= nx * penetration * a.inv / weight * 0.8; a.y -= ny * penetration * a.inv / weight * 0.8;
          b.x += nx * penetration * b.inv / weight * 0.8; b.y += ny * penetration * b.inv / weight * 0.8;
          const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (relative >= 0) continue;
          const impulse = -1.55 * relative / weight;
          if (report && impulse > 180) {
            a.heat = Math.min(2, a.heat + impulse / 1600);
            b.heat = Math.min(2, b.heat + impulse / 1600);
          }
          a.vx -= impulse * nx * a.inv; a.vy -= impulse * ny * a.inv;
          b.vx += impulse * nx * b.inv; b.vy += impulse * ny * b.inv;
          if (report && impulse > 12) this.events.push({ type: 'impact', a: a.id, b: b.id, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, impulse, tick: this.tick });
        }
      }
    }
  }
  ignite(x, y, radius = 60) {
    for (const b of this.bodies) if (Math.hypot(b.x - x, b.y - y) < radius + b.r) b.heat = Math.max(b.heat, 1);
  }
  thermal() {
    const delta = new Float64Array(this.bodies.length);
    for (let i = 0; i < this.bodies.length; i++) {
      const a = this.bodies[i];
      for (let j = i + 1; j < this.bodies.length; j++) {
        const b = this.bodies[j], distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance > a.r + b.r + 30) continue;
        const transfer = (a.heat - b.heat) * 0.014;
        delta[i] -= transfer; delta[j] += transfer;
      }
    }
    const detonations = [];
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      b.heat = Math.max(0, b.heat + delta[i] - 0.0005);
      if (b.fuel > 0 && b.heat > 0.55) b.burning = true;
      if (b.burning && !b.spent) {
        b.heat = Math.min(2, b.heat + 0.028); b.fuel -= DT * 2.8;
        if (b.fuel <= 0) { b.spent = true; b.burning = false; detonations.push(b); }
      }
    }
    for (const b of detonations) {
      this.impulse(b.x, b.y, 185, 1500, b.id);
      this.ignite(b.x, b.y, 95);
      this.events.push({ type: 'explosion', x: b.x, y: b.y, source: b.id, radius: 185, tick: this.tick });
      for (const j of this.joints) if (j.a === b.id || j.b === b.id) j.broken = true;
    }
  }
  snapshot() { return structuredClone({ gravity: this.gravity, width: this.width, height: this.height, bodies: this.bodies, joints: this.joints, tick: this.tick, nextId: this.nextId }); }
  restore(snapshot) { Object.assign(this, structuredClone(snapshot)); this.events = []; }
}
