import { Vec2 } from './Vec2.js';

let _nextId = 1;

export class Body {
  constructor({ pos, vel = Vec2.zero(), mass = 1, radius = 0.25,
                fixed = false, color = '#ff8200', tag = '' } = {}) {
    this.id      = _nextId++;
    this.pos     = pos.clone();
    this.vel     = vel.clone();
    this.acc     = Vec2.zero();
    this.force   = Vec2.zero();
    this.mass    = mass;
    this.invMass = fixed ? 0 : 1 / mass; // Crucial for collision formulas
    this.radius  = radius;
    this.fixed   = fixed;
    this.color   = color;
    this.tag     = tag;
  
    this.trailHistory = [];
  }

  clearForce()      { this.force.set(0, 0); }


  clearForce()      { this.force.set(0, 0); }
  applyForce(F)     { this.force.addTo(F); }

  kinetic()         { return 0.5 * this.mass * this.vel.len2(); }
  momentum()        { return this.vel.mul(this.mass); }

  static resetIds() { _nextId = 1; }
}
