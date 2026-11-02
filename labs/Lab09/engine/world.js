import { Vec2 } from "./vec2.js";
import { EulerCromer } from "./integrators.js";
import { resolveCollisions } from "./collisions.js";

export class World {
  constructor(opts = {}) {
    this.bodies = [];
    
    this.forces = [];
    
    this.integrator = opts.integrator ?? new EulerCromer();
    
    this.bounds = opts.bounds ?? null;
    
    this.time = 0;
    
    this.restitution = opts.restitution ?? 0.9;
  }

  add(body) {
    this.bodies.push(body);
    return body;
  }

  addForce(force) {
    this.forces.push(force);
    return force;
  }

  step(dt) {
    for (const b of this.bodies) {
      b.clearForce();
    }

    for (const f of this.forces) {
      f.apply(this);
    }

    this.integrator.step(this, dt);

    resolveCollisions(this);

    this.time += dt;
  }

  totalEnergy() {
    let E = 0;
    for (const b of this.bodies) {
      E += b.kineticEnergy();
    }
    for (const f of this.forces) {
      if (typeof f.potentialEnergy === "function") {
        E += f.potentialEnergy(this);
      }
    }
    return E;
  }

  totalMomentum() {
    const p = new Vec2(0, 0);
    for (const b of this.bodies) {
      if (b.isStatic) continue;
      p.addScaled(b.vel, b.m);
    }
    return p;
  }
}
