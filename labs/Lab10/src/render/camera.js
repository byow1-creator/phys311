import { Vec2 } from "../engine/Vec2.js";

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
    
    toWorld(screenX, screenY) {
        const physicsX = (screenX - this.originX) / this.scale;
        // Fixed: Removed the erroneous negative sign on scale
        const physicsY = (this.originY - screenY) / this.scale; 
        return new Vec2(physicsX, physicsY);
    }
}
