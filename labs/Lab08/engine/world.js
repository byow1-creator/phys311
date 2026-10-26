import { Vec2 } from "./vec2.js";

export class World {
    constructor(integrator) {
        this.bodies = [];
        this.forces = [];
        this.integrator = integrator;
        this.time = 0.0;
        this.steps = 0;
        this.meta = {};
    }
    add(body) {
        this.bodies.push(body);
        return body;
    }
    addForce(force) {
        this.forces.push(force);
        return force;
    }
    primeAccelerations() {
        for (const body of this.bodies) {
            body.clearForce();
        }
        for (const force of this.forces) {
            force.apply(this);
        }
        for (const body of this.bodies) {
            body.acc.x = body.force.x / body.mass;
            body.acc.y = body.force.y / body.mass;
            body._a_old = body.acc.clone();
        }
    }
    totalEnergy() {
        let total = 0;
        for (const body of this.bodies) {
            total += body.kineticEnergy();
            for (const force of this.forces) {
                if (force.g !== undefined) {
                    total += body.mass * force.g * body.pos.y;
                }
                if (force.anchor !== undefined && force.body === body) {
                    const dist = body.pos.sub(force.anchor).length();
                    const dx = dist - force.restLength;
                    total += 0.5 * force.k * dx * dx;
                }
            }
        }
        return total;
    }
    step(dt) {
        for (const body of this.bodies) {
            body.clearForce();
        }
        for (const force of this.forces) {
            force.apply(this);
        }
        this.integrator.step(this, dt);
        this.time += dt;
        this.steps++;
    }
}
