// src/engine/Integrators.js

function setAcc(bodies) {
  for (const b of bodies) {
    // Multiplying by inverse mass is faster and perfectly safe for fixed bodies (0 * force = 0)
    b.acc.set(b.force.x * b.invMass, b.force.y * b.invMass);
  }
}

export const EulerCromer = {
  name: 'ec',
  label: 'Euler-Cromer (symplectic)',
  step(world, dt) {
    world.accumulateForces(); // Make sure your world has this method to clear/apply forces
    setAcc(world.bodies);
    for (const b of world.bodies) {
      if (b.fixed) continue; // Changed from b.isStatic
      b.vel.x += b.acc.x * dt;
      b.vel.y += b.acc.y * dt;
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
      if (!b.fixed) {
        b.trailHistory.push(b.pos.clone());
        if (b.trailHistory.length > 15) b.trailHistory.shift(); // Keep last 15 frames
      }
    }
  }
};



export const VelocityVerlet = {
  name: 'verlet',
  label: 'Velocity Verlet (symplectic)',
  step(world, dt) {
    world.accumulateForces();
    setAcc(world.bodies);
    const half = [];
    for (const b of world.bodies) {
      if (b.fixed) { half.push(null); continue; }
      const vhx = b.vel.x + 0.5 * b.acc.x * dt;
      const vhy = b.vel.y + 0.5 * b.acc.y * dt;
      b.pos.x += vhx * dt;
      b.pos.y += vhy * dt;
      half.push([vhx, vhy]);
    }
    world.accumulateForces();
    setAcc(world.bodies);
    world.bodies.forEach((b, i) => {
      if (b.fixed) return;
      b.vel.x = half[i][0] + 0.5 * b.acc.x * dt;
      b.vel.y = half[i][1] + 0.5 * b.acc.y * dt;
      b.trailHistory.push(b.pos.clone());
      if (b.trailHistory.length > 15) b.trailHistory.shift();
    });
  }
};

export function explicitEuler(bodies, dt, forces) {
    // 1. Clear forces & accumulate
    bodies.forEach(b => {
        b.force = new Vec2(0, 0);
        forces.forEach(f => f.apply(b));
    });

    // 2. Explicit Euler Update Step
    bodies.forEach(b => {
        if (b.invMass === 0) return; // skip static boundaries

        // x_new = x_old + v_old * dt (Uses current velocity before updating it!)
        b.pos = b.pos.add(b.vel.scale(dt));

        // v_new = v_old + a * dt
        const accel = b.force.scale(b.invMass);
        b.vel = b.vel.add(accel.scale(dt));
        if (!b.trailHistory) b.trailHistory = [];
        b.trailHistory.push(b.pos.clone());
        if (b.trailHistory.length > 15) b.trailHistory.shift();
    });
}

export function velocityVerlet(bodies, dt, forces) {
    // ... (leave your original velocityVerlet function body alone here) ...
}

export const INTEGRATORS = { ec: EulerCromer, euler: explicitEuler, verlet: VelocityVerlet };
