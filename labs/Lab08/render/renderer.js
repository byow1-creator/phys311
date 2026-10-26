import { Vec2 } from "../engine/vec2.js";

export function draw(ctx, canvas, world, hud) {
    // 1. Clear display buffer for current animation frame context
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const camera = world.meta.camera;

    // 2. Draw static environmental baseline at physics y = 0
    ctx.strokeStyle = "#58595b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gLeft = camera.toScreen(new Vec2(-5, 0));
    const gRight = camera.toScreen(new Vec2(100, 0));
    ctx.moveTo(gLeft.x, gLeft.y);
    ctx.lineTo(gRight.x, gRight.y);
    ctx.stroke();

    // 3. Draw static target validation node at physics position (2,3)
    ctx.strokeStyle = "#006c93";
    ctx.lineWidth = 1.5;
    const staticCirclePos = camera.toScreen(new Vec2(2, 3));
    ctx.beginPath();
    ctx.arc(staticCirclePos.x, staticCirclePos.y, 0.3 * camera.scale, 0, 2 * Math.PI);
    ctx.stroke();

    // 4. Render active particles and historical fading paths
    for (const body of world.bodies) {
        // Draw trailing path history points
        for (let i = 0; i < body.trail.length; i++) {
            const alpha = (i / body.trail.length) * 0.4;
            ctx.fillStyle = `rgba(255, 130, 0, ${alpha})`;
            const pt = camera.toScreen(body.trail[i]);
            ctx.fillRect(pt.x - 1, pt.y - 1, 2, 2);
        }

        // Draw active physical body radius sphere
        const screenPos = camera.toScreen(body.pos);
        ctx.fillStyle = body.color;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, body.radius * camera.scale, 0, 2 * Math.PI);
        ctx.fill();

        // 5. === HIGH-PRECISION REAL-TIME DIAGNOSTIC HUD OVERLAY ===
        // Extract raw analytic parameters from the environment structure
        const time = world.time;
        const x = body.pos.x;
        const y = body.pos.y;
        const vMag = body.vel.length(); // Explicit scalar magnitude: |v|
        const ke = body.kineticEnergy(); // KE = 0.5 * m * v^2
        
        // Compute structural environmental baseline gravity potential: PE = m * g * y
        let pe = 0;
        for (const force of world.forces) {
            if (force.g !== undefined) {
                pe += body.mass * force.g * body.pos.y;
            }
            // Include potential contribution calculations for structural spring models
            if (force.anchor !== undefined && force.body === body) {
                const dist = body.pos.sub(force.anchor).length();
                const dx = dist - force.restLength;
                pe += 0.5 * force.k * dx * dx;
            }
        }
        const eTotal = ke + pe;

        // Render typography specs onto the top-left canvas area
        ctx.fillStyle = "#ffffff";
        ctx.font = "14px monospace";
        let offsetY = 35; // Initial baseline y padding offset
        const lineSpacing = 22; // Pixels separating lines of code text

        ctx.fillText(`t       = ${time.toFixed(3)} s`, 20, offsetY);      offsetY += lineSpacing;
        ctx.fillText(`x       = ${x.toFixed(3)} m`, 20, offsetY);         offsetY += lineSpacing;
        ctx.fillText(`y       = ${y.toFixed(3)} m`, 20, offsetY);         offsetY += lineSpacing;
        ctx.fillText(`|v|     = ${vMag.toFixed(3)} m/s`, 20, offsetY);    offsetY += lineSpacing;
        ctx.fillText(`KE      = ${ke.toFixed(3)} J`, 20, offsetY);        offsetY += lineSpacing;
        ctx.fillText(`PE      = ${pe.toFixed(3)} J`, 20, offsetY);        offsetY += lineSpacing;
        ctx.fillText(`E_total = ${eTotal.toFixed(3)} J`, 20, offsetY);
    }
}
