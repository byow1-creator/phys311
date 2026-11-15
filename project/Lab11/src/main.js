import { World } from "./engine/world.js";
import { Body } from "./engine/body.js";
import { Gravity, NewtonGravity, MouseSpring } from "./engine/forces.js";
import { VelocityVerlet } from "./engine/integrators.js";
import { Camera } from "./render/camera.js";
import { Renderer } from "./render/renderer.js";
import { drawHUD } from "./render/hud.js";
import { Vec2 } from "./engine/Vec2.js";
import { setupKeyboardControls } from "./ui/Keyboard.js";


// 1. Simulation Setup and UI Bindings
const canvas = document.getElementById("physicsCanvas");
const integratorSelect = document.getElementById("integratorSelect");
const resetBtn = document.getElementById("resetBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stepBtn = document.getElementById("stepBtn");
const benchmarkBtn = document.getElementById("benchmarkBtn");

const centralMassSlider = document.getElementById("centralMass");
const centralMassValDisplay = document.getElementById("centralMassVal");
const previewStepsSlider = document.getElementById("previewSteps");
const previewStepsValDisplay = document.getElementById("previewStepsVal");

// Orbital Golf Game State
const golfState = {
  teePos: new Vec2(-11, -4),
  goalPos: new Vec2(11, 4),
  goalRadius: 1.001,
  maxCaptureSpeed: 6.0,
  strokes: 0,
  status: "AIMING", // "AIMING", "IN_FLIGHT", "CRASHED", "SCORED"
  activeProbe: null
};




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

let activeGravityForce = null; 

let centralBodyInstance = null; 

const DT = 1 / 120;         // Clean, constant physics step size slice
let acc = 0;                // Accumulated time tank tracking leftover delta
let stepOnce = false;       // Handle single frame step clicks while paused
let speed = 1.0;            // Speed scale: 0.25 = slow-mo, 1.0 = normal, 2.0 = fast-forward

// --- CONSOLIDATED WIDGET/SIMULATION STATES ---
const simState = {
  isPaused: false,
  stepOnce: false,
  speed: 1.0,
  isProfiling: false
};

// === INTERACTIVE CONTROL STATE TRACKERS ===
let mouseWorldPos = null;   
let grabbedBody = null;     
let aimStart = null;        
const mouseSpringInstance = new MouseSpring(); 

// 2. Scene Generation Library (Orbital Golf Level 1)
function initScene() {


  world = new World({
    integrator: VelocityVerlet,
    restitution: 0.8,
    bounds: null // Open space for orbits
  });

  world.addForce(new NewtonGravity(4.0, 0.1));

  const initialCentralMass = centralMassSlider ? parseFloat(centralMassSlider.value) : 55;

  // 1. Central Star (Fixed)
  centralBodyInstance = new Body({
    pos: new Vec2(0, 0),
    vel: new Vec2(0, 0),
    mass: initialCentralMass,
    radius: 1.1,
    fixed: true,
    color: "#f59e0b",
    tag: "star"
  });
  world.add(centralBodyInstance);

  // 2. Orbiting Planet Obstacle (v = sqrt(G * M / r) for circular orbit at r = 5.5)
  const orbitR = 5.5;
  const vCircular = Math.sqrt((4.0 * initialCentralMass) / orbitR);
  world.add(new Body({
    pos: new Vec2(0, orbitR),
    vel: new Vec2(-vCircular, 0),
    mass: 3.0,
    radius: 0.55,
    fixed: false,
    color: "#3b82f6",
    tag: "planet"
  }));

  // 3. Reset Golf State
  golfState.strokes = 0;
  golfState.status = "AIMING";
  golfState.activeProbe = null;
  aimStart = null;

  // Re-baseline diagnostics and reset time states
  e0 = world.totalEnergy();
  p0 = world.totalMomentum();
  acc = 0;
  lastTime = 0;
}


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
  const selectedIntegrator = integratorSelect.value === "verlet" ? VelocityVerlet : EulerCromer;
  
  world = new World({
    integrator: selectedIntegrator,
    restitution: restSlider ? parseFloat(restSlider.value) : 0.95,
    bounds: { xMin: -16, xMax: 16, yMin: -9, yMax: 9 }
  });
  activeGravityForce = new Gravity(gravSlider ? parseFloat(gravSlider.value) : 0);
  world.addForce(activeGravityForce);
  
  for (let i = 0; i < bodyCount; i++) {
    world.add(new Body({
      pos: new Vec2((Math.random() - 0.5) * 28, (Math.random() - 0.5) * 14),
      vel: new Vec2((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15),
      mass: 1 + Math.random() * 2,
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
  acc = 0;
  lastTime = 0;
  console.log(`🚀 Starting Test Segment: Scaling Profile for ${bodyCount} Bodies...`);
}

// --- RUN-LOOP ---
function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let frameTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Tab-switching protection clamp to avoid physics explosion spikes
  if (frameTime > 0.25) frameTime = 0.25; 
  if (frameTime > 0) fps = 0.9 * fps + 0.1 * (1 / frameTime);

  // SECTION 3.1: Accumulate time based on simulation play state (Updated for simState)
  if (!simState.isPaused) {
    acc += frameTime * simState.speed; 
  } else if (simState.stepOnce) {
    acc += DT;  
    simState.stepOnce = false; // Instantly consume the single-frame step clicks while paused
  }

  const t0 = performance.now();
  let stepsRun = 0;
  
  // Consume time chunks in uniform, perfectly deterministic slices
  while (acc >= DT) {
    world.step(DT);
    acc -= DT;
    stepsRun++;
  }
  
  if (stepsRun > 0) {
    tPhysics = performance.now() - t0;
  } else {
    tPhysics = 0;
  }


  // Check Orbital Golf Win / Crash Conditions
  if (golfState.status === "IN_FLIGHT" && golfState.activeProbe) {
    const probe = golfState.activeProbe;
    const distToGoal = probe.pos.sub(golfState.goalPos).len();
    const probeSpeed = probe.vel.len();

    // 1. Check Goal Capture
    if (distToGoal <= golfState.goalRadius && probeSpeed <= golfState.maxCaptureSpeed) {
      golfState.status = "SCORED";
      probe.vel.set(0, 0);
      probe.fixed = true;
    }

    // 2. Check Collision with Star or Planet
    for (const b of world.bodies) {
      if (b === probe) continue;
      const dist = probe.pos.sub(b.pos).len();
      if (dist <= probe.radius + b.radius + 0.05) {
        golfState.status = "CRASHED";
        probe.vel.set(0, 0);
        probe.fixed = true;
        break;
      }
    }

    // 3. Check Out of Bounds (escaped gravity well)
    if (probe.pos.len() > 35) {
      golfState.status = "LOST";
    }
  }

  const t1 = performance.now();
  renderer.draw(world, golfState);
  tRender = performance.now() - t1;
  const ctx = renderer.ctx;

  if (aimStart && mouseWorldPos && golfState.status === "AIMING") {
    const launchVelocity = aimStart.sub(mouseWorldPos).mul(2.0);
    if (launchVelocity.len() > 22) {
      launchVelocity.mulTo(22 / launchVelocity.len());
    }
    const steps = previewStepsSlider ? parseInt(previewStepsSlider.value, 10) : 180;
    drawTrajectoryPreview(ctx, world, camera, aimStart, launchVelocity, steps);


    const screenStart = camera.toScreen(aimStart);
    const screenMouse = camera.toScreen(mouseWorldPos);
    ctx.save();
    ctx.strokeStyle = "rgba(236, 72, 153, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenStart.x, screenStart.y);
    ctx.lineTo(screenMouse.x, screenMouse.y);
    ctx.stroke();
    ctx.restore();
  }

  if (mouseWorldPos) {
    const screenPos = camera.toScreen(mouseWorldPos);
    const size = 10;
    ctx.strokeStyle = "#00ff66";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenPos.x - size, screenPos.y);
    ctx.lineTo(screenPos.x + size, screenPos.y);
    ctx.moveTo(screenPos.x, screenPos.y - size);
    ctx.lineTo(screenPos.x, screenPos.y + size);
    ctx.stroke();
  }

  drawHUD(renderer.ctx, world, e0, p0, fps, tPhysics, tRender, mouseWorldPos, golfState);


  if (simState.isProfiling && !simState.isPaused && currentScaleIndex < benchmarkScales.length) {
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
        simState.isProfiling = false;
        simState.isPaused = true;
        exportBenchmarkToCSV(); // Ensure this helper exists in your code bank if profiling completes
      }
    }
  }

  requestAnimationFrame(loop);
}


function eventToWorld(event, canvas, camera) {
  const rect = canvas.getBoundingClientRect();
  
  const clientX = event.clientX - rect.left;
  const clientY = event.clientY - rect.top;
  
  const px = clientX * (canvas.width / rect.width);
  const py = clientY * (canvas.height / rect.height);
  
  return camera.toWorld(px, py);
}


// 4. Interactive Event Listeners
if (integratorSelect) {
  integratorSelect.addEventListener("change", () => {
    const intType = integratorSelect.value;
    world.integrator = intType === "ec" ? EulerCromer : VelocityVerlet;
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    simState.isProfiling = false;
    initScene();
  });
}

if (pauseBtn) {
  pauseBtn.addEventListener("click", () => {
    simState.isPaused = !simState.isPaused;
    pauseBtn.textContent = simState.isPaused ? "Play" : "Pause";
  });
}

if (stepBtn) {
  stepBtn.addEventListener("click", () => {
    if (simState.isPaused) simState.stepOnce = true;
  });
}

setupKeyboardControls(simState, initScene);

if (centralMassSlider) {
  centralMassSlider.addEventListener("input", () => {
    const m = parseFloat(centralMassSlider.value);
    if (centralMassValDisplay) centralMassValDisplay.textContent = m.toFixed(0);
    if (centralBodyInstance) {
      centralBodyInstance.mass = m;
    }
  });
}

if (previewStepsSlider) {
  previewStepsSlider.addEventListener("input", () => {
    if (previewStepsValDisplay) {
      previewStepsValDisplay.textContent = previewStepsSlider.value;
    }
  });
}

if (benchmarkBtn) {
  benchmarkBtn.addEventListener("click", () => {
    capturedDataLog.length = 0;
    currentScaleIndex = 0;
    isProfiling = true;
    isPaused = false;
    initBenchmarkScene(benchmarkScales[0]);
  });
}

// === ORBITAL GOLF SLINGSHOT CONTROLS ===
canvas.addEventListener("pointerdown", (event) => {
  if (!world) return;
  const clickPos = eventToWorld(event, canvas, camera);
  mouseWorldPos = clickPos.clone();

  // If previous shot crashed, missed, or scored, clicking allows next stroke from Tee
  if (golfState.status !== "AIMING" && golfState.status !== "IN_FLIGHT") {
    if (golfState.activeProbe) {
      world.bodies = world.bodies.filter(b => b !== golfState.activeProbe);
      golfState.activeProbe = null;
    }
    golfState.status = "AIMING";
  }

  if (golfState.status === "AIMING") {
    aimStart = golfState.teePos.clone();
  }
});

canvas.addEventListener("pointermove", (event) => {
  const currentPos = eventToWorld(event, canvas, camera);
  mouseWorldPos = currentPos;
});

canvas.addEventListener("pointerup", () => {
  if (aimStart && mouseWorldPos && golfState.status === "AIMING") {
    const launchVelocity = aimStart.sub(mouseWorldPos).mul(2.0);
    // Clamp max launch speed for stability
    if (launchVelocity.len() > 22) {
      launchVelocity.mulTo(22 / launchVelocity.len());
    }

    const probe = new Body({
      pos: golfState.teePos.clone(),
      vel: launchVelocity,
      mass: 0.05,
      radius: 0.22,
      color: "#ec4899",
      tag: "probe"
    });

    world.add(probe);
    golfState.activeProbe = probe;
    golfState.strokes += 1;
    golfState.status = "IN_FLIGHT";
    e0 = world.totalEnergy();
  }
  aimStart = null;
});

// === EXACT VELOCITY VERLET GHOST TRAJECTORY PREDICTOR ===
function drawTrajectoryPreview(ctx, world, camera, startPos, launchVel, totalSteps = 180) {
  const gravForce = world.forces.find(f => f.constructor.name === "NewtonGravity");
  const G = gravForce ? gravForce.G : 4.0;
  const eps2 = gravForce ? gravForce.eps ** 2 : 0.01;

  // Clone all non-probe bodies (star + planets) with acceleration vectors
  const simBodies = world.bodies
    .filter(b => b.tag !== "probe")
    .map(b => ({
      pos: b.pos.clone(),
      vel: b.vel.clone(),
      acc: new Vec2(0, 0),
      mass: b.mass,
      radius: b.radius,
      fixed: b.fixed
    }));

  // Add the virtual probe to the cloned system
  const probe = {
    pos: startPos.clone(),
    vel: launchVel.clone(),
    acc: new Vec2(0, 0),
    mass: 0.05,
    radius: 0.22,
    fixed: false
  };
  simBodies.push(probe);

  function computeAllAccelerations(bodies) {
    for (const b of bodies) b.acc.set(0, 0);
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].pos.x - bodies[i].pos.x;
        const dy = bodies[j].pos.y - bodies[i].pos.y;
        const r2 = dx * dx + dy * dy + eps2;
        const fOverR = (G * bodies[i].mass * bodies[j].mass) / (r2 * Math.sqrt(r2));

        if (!bodies[i].fixed) {
          bodies[i].acc.x += (dx * fOverR) / bodies[i].mass;
          bodies[i].acc.y += (dy * fOverR) / bodies[i].mass;
        }
        if (!bodies[j].fixed) {
          bodies[j].acc.x -= (dx * fOverR) / bodies[j].mass;
          bodies[j].acc.y -= (dy * fOverR) / bodies[j].mass;
        }
      }
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = "rgba(59, 130, 246, 0.85)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);

  computeAllAccelerations(simBodies);
  const startScreen = camera.toScreen(probe.pos);
  ctx.moveTo(startScreen.x, startScreen.y);

  for (let i = 0; i < totalSteps; i++) {
    // 1. Half-step velocity & full-step position for ALL moving bodies
    for (const b of simBodies) {
      if (b.fixed) continue;
      b.vel.x += 0.5 * b.acc.x * DT;
      b.vel.y += 0.5 * b.acc.y * DT;
      b.pos.x += b.vel.x * DT;
      b.pos.y += b.vel.y * DT;
    }

    // 2. Recompute pairwise gravity at new positions & finish velocity step
    computeAllAccelerations(simBodies);
    for (const b of simBodies) {
      if (b.fixed) continue;
      b.vel.x += 0.5 * b.acc.x * DT;
      b.vel.y += 0.5 * b.acc.y * DT;
    }

    const screenCoord = camera.toScreen(probe.pos);
    ctx.lineTo(screenCoord.x, screenCoord.y);

    // Stop preview if probe hits a star/planet or enters the goal
    const hitBody = simBodies.some(b => b !== probe && probe.pos.sub(b.pos).len() <= b.radius + probe.radius + 0.05);
    const hitGoal = probe.pos.sub(golfState.goalPos).len() <= golfState.goalRadius;
    if (hitBody || hitGoal) break;
  }

  ctx.stroke();
  ctx.restore();
}


// --- IGNITION ---
initScene();
requestAnimationFrame(loop);
