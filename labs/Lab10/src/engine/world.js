// src/engine/world.js
import { Vec2 } from "./Vec2.js";
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
     this.contacts = [];
  }

  add(body) {
  }

  add(body) {
    this.bodies.push(body);
    return body;
  }

  addForce(force) {
    this.forces.push(force);
    return force;
  }

  // Essential helper called by your updated integrators
  accumulateForces() {
    for (const b of this.bodies) {
      b.clearForce();
    }
    for (const f of this.forces) {
      f.apply(this);
    }
  }

  step(dt) {
     if (this.contacts) {
      this.contacts = this.contacts.filter(c => {
        c.age += dt;
        return c.age < c.maxAge;
      });
    }
    // Let the integrator manage forces sequence clearing and calling loops internally
    this.integrator.step(this, dt);

    // Guard against structural geometry overlap conflicts
    resolveCollisions(this);

    this.time += dt;
  }

  // src/engine/World.js

  totalEnergy() {
    let E = 0;
    for (const b of this.bodies) {
      // CHANGE b.kineticEnergy() to b.kinetic()
      E += b.kinetic(); 
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
      if (b.fixed) continue; 
      // Fixed: Multiplies velocity by mass, then adds it in-place to p
      p.addTo(b.vel.mul(b.mass)); 
    }
    return p;
  }


}
