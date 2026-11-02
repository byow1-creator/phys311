export function resolveCollisions(world) {
  const bs = world.bodies;

  if (world.bounds) {
    const { xMin, xMax, yMin, yMax } = world.bounds;
    for (const b of bs) {
      if (b.isStatic) continue;

      if (b.pos.x - b.radius < xMin) {
        b.pos.x = xMin + b.radius;
        b.vel.x = -b.vel.x * world.restitution;
      } else if (b.pos.x + b.radius > xMax) {
        b.pos.x = xMax - b.radius;
        b.vel.x = -b.vel.x * world.restitution;
      }

      if (b.pos.y - b.radius < yMin) {
        b.pos.y = yMin + b.radius;
        b.vel.y = -b.vel.y * world.restitution;
      } else if (b.pos.y + b.radius > yMax) {
        b.pos.y = yMax - b.radius;
        b.vel.y = -b.vel.y * world.restitution;
      }
    }
  }

  for (let i = 0; i < bs.length; i++) {
    for (let j = i + 1; j < bs.length; j++) {
      resolvePair(bs[i], bs[j], world.restitution);
    }
  }
}

export function resolvePair(a, b, e) {
  const d = b.pos.sub(a.pos);
  const distSq = d.lengthSq();
  const rSum = a.radius + b.radius;

  if (distSq >= rSum * rSum || distSq === 0) {
    return false;
  }

  const dist = Math.sqrt(distSq);
  const n = d.mul(1 / dist);

  const overlap = rSum - dist;
  const invA = a.isStatic ? 0 : 1 / a.m;
  const invB = b.isStatic ? 0 : 1 / b.m;
  const invSum = invA + invB;

  if (invSum === 0) return false;

  a.pos.addScaled(n, -overlap * (invA / invSum));
  b.pos.addScaled(n, overlap * (invB / invSum));

  const relVel = b.vel.sub(a.vel);
  const vn = relVel.dot(n);

 if (vn > 0) return true;

  const J = (-(1 + e) * vn) / invSum;

  a.vel.addScaled(n, -J * invA);
  b.vel.addScaled(n, J * invB);

  return true;
}
