import { World } from "./engine/world.js";
import { Body } from "./engine/body.js";
import { Gravity, NewtonGravity, MouseSpring } from "./engine/forces.js";
import { EulerCromer, VelocityVerlet } from "./engine/integrators.js";
import { Camera } from "./render/camera.js";
import { Renderer } from "./render/renderer.js";
import { drawHUD } from "./render/hud.js";
import { Vec2 } from "./engine/Vec2.js";

// 1. Simulation Setup and UI Bindings
const canvas = document.getElementById("physicsCanvas");
const sceneSelect = document.getElementById("sceneSelect");
const integratorSelect = document.getElementById("integratorSelect");
const resetBtn = document.getElementById("resetBtn");
const pauseBtn = document.getElementById("pauseBtn");
const benchmarkBtn = document.getElementById("benchmarkBtn"); 

const gravSlider = document.getElementById("grav");
const gravValDisplay = document.getElementById("gravVal");
const restSlider = document.getElementById("rest");
const restValDisplay = document.getElementById("restVal");
const stepBtn = document.getElementById("stepBtn");

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

const DT = 1 / 120;         // Clean, constant physics step size slice
let acc = 0;                // Accumulated time tank tracking leftover delta
let stepOnce = false;       // Handle single frame step clicks while paused
let speed = 1.0;            // Speed scale: 0.25 = slow-mo, 1.0 = normal, 2.0 = fast-forward


// === INTERACTIVE CONTROL STATE TRACKERS ===
let mouseWorldPos = null;   
let grabbedBody = null;     
let aimStart = null;        
const mouseSpringInstance = new MouseSpring(); 

