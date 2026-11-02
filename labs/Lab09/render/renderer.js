export class Renderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.camera = camera;
  }

  draw(world) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // --- STEP A: RENDER SPRING LINES FIRST (SO THEY SIT UNDER THE BODIES) ---
    this.ctx.strokeStyle = "#cbd5e1";
    this.ctx.lineWidth = 2;
    
    for (const b of world.bodies) {
      // If a body has a specific structural spring attachment pattern, or we scan 
      // sequentially for linked bodies in active spring chain states:
    }
    
    // Explicitly check if we are in the spring scene by reading the active body relationships
    // This dynamically draws connection links matching the Spring Force logic in main.js
    if (world.bodies.length > 0 && world.forces.some(f => typeof f.potentialEnergy === "function" && !f.G)) {
      this.ctx.beginPath();
      for (let i = 0; i < world.bodies.length - 1; i++) {
        const p1 = this.camera.toScreen(world.bodies[i].pos);
        const p2 = this.camera.toScreen(world.bodies[i + 1].pos);
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
      }
      this.ctx.stroke();
    }

    // --- STEP B: RENDER BODIES ---
    for (const b of world.bodies) {
      const screenPos = this.camera.toScreen(b.pos);

      this.ctx.fillStyle = b.color;
      this.ctx.beginPath();
      this.ctx.arc(
        screenPos.x,
        screenPos.y,
        b.radius * this.camera.scale,
        0,
        2 * Math.PI
      );
      this.ctx.fill();
    }
  }
}
