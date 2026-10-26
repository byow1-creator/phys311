import { Vec2 } from "./vec2.js";

export class Body {
    constructor(config = {}) {
        this.mass = config.mass !== undefined ? parseFloat(config.mass) : 1.0;
        this.radius = config.radius !== undefined ? parseFloat(config.radius) : 0.3;
        this.color = config.color || "#ff8200";
        this.pos = config.pos ? config.pos.clone() : new Vec2(0, 0);
        this.vel = config.vel ? config.vel.clone() : new Vec2(0, 0);
        this.acc = new Vec2(0, 0);
        this.force = new Vec2(0, 0);
        this.trail = [];
    }
    clearForce() {
        this.force.x = 0;
        this.force.y = 0;
    }
    kineticEnergy() {
        return 0.5 * this.mass * this.vel.lengthSq();
    }
}