// 2. Scene Generation Library
function initScene() {
  const sceneType = sceneSelect.value;
  const intType = integratorSelect.value;
  
  const selectedIntegrator = intType === "verlet" ? VelocityVerlet : EulerCromer;
  
  // SECTION 3: Safely parse live input string bounds into true mathematical floats
  const initialRestitution = restSlider ? parseFloat(restSlider.value) : (sceneType === "billiards" ? 0.95 : 1.0);
  const initialGravityMagnitude = gravSlider ? parseFloat(gravSlider.value) : (sceneType === "spring" ? 9.81 : 0);

  world = new World({
    integrator: selectedIntegrator,
    restitution: initialRestitution,
    bounds: { xMin: -16, xMax: 16, yMin: -9, yMax: 9 }
  });

  if (sceneType === "billiards") {
    // Save this reference globally so your sliders can manipulate it on the fly!
    activeGravityForce = new Gravity(initialGravityMagnitude);
    world.addForce(activeGravityForce);

    
    for (let i = 0; i < 40; i++) {
      world.add(new Body({
        pos: new Vec2((Math.random() - 0.5) * 28, (Math.random() - 0.5) * 14),
        vel: new Vec2((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15),
        mass: 1 + Math.random() * 2,
        radius: 0.4 + Math.random() * 0.4,
        color: `hsl(${Math.random() * 360}, 75%, 50%)`
      }));
    }
  } 
  else if (sceneType === "orbital") {
    world.bounds = null; 
    world.addForce(new NewtonGravity(4, 0.1));

    world.add(new Body({ pos: new Vec2(0, 0), vel: new Vec2(0, 0), mass: 55, radius: 0.8, fixed: true, color: "#f59e0b" }));
    
    world.add(new Body({ pos: new Vec2(1, 6),  vel: new Vec2(-5.0, 0),   mass: .2, radius: 0.4,  color: "#3b82f6" }));
    world.add(new Body({ pos: new Vec2(2, -7), vel: new Vec2(4.5,  0),   mass: .1, radius: 0.3,  color: "#10b981" }));
    world.add(new Body({ pos: new Vec2(8, 0),  vel: new Vec2(0,    4.2), mass: .3, radius: 0.45, color: "#ec4899" }));
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
            if (!a.fixed) a.force.addTo(n.mul(fMag));
            if (!b.fixed) b.force.addTo(n.mul(-fMag));
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

    const anchor = world.add(new Body({ pos: new Vec2(0, 6), vel: new Vec2(0, 0), mass: 1, radius: 0.3, fixed: true, color: "#475569" }));
    for (let i = 0; i < 5; i++) {
      world.add(new Body({
        pos: new Vec2((i + 1) * 1.5, 6),
        vel: new Vec2(0, 0),
        mass: 1.5,
        radius: 0.4,
        color: "#8b5cf6"
      }));
    }
  }
  world.addForce(mouseSpringInstance);

  // Re-baseline diagnostics and reset time states cleanly
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

  // SECTION 3.1: Accumulate time based on simulation play state
  if (!isPaused) {
    acc += frameTime * speed; 
  } else if (stepOnce) {
    acc += DT;  
    stepOnce = false; // Instantly consume the single-step request
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


  const t1 = performance.now();
  renderer.draw(world);
  tRender = performance.now() - t1;

  drawHUD(renderer.ctx, world, e0, p0, fps, tPhysics, tRender);

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

function eventToWorld(event, canvas, camera) {
  const rect = canvas.getBoundingClientRect();
  const px = (event.clientX - rect.left) * (canvas.width / rect.width);
  const py = (event.clientY - rect.top ) * (canvas.height / rect.height);
  return camera.toWorld(px, py);
}

// 4. Interactive Event Listeners
sceneSelect.addEventListener("change", () => {
  isProfiling = false; 
  initScene();
});

integratorSelect.addEventListener("change", () => {
  const intType = integratorSelect.value;
  world.integrator = intType === "verlet" ? VelocityVerlet : EulerCromer;
});

resetBtn.addEventListener("click", () => {
  isProfiling = false;
  initScene();
});

pauseBtn.addEventListener("click", () => {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "Play" : "Pause";
});
// SECTION 3.1: Trigger a single time slice advance when the Step button is clicked
if (stepBtn) {
  stepBtn.addEventListener("click", () => {
    if (isPaused) stepOnce = true;
  });
}

// SECTION 3: Live parameter tuning with safe string-to-float parsing
if (gravSlider) {
  gravSlider.addEventListener("input", () => {
    const g = parseFloat(gravSlider.value); // ALWAYS parse — value is a string!
    if (activeGravityForce) {
      activeGravityForce.g = g;
    }
    if (gravValDisplay) {
      gravValDisplay.textContent = g.toFixed(2);
    }
  });
}

if (restSlider) {
  restSlider.addEventListener("input", () => {
    const e = parseFloat(restSlider.value); // ALWAYS parse — value is a string!
    if (world) {
      world.restitution = e;
    }
    if (restValDisplay) {
      restValDisplay.textContent = e.toFixed(2);
    }
  });
}

benchmarkBtn.addEventListener("click", () => {
  capturedDataLog.length = 0; 
  currentScaleIndex = 0;
  isProfiling = true;
  isPaused = false;
  initBenchmarkScene(benchmarkScales[0]);
});

// === UPDATED INTERACTIVE MOUSE CONTROLS ===
canvas.addEventListener("pointerdown", (event) => {
  if (!world) return;
  const clickPos = eventToWorld(event, canvas, camera);
  mouseWorldPos = clickPos.clone(); 
  grabbedBody = null; 
  aimStart = null;
  
  mouseSpringInstance.body = null;
  mouseSpringInstance.target = null;
  
  for (let i = world.bodies.length - 1; i >= 0; i--) {
    const b = world.bodies[i];
    const dx = clickPos.x - b.pos.x;
    const dy = clickPos.y - b.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const pickRadius = Math.max(b.radius, 0.45); 
    
    if (distance <= pickRadius) {
      grabbedBody = b;
      mouseSpringInstance.body = b;
      mouseSpringInstance.target = mouseWorldPos; 
      break;
    }
  }

  if (!grabbedBody) {
    aimStart = clickPos.clone();
  }
});

canvas.addEventListener("pointermove", (event) => {
  const currentPos = eventToWorld(event, canvas, camera);
  if (grabbedBody && mouseWorldPos) {
    mouseWorldPos.set(currentPos.x, currentPos.y);
  } else {
    mouseWorldPos = currentPos;
  }
});

canvas.addEventListener("pointerup", () => {
  if (aimStart && mouseWorldPos) {
    const launchVelocity = aimStart.sub(mouseWorldPos).mul(2.0);
    world.add(new Body({
      pos: aimStart,
      vel: launchVelocity,
      mass: 1.5,
      radius: 0.3,
      color: "#ec4899"
    }));
  }

  grabbedBody = null;
  mouseWorldPos = null;
  aimStart = null;
  mouseSpringInstance.body = null;
  mouseSpringInstance.target = null;
});

// --- IGNITION ---
initScene();
requestAnimationFrame(loop);
