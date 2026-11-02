import { Vec2 } from "./vec2.js";

let _nextId = 0;

export class Body {
  constructor(opts = {}) {
    this.id = _nextId++;
    
    this.isStatic = opts.isStatic ?? false;
    
    this.m = opts.m ?? 1;
    
    this.radius = opts.radius ?? 0.5;
    
    this.pos = new Vec2(opts.x ?? 0, opts.y ?? 0);
    
    this.vel = new Vec2(opts.vx ?? 0, opts.vy ?? 0);
    
    this.acc = new Vec2(0, 0);
    
    this.force = new Vec2(0, 0);
    
    this.color = opts.color ?? "#ff8200";
  }

  clearForce() {
    this.force.set(0, 0);
  }

  kineticEnergy() {
    if (this.isStatic) return 0;
    return 0.5 * this.m * this.vel.lengthSq();
  }
}
