import { World } from "./engine/world.js";
import { Body } from "./engine/body.js";
import { Gravity, NewtonGravity } from "./engine/forces.js";
import { EulerCromer, VelocityVerlet } from "./engine/integrators.js";
import { Camera } from "./render/camera.js";
import { Renderer } from "./render/renderer.js";
import { drawHUD } from "./render/hud.js";

// 1. Simulation Setup and UI Bindings
const canvas = document.getElementById("physicsCanvas");
const sceneSelect = document.getElementById("sceneSelect");
const integratorSelect = document.getElementById("integratorSelect");
const resetBtn = document.getElementById("resetBtn");
const pauseBtn = document.getElementById("pauseBtn");
const benchmarkBtn = document.getElementById("benchmarkBtn"); // Linked to our new button

const camera = new Camera(30, canvas.width / 2, canvas.height / 2);
const renderer = new Renderer(canvas, camera);

let world = null;
let isPaused = false;
let e0 = 0;
let p0 = null;

let lastTime = 0;
let fps = 60;
let tPhysics = 0;
let tRender = 0;

// 2. Scene Generation Library
function initScene() {
  const sceneType = sceneSelect.value;
  const intType = integratorSelect.value;
  
  const selectedIntegrator = intType === "verlet" ? new VelocityVerlet() : new EulerCromer();
  
  world = new World({
    integrator: selectedIntegrator,
    restitution: sceneType === "billiards" ? 0.95 : 1.0,
    bounds: { xMin: -16, xMax: 16, yMin: -9, yMax: 9 }
  });

  if (sceneType === "billiards") {
    world.addForce(new Gravity(0));
    
    for (let i = 0; i < 40; i++) {
      world.add(new Body({
        x: (Math.random() - 0.5) * 28,
        y: (Math.random() - 0.5) * 14,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        m: 1 + Math.random() * 2,
        radius: 0.4 + Math.random() * 0.4,
        color: `hsl(${Math.random() * 360}, 75%, 50%)`
      }));
    }
  } 
  else if (sceneType === "orbital") {
    world.bounds = null; 
    world.addForce(new NewtonGravity(4, 0.1));

    // Fixed Sun
    world.add(new Body({ x: 0, y: 0, vx: 0, vy: 0, m: 55, radius: 0.8, isStatic: true, color: "#f59e0b" }));
    
    // Balanced planets: Lowered velocities (vx/vy) to create clean, closed elliptical orbits
    world.add(new Body({ x: 1, y: 6,  vx: -5.0, vy: 0,   m: .2, radius: 0.4,  color: "#3b82f6" }));
    world.add(new Body({ x: 2, y: -7, vx: 4.5,  vy: 0,   m: .1, radius: 0.3,  color: "#10b981" }));
    world.add(new Body({ x: 8, y: 0,  vx: 0,    vy: 4.2, m: .3, radius: 0.45, color: "#ec4899" }));
  }

  else if (sceneType === "spring") {
    world.addForce(new Gravity(9.81));
    
    const springForce = {
      apply(w) {
        const k = 45;
        const restLength = 1.5;
        for (let i = 0; i < w.bodies.length - 1; i++) {
          const a = w.bodies[i];
          const b = w.bodies[i + 1];
          const d = b.pos.sub(a.pos);
          const r = d.length();
          if (r > 0) {
            const n = d.mul(1 / r);
            const fMag = k * (r - restLength);
            if (!a.isStatic) a.force.addScaled(n, fMag);
            if (!b.isStatic) b.force.addScaled(n, -fMag);
          }
        }
      },
      potentialEnergy(w) {
        let U = 0;
        const k = 45;
        const restLength = 1.5;
        for (let i = 0; i < w.bodies.length - 1; i++) {
          const d = w.bodies[i+1].pos.sub(w.bodies[i].pos);
          const x = d.length() - restLength;
          U += 0.5 * k * x * x;
        }
        return U;
      }
    };
    world.addForce(springForce);

    const anchor = world.add(new Body({ x: 0, y: 6, vx: 0, vy: 0, m: 1, radius: 0.3, isStatic: true, color: "#475569" }));
    let prev = anchor;
    for (let i = 0; i < 5; i++) {
      prev = world.add(new Body({
        x: (i + 1) * 1.5,
        y: 6,
        vx: 0,
        vy: 0,
        m: 1.5,
        radius: 0.4,
        color: "#8b5cf6"
      }));
    }
  }

  e0 = world.totalEnergy();
  p0 = world.totalMomentum();
}

