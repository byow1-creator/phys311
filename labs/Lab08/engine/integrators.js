import { Vec2 } from "./vec2.js";

export class Euler {
    step(world, dt) {
        for (const body of world.bodies) {
            body.acc.x = body.force.x / body.mass;
            body.acc.y = body.force.y / body.mass;
            body.pos.addScaled(body.vel, dt);
            body.vel.addScaled(body.acc, dt);
        }
    }
}

export class EulerCromer {
    step(world, dt) {
        for (const body of world.bodies) {
            body.acc.x = body.force.x / body.mass;
            body.acc.y = body.force.y / body.mass;
            body.vel.addScaled(body.acc, dt);
            body.pos.addScaled(body.vel, dt);
        }
    }
}

export class VelocityVerlet {
    step(world, dt) {
        // 1. Advance positions first (drift + half-kick) using current acceleration
        for (const body of world.bodies) {
            body.pos.x += body.vel.x * dt + 0.5 * body.acc.x * dt * dt;
            body.pos.y += body.vel.y * dt + 0.5 * body.acc.y * dt * dt;
        }

        // 2. Crucial: Recompute forces at these brand-new positions!
        for (const body of world.bodies) {
            body.clearForce();
        }
        for (const force of world.forces) {
            force.apply(world);
        }

        // 3. Complete the velocity update using the average of old and new acceleration
        for (const body of world.bodies) {
            const ax_next = body.force.x / body.mass;
            const ay_next = body.force.y / body.mass;

            // Kick velocity using half of old acceleration and half of new acceleration
            body.vel.x += 0.5 * (body.acc.x + ax_next) * dt;
            body.vel.y += 0.5 * (body.acc.y + ay_next) * dt;

            // Save the new acceleration on the body so it is ready for the next frame
            body.acc.x = ax_next;
            body.acc.y = ay_next;
        }
    }
}

