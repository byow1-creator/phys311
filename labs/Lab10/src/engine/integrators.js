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
    });
  }
};

export const INTEGRATORS = { ec: EulerCromer, verlet: VelocityVerlet };
