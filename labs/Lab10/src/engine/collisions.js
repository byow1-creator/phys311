// src/engine/Collisions.js
import { Vec2 } from './Vec2.js';

// 1. Core loop wrapper expected by your world.js module
export function resolveCollisions(world) {
  const bs = world.bodies;

  // Resolve boundaries first
  if (world.bounds) {
    for (const b of bs) {
      if (b.fixed) continue;
      resolveWalls(b, world.bounds, world.restitution);
    }
  }

  // Resolve circle-to-circle overlaps
  for (let i = 0; i < bs.length; i++) {
    for (let j = i + 1; j < bs.length; j++) {
      resolvePair(bs[i], bs[j], world.restitution);
    }
  }
}

export function resolvePair(a, b, e) {
  const d  = b.pos.sub(a.pos);
  const L  = d.len();
  const R  = a.radius + b.radius;
  if (L >= R || L < 1e-12) return false;

  const n  = d.mul(1 / L);
  const rv = b.vel.sub(a.vel).dot(n);
  if (rv > 0) return false; // Already separating

  const invSum = a.invMass + b.invMass;
  if (invSum === 0) return false;

  const j = -(1 + e) * rv / invSum;
  const J = n.mul(j);
  
  a.vel.addTo(J.mul(-a.invMass));
  b.vel.addTo(J.mul( b.invMass));

  const corr = n.mul((R - L) / invSum * 0.8);
  a.pos.addTo(corr.mul(-a.invMass));
  b.pos.addTo(corr.mul( b.invMass));
  return true;
}

export function resolveWalls(body, bounds, e) {
  let hit = false;
  
  // Robust check: handles both camelCase (main.js) and lowercase (reference) bounds properties!
  const xmin = bounds.xmin ?? bounds.xMin;
  const xmax = bounds.xmax ?? bounds.xMax;
  const ymin = bounds.ymin ?? bounds.yMin;
  const ymax = bounds.ymax ?? bounds.yMax;
  
  const r = body.radius;
  if (body.pos.x - r < xmin) { body.pos.x = xmin + r; body.vel.x = -body.vel.x * e; hit = true; }
  if (body.pos.x + r > xmax) { body.pos.x = xmax - r; body.vel.x = -body.vel.x * e; hit = true; }
  if (body.pos.y - r < ymin) { body.pos.y = ymin + r; body.vel.y = -body.vel.y * e; hit = true; }
  if (body.pos.y + r > ymax) { body.pos.y = ymax - r; body.vel.y = -body.vel.y * e; hit = true; }
  return hit;
}
