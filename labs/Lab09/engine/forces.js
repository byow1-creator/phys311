export class Gravity {
  constructor(g = 9.81) {
    this.g = g;
  }

  apply(world) {
    for (const b of world.bodies) {
      if (b.isStatic) continue;
      b.force.y -= b.m * this.g;
    }
  }

  potentialEnergy(world) {
    let U = 0;
    for (const b of world.bodies) {
      if (b.isStatic) continue;
      U += b.m * this.g * b.pos.y;
    }
    return U;
  }
}

export class Drag {
  constructor(c = 0.1) {
    this.c = c;
  }

  apply(world) {
    for (const b of world.bodies) {
      if (b.isStatic) continue;
      const speed = b.vel.length();
      if (speed > 0) {
        b.force.addScaled(b.vel, -this.c * speed);
      }
    }
  }
}

export class NewtonGravity {
  constructor(G = 1, softening = 0.01) {
    this.G = G;
    this.eps = softening;
  }

  apply(world) {
    const bs = world.bodies;
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const d = bs[j].pos.sub(bs[i].pos);
        const r2 = d.lengthSq() + this.eps ** 2;
        const F = (this.G * bs[i].m * bs[j].m) / (r2 * Math.sqrt(r2));
        
        bs[i].force.addScaled(d, F);
        bs[j].force.addScaled(d, -F);
      }
    }
  }

  potentialEnergy(world) {
    let U = 0;
    const bs = world.bodies;
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const d = bs[j].pos.sub(bs[i].pos);
        const r = Math.sqrt(d.lengthSq() + this.eps ** 2);
        U -= (this.G * bs[i].m * bs[j].m) / r;
      }
    }
    return U;
  }
}
