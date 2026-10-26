import { Vec2 } from "./vec2.js";

export class Gravity {
    constructor(g = 9.81) {
        this.g = g;
    }
    apply(world) {
        for (const body of world.bodies) {
            body.force.y -= body.mass * this.g;
        }
    }
}

export class Spring {
    constructor(body, anchor, k = 1.0, restLength = 0) {
        this.body = body;
        this.anchor = anchor.clone();
        this.k = parseFloat(k);
        this.restLength = parseFloat(restLength);
    }
    apply(world) {
        const rVec = this.body.pos.sub(this.anchor);
        const dist = rVec.length();
        if (dist === 0) return;
        const rHat = rVec.normalized();
        const displacement = dist - this.restLength;
        this.body.force.addScaled(rHat, -this.k * displacement);
    }
}
