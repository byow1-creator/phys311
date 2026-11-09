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

    // Read toggle checkbox states from the DOM safely
    const useColor = document.getElementById("toggleColor")?.checked ?? true;
    const showVel = document.getElementById("toggleVel")?.checked ?? true;
    const showContacts = document.getElementById("toggleContacts")?.checked ?? true;

    // --- STEP A: RENDER SPRING LINES FIRST ---
    if (world.bodies.length > 0 && world.forces.some(f => typeof f.potentialEnergy === "function" && !f.G)) {
      this.ctx.strokeStyle = "#cbd5e1";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      for (let i = 0; i < world.bodies.length - 1; i++) {
        const p1 = this.camera.toScreen(world.bodies[i].pos);
        const p2 = this.camera.toScreen(world.bodies[i + 1].pos);
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
      }
      this.ctx.stroke();
    }


    // --- STEP C: RENDER BODIES ---
    for (const b of world.bodies) {
      const screenPos = this.camera.toScreen(b.pos);
      const speed = b.vel.len();

      // Dynamic color if enabled, otherwise use the body's default color
      this.ctx.fillStyle = (b.fixed || !useColor) ? b.color : speedColor(speed);
      
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, b.radius * this.camera.scale, 0, 2 * Math.PI);
      this.ctx.fill();

      // Velocity Arrows if enabled
      if (showVel && !b.fixed && speed > 0.1) {
        const arrowTipWorld = b.pos.add(b.vel.mul(0.15));
        const arrowTipScreen = this.camera.toScreen(arrowTipWorld);

        this.ctx.strokeStyle = "#ff0055"; 
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x, screenPos.y);
        this.ctx.lineTo(arrowTipScreen.x, arrowTipScreen.y);
        this.ctx.stroke();
      }
    }
    if (showContacts && world.contacts) {
      world.contacts.forEach(c => {
        const screenPos = this.camera.toScreen(c.pos);
        const percent = c.age / c.maxAge;
        const radius = 4 + percent * 12; // Growing ring circle ripple
        const alpha = 1 - percent;       // Smoothly fade out opacity

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(236, 72, 153, ${alpha})`; // Shocking neon pink flash ring
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.ctx.restore();
      });
    }
  }
}
