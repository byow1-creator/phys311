export function drawHUD(ctx, world, e0, p0, fps, tPhysics, tRender) {
  const currentEnergy = world.totalEnergy();
  const currentMomentum = world.totalMomentum();

  let energyDriftPercent = 0;
  if (e0 !== 0) {
    energyDriftPercent = ((currentEnergy - e0) / Math.abs(e0)) * 100;
  }

  const lines = [
    `t             = ${world.time.toFixed(2)} s`,
    `bodies        = ${world.bodies.length}`,
    `E_total       = ${currentEnergy.toFixed(4)} J`,
    `dE/E0         = ${energyDriftPercent.toFixed(3)} %`,
    `|p|           = ${currentMomentum.length().toFixed(4)}`,
    `FPS           = ${Math.round(fps)}`,
    `t_physics     = ${tPhysics.toFixed(2)} ms`,
    `t_render      = ${tRender.toFixed(2)} ms`
  ];

  ctx.font = "13px monospace";

  if (Math.abs(energyDriftPercent) > 1.0) {
    ctx.fillStyle = "#dc3545";
  } else {
    ctx.fillStyle = "#2d3b45";
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, 15, 25 + index * 18);
  });
}
