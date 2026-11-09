import { World } from "./engine/world.js";
import { Body } from "./engine/body.js";
import { Gravity, NewtonGravity, MouseSpring } from "./engine/forces.js";
import { EulerCromer, VelocityVerlet } from "./engine/integrators.js";
import { Camera } from "./render/camera.js";
import { Renderer } from "./render/renderer.js";
import { drawHUD } from "./render/hud.js";
import { Vec2 } from "./engine/Vec2.js";
import { setupKeyboardControls } from "./ui/Keyboard.js";


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
const centralMassSlider = document.getElementById("centralMass");
const centralMassValDisplay = document.getElementById("centralMassVal");

const addHotBtn = document.getElementById("addHotBtn");
const addColdBtn = document.getElementById("addColdBtn");
const insulateBtn = document.getElementById("insulateBtn");

if (addHotBtn) {
  addHotBtn.addEventListener("click", () => {
    if (!world) return;
    for (let i = 0; i < 10; i++) {
      world.add(new Body({
        pos: new Vec2((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8),
        vel: new Vec2((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30),
        mass: 0.5,
        radius: 0.25,
        color: "#ef4444"
      }));
    }
    e0 = world.totalEnergy(); // Re-baseline initial energy after injecting hot gas
  });
}

if (addColdBtn) {
  addColdBtn.addEventListener("click", () => {
    if (!world) return;
    for (let i = 0; i < 10; i++) {
      world.add(new Body({
        pos: new Vec2((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8),
        vel: new Vec2((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2),
        mass: 2.0,
        radius: 0.45,
        color: "#3b82f6"
      }));
    }
    e0 = world.totalEnergy(); // Re-baseline initial energy after injecting cold gas
  });
}

if (insulateBtn) {
  insulateBtn.addEventListener("click", () => {
    if (world) world.restitution = 1.0;
    if (restSlider) restSlider.value = "1.0";
    if (restValDisplay) restValDisplay.textContent = "1.00";
    e0 = world.totalEnergy(); // Re-baseline initial energy when changing wall insulation properties
  });
}



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

    const initialCentralMass = centralMassSlider ? parseFloat(centralMassSlider.value) : 55;

    centralBodyInstance = new Body({ 
      pos: new Vec2(0, 0), 
      vel: new Vec2(0, 0), 
      mass: initialCentralMass, 
      radius: 0.8, 
      fixed: true, 
      color: "#f59e0b" 
    });
    
    world.add(centralBodyInstance);
    
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
 else if (sceneType === "gas") {
    // Rigid insulating box boundaries
    world.bounds = { xMin: -12, xMax: 12, yMin: -7, yMax: 7 };
    world.addForce(new Gravity(0)); // Zero-G environment for an ideal gas chamber

    // Scenario: Start with a non-equilibrium state
    // Top Left: 15 Hot, lightweight, high-energy particles (Red)
    for (let i = 0; i < 15; i++) {
      world.add(new Body({
        pos: new Vec2(-8 + Math.random() * 4, 2 + Math.random() * 4),
        vel: new Vec2((Math.random() - 0.5) * 25, (Math.random() - 0.5) * 25), // Fast speed
        mass: 0.5, // Light
        radius: 0.25,
        color: "#ef4444",
        tag: "gas-hot"
      }));
    }
    e0 = world.totalEnergy();
    // Bottom Right: 15 Cold, massive, slow-energy particles (Blue)
    for (let i = 0; i < 15; i++) {
      world.add(new Body({
        pos: new Vec2(4 + Math.random() * 4, -5 + Math.random() * 4),
        vel: new Vec2((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3), // Sluggish speed
        mass: 2.0, // Heavy
        radius: 0.45,
        color: "#3b82f6",
        tag: "gas-cold"
      }));
    }
    e0 = world.totalEnergy()
  }



  world.addForce(mouseSpringInstance);

  // Re-baseline diagnostics and reset time states cleanly
  e0 = world.totalEnergy();
  p0 = world.totalMomentum();
  acc = 0;
  lastTime = 0;
    world.bodies.forEach(b => {
    b.trailHistory = [];
  });
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


  const t1 = performance.now();
  renderer.draw(world);
  tRender = performance.now() - t1;
  const ctx = renderer.ctx; // Grab the canvas drawing context
  
  if (aimStart && mouseWorldPos) {
    // 1. Calculate the intended velocity vector exactly how you do on pointerup
    const launchVelocity = aimStart.sub(mouseWorldPos).mul(2.0);
    
    // 2. Pass your engine assets to draw the projected neon path lines
    drawTrajectoryPreview(ctx, world, camera, aimStart, launchVelocity);

    // 3. Optional: Draw a physical rubber band string connecting the anchor to your mouse pointer
    const screenStart = camera.toScreen(aimStart);
    const screenMouse = camera.toScreen(mouseWorldPos);
    ctx.save();
    ctx.strokeStyle = "rgba(236, 72, 153, 0.5)"; // Match your pink planet preview color
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenStart.x, screenStart.y);
    ctx.lineTo(screenMouse.x, screenMouse.y);
    ctx.stroke();
    ctx.restore();
  }
  if (mouseWorldPos) {
    const screenPos = camera.toScreen(mouseWorldPos);
    const ctx = renderer.ctx;
    const size = 10; // Crosshair arm length in pixels

    ctx.strokeStyle = "#00ff66"; // Neon green to match your theme elements
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    // Horizontal line
    ctx.moveTo(screenPos.x - size, screenPos.y);
    ctx.lineTo(screenPos.x + size, screenPos.y);
    
    // Vertical line
    ctx.moveTo(screenPos.x, screenPos.y - size);
    ctx.lineTo(screenPos.x, screenPos.y + size);
    
    
    ctx.stroke();
  }

  drawHUD(renderer.ctx, world, e0, p0, fps, tPhysics, tRender, mouseWorldPos);

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
sceneSelect.addEventListener("change", () => {
  isProfiling = false; 
  initScene();
});

integratorSelect.addEventListener("change", () => {
  const intType = integratorSelect.value;
  world.integrator = intType === "verlet" ? VelocityVerlet : EulerCromer;
});

resetBtn.addEventListener("click", () => {
  simState.isProfiling = false;
  initScene();
});

pauseBtn.addEventListener("click", () => {
  simState.isPaused = !simState.isPaused;
  pauseBtn.textContent = simState.isPaused ? "Play" : "Pause";
});

// SECTION 3.1: Trigger a single time slice advance when the Step button is clicked
if (stepBtn) {
  stepBtn.addEventListener("click", () => {
    if (simState.isPaused) simState.stepOnce = true;
  });
}

// --- INITIALIZE KEYBOARD SHORTCUTS CONTROLLER MODULE ---
setupKeyboardControls(simState, initScene);

// SECTION 3: Live parameter tuning with safe string-to-float parsing


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

if (centralMassSlider) {
  centralMassSlider.addEventListener("input", () => {
    const m = parseFloat(centralMassSlider.value);
    if (centralMassValDisplay) {
      centralMassValDisplay.textContent = m.toFixed(0);
    }
    if (centralBodyInstance) {
      centralBodyInstance.mass = m;
      if (!centralBodyInstance.fixed) {
        centralBodyInstance.invMass = 1 / m;
      }
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
  //mouseWorldPos = null;
  aimStart = null;
  mouseSpringInstance.body = null;
  mouseSpringInstance.target = null;
});

// === REPLACE THE FUNCTION AT THE VERY BOTTOM OF MAIN.JS WITH THIS ===
function drawTrajectoryPreview(ctx, world, camera, startPos, launchVel) {
  let virtualPos = new Vec2(startPos.x, startPos.y);
  let virtualVel = new Vec2(launchVel.x, launchVel.y);
  let dummyBody = { pos: virtualPos, vel: virtualVel, mass: 0.2 };
  
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = "rgba(59, 130, 246, 0.7)"; 
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]); // Clean dashed layout line
  
  const totalSteps = 60; 
  const dt = 1 / 60;     
  
  for (let i = 0; i < totalSteps; i++) {
    world.forces.forEach(force => {
      // Check for your gravity force module matching your class constructor name
      if (force.constructor.name === "NewtonGravity") {
        world.bodies.forEach(b => {
          if (b.fixed) { 
            const d = b.pos.sub(dummyBody.pos);
            const r2 = d.lensq();
            if (r2 > 0.01) {
              const r = Math.sqrt(r2);
              const forceMag = (force.G * dummyBody.mass * b.mass) / (r2 * r);
              
              // FIXED: Replaced .scale() with .mul() to align with your Vec2 class definition
              const acc = d.mul(forceMag / dummyBody.mass);
              dummyBody.vel = dummyBody.vel.add(acc.mul(dt));
            }
          }
        });
      }
    });

    // FIXED: Replaced .scale() with .mul() here too
    dummyBody.pos = dummyBody.pos.add(dummyBody.vel.mul(dt));
    const screenCoord = camera.toScreen(dummyBody.pos);
    
    if (i === 0) {
      ctx.moveTo(screenCoord.x, screenCoord.y);
    } else {
      ctx.lineTo(screenCoord.x, screenCoord.y);
    }
  }
  
  ctx.stroke();
  ctx.restore();
}


// --- IGNITION ---
initScene();
requestAnimationFrame(loop);