// --- AUTOMATED BENCHMARK SYSTEM CONFIGURATION ---
const benchmarkScales = [10, 25, 50, 100, 200]; 
let currentScaleIndex = 0;
let frameCounter = 0;
const framesPerTest = 500; 

let isProfiling = false; 
const capturedDataLog = []; 
let physicsTimeAccumulator = 0;
let renderTimeAccumulator = 0;
let fpsAccumulator = 0;


function initBenchmarkScene(bodyCount) {
  const selectedIntegrator = integratorSelect.value === "verlet" ? new VelocityVerlet() : new EulerCromer();
  
  world = new World({
    integrator: selectedIntegrator,
    restitution: 0.95,
    bounds: { xMin: -16, xMax: 16, yMin: -9, yMax: 9 }
  });
  world.addForce(new Gravity(0));
  
  for (let i = 0; i < bodyCount; i++) {
    world.add(new Body({
      x: (Math.random() - 0.5) * 28,
      y: (Math.random() - 0.5) * 14,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 15,
      m: 1 + Math.random() * 2,
      radius: 0.4 + Math.random() * 0.4,
      color: `hsl(${Math.random() * 360}, 75%, 50%)`
    }));
  }

  e0 = world.totalEnergy();
  p0 = world.totalMomentum();
  
  frameCounter = 0;
  physicsTimeAccumulator = 0;
  renderTimeAccumulator = 0;
  fpsAccumulator = 0;
  console.log(`🚀 Starting Test Segment: Scaling Profile for ${bodyCount} Bodies...`);
}

function exportBenchmarkToCSV() {
  let csvText = "Bodies,Avg Physics ms,Avg Render ms,Avg FPS\n";
  capturedDataLog.forEach(row => {
    csvText += `${row.bodies},${row.avgPhysics.toFixed(3)},${row.avgRender.toFixed(3)},${row.avgFps.toFixed(1)}\n`;
  });
  
  console.log("📊 ALL SCALING TRIALS COMPLETED!");
  console.table(capturedDataLog);
  
  const blob = new Blob([csvText], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `simulation_performance_report.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// --- RUN-LOOP ---
function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (dt > 0.1) dt = 0.1; 
  if (dt > 0) fps = 0.9 * fps + 0.1 * (1 / dt);

  if (!isPaused) {
    const substeps = 4;
    const stepSize = dt / substeps;
    
    const t0 = performance.now();
    for (let i = 0; i < substeps; i++) {
      world.step(stepSize);
    }
    tPhysics = performance.now() - t0;
  } else {
    tPhysics = 0;
  }

  const t1 = performance.now();
  renderer.draw(world);
  tRender = performance.now() - t1;

  drawHUD(renderer.ctx, world, e0, p0, fps, tPhysics, tRender);

  // --- MODIFIED COLLECTION TRACKING ---
  // Only auto-switches frames if the user actively hit "Run Performance Test"
  if (isProfiling && !isPaused && currentScaleIndex < benchmarkScales.length) {
    frameCounter++;
    physicsTimeAccumulator += tPhysics;
    renderTimeAccumulator += tRender;
    fpsAccumulator += fps;

    if (frameCounter >= framesPerTest) {
      capturedDataLog.push({
        bodies: benchmarkScales[currentScaleIndex],
        avgPhysics: physicsTimeAccumulator / framesPerTest,
        avgRender: renderTimeAccumulator / framesPerTest,
        avgFps: fpsAccumulator / framesPerTest
      });

      currentScaleIndex++;
      if (currentScaleIndex < benchmarkScales.length) {
        initBenchmarkScene(benchmarkScales[currentScaleIndex]);
      } else {
        isProfiling = false;
        isPaused = true;
        exportBenchmarkToCSV();
      }
    }
  }

  requestAnimationFrame(loop);
}







// 4. Interactive Event Listeners
sceneSelect.addEventListener("change", () => {
  isProfiling = false; // Kill benchmark cycle if user changes scene manually
  initScene();
});
integratorSelect.addEventListener("change", () => {
  const intType = integratorSelect.value;
  world.integrator = intType === "verlet" ? new VelocityVerlet() : new EulerCromer();
});
resetBtn.addEventListener("click", () => {
  isProfiling = false;
  initScene();
});
pauseBtn.addEventListener("click", () => {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "Play" : "Pause";
});

// Listener to trigger performance profile on command
benchmarkBtn.addEventListener("click", () => {
  capturedDataLog.length = 0; // Clear any old log data
  currentScaleIndex = 0;
  isProfiling = true;
  isPaused = false;
  initBenchmarkScene(benchmarkScales[0]);
});

// --- IGNITION ---
// Start normal simulation by default
initScene();
requestAnimationFrame(loop);
