import { Vec2 } from "../engine/vec2.js";

export class Camera {
    constructor(scale, originX, originY) {
        this.scale = scale;
        this.originX = originX;
        this.originY = originY;
    }
    toScreen(physicsPos) {
        const screenX = this.originX + physicsPos.x * this.scale;
        const screenY = this.originY - physicsPos.y * this.scale;
        return new Vec2(screenX, screenY);
    }
}
