// src/engine/forces.js
import { Vec2 } from './Vec2.js';

export class Gravity {
  constructor(g = 9.81) {
    this.g = g;
  }

  apply(world) {
    for (const b of world.bodies) {
      if (b.fixed) continue; // Updated from isStatic
      b.force.y -= b.mass * this.g; // Updated from b.m
    }
  }

  potentialEnergy(world) {
    let U = 0;
    for (const b of world.bodies) {
      if (b.fixed) continue;
      U += b.mass * this.g * b.pos.y;
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
      if (b.fixed) continue;
      const speed = b.vel.len(); // Using clean .len() method
      if (speed > 0) {
        // b.force.addScaled is replaced with clean addTo/mul operations
        b.force.addTo(b.vel.mul(-this.c * speed));
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
        const r2 = d.len2() + this.eps ** 2;
        const F = (this.G * bs[i].mass * bs[j].mass) / (r2 * Math.sqrt(r2));
        
        bs[i].force.addTo(d.mul(F));
        bs[j].force.addTo(d.mul(-F));
      }
    }
  }

  potentialEnergy(world) {
    let U = 0;
    const bs = world.bodies;
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const d = bs[j].pos.sub(bs[i].pos);
        const r = Math.sqrt(d.len2() + this.eps ** 2);
        U -= (this.G * bs[i].mass * bs[j].mass) / r;
      }
    }
    return U;
  }
}

export class MouseSpring {
  constructor() {
    this.body = null;
    this.target = null;
    this.k = 200; 
    this.c = 20;  
  }

  apply(world) {
    if (!this.body || !this.target) return;
    
    const dx = this.target.x - this.body.pos.x;
    const dy = this.target.y - this.body.pos.y;
    const displacement = new Vec2(dx, dy);
    
    // F_spring = k * displacement * mass
    this.body.force.addTo(displacement.mul(this.k * this.body.mass));
    
    // F_damping = -c * velocity * mass
    this.body.force.addTo(this.body.vel.mul(-this.c * this.body.mass));
  }
}
