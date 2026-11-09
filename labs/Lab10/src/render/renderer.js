// SECTION 4: Color by speed — instantly shows energy distribution across bodies
function speedColor(v, vMax = 15) {
  const t = Math.min(v / vMax, 1.0);
  const hue = (1.0 - t) * 220; // 220 = blue (slow) → 0 = red (fast)
  return `hsl(${hue}, 85%, 55%)`;
}


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
      const speed = b.vel.len();

      // 1. DYNAMIC COLORING: Dynamically color moving bodies by their kinetic speed profile
      // Keep fixed/anchor bodies a neutral color, but shade active particles dynamically
      this.ctx.fillStyle = b.fixed ? b.color : speedColor(speed);
      
      this.ctx.beginPath();
      this.ctx.arc(
        screenPos.x,
        screenPos.y,
        b.radius * this.camera.scale,
        0,
        2 * Math.PI
      );
      this.ctx.fill();

      // 2. VELOCITY ARROWS: Draw vector lines emerging from body along velocity direction
      if (!b.fixed && speed > 0.1) {
        // Find where the arrow tip should land in physics meters (scaled down slightly by 0.15 for legibility)
        const arrowTipWorld = b.pos.add(b.vel.mul(0.15));
        const arrowTipScreen = this.camera.toScreen(arrowTipWorld);

        this.ctx.strokeStyle = "#ff0055"; // Bright contrast color for vectors
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x, screenPos.y);
        this.ctx.lineTo(arrowTipScreen.x, arrowTipScreen.y);
        this.ctx.stroke();
      }
    }
  }
}
