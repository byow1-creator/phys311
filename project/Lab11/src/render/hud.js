export function drawHUD(ctx, world, e0, p0, fps, tPhysics, tRender, mouseWorldPos, golfState = null) {
  const currentEnergy = world.totalEnergy();
  const currentMomentum = world.totalMomentum();

  let energyDriftPercent = 0;
  if (e0 !== 0) {
    energyDriftPercent = ((currentEnergy - e0) / Math.abs(e0)) * 100;
  }

  const timeEl = document.getElementById("hudTime");
  const energyEl = document.getElementById("hudEnergy");
  const driftEl = document.getElementById("hudDrift");
  const momEl = document.getElementById("hudMom");
  const fpsEl = document.getElementById("hudFps");

  if (timeEl) timeEl.textContent = `${world.time.toFixed(2)} s`;
  if (energyEl) energyEl.textContent = `${currentEnergy.toFixed(4)} J`;
  if (momEl) momEl.textContent = `${currentMomentum.length().toFixed(4)}`;
  if (fpsEl) fpsEl.textContent = `${Math.round(fps)}`;

  if (driftEl) {
    driftEl.textContent = `${energyDriftPercent.toFixed(3)} %`;
    driftEl.style.color = Math.abs(energyDriftPercent) > 1.0 ? "#ef4444" : "#d2ff1e";
  }

  if (golfState) {
    const strokesEl = document.getElementById("hudStrokes");
    const speedEl = document.getElementById("hudSpeed");
    const statusEl = document.getElementById("hudStatus");

    const probeSpeed = golfState.activeProbe ? golfState.activeProbe.vel.len().toFixed(2) : "0.00";

    if (strokesEl) strokesEl.textContent = `${golfState.strokes}`;
    if (speedEl) speedEl.textContent = `${probeSpeed} m/s`;
    if (statusEl) {
      statusEl.textContent = golfState.status;
      statusEl.style.color =
        golfState.status === "SCORED" ? "#10b981" :
        golfState.status === "CRASHED" ? "#ef4444" : "#d2ff1e";
    }
  }
}
