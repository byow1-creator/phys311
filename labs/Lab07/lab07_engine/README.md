# 🪐 Custom 2D Multi-Body Physics Engine
**Brayden Yow**  
*Date: 10/23/26*  
*Block 2 Checkpoint*

---

## 📝 Project Overview
I chose to simulate a system with four interacting bodies in 2D using the physics engine that I built for lab 7. This engine utilizes a **decoupled, polymorphic architecture** to separate force accumulation, state integration, and environmental bounds. 

This simulation showcases a **multi body** kinematic system within a box. The objects interact with an elastic force aswell as under the force of gravity. I chose to show 16 steps showcasing a collision of all the balls at once and some time after.

---

## 🛠️ Software Architecture & Pipeline
The engine disconnects the structural segments of code as to allow a simulation that can be extended to add new forces without compleat reworking. Such as the addition of the box boundary in the 'Forces' folder. The excuted code blocks work in the order as fallows:

1. **Force Reset:** `World.step(dt)` initializes a clean slate by purging residual accumulators (`body.clear_force()`).
2. **Force Accumulation:** Polymorphic execution routines iterate through all added forces via `force.apply(self)`, tracking simultaneous environment interactions.
3. **State Integration:** Kinematic arrays are advanced securely using the `VelocityVerlet` or `EulerCromer` algorithms.
4. **History Recording:** Coordinates, velocities, and tracking profiles are mapped into persistent state histories for downstream rendering.

### Available System Components
* **Integrators:** `VelocityVerlet` (energy-conserving orbit stability), `EulerCromer` (semi-implicit scheme).
* **Forces:** `UniformGravity`, `NewtonGravity` (Universal Gravitation), `SpringForce` (Hooke's Law), `LinearDrag` (air resistance)
* **Interactions:** `ElasticCollision` (impulse-based bouncing), `BoxBoundary` (solid walls container).

---

## 📊 Conservation Law Verification
To prove that the code functions correctly and the engine fallows the laws of physics, the system tracks and evaluates **Total Mechanical Energy (E = KE + PE)** across high-velocity chaotic impacts. 

### Verlet-Impulse Sync Resolution
When there is an instantaneous velocity shift, such as an elastic impact, the continuse acceleration assumed by the Velocity Verlet integrator stats to drift. This engine actively works to counter this effect by wiping the old acceleration from the integrator after the velocity changes:

```python
# Force-Impulse Memory Flush
if collided and hasattr(body, '_a_old'):
    delattr(body, '_a_old')
```
By removing historical state caches (`_a_old`) immediately following discrete velocity transformations, the engine forces a clean re-evaluation of acceleration fields on the next frame. This prevents artificial energy drifting or gains, guaranteeing exact physical conservation profiles.

---

## 🖼️ High-Density Interaction Simulation
The engine is verified using a 4-body system with mismatched masses and randomized intersecting trajectories, fully contained inside a hard-surface bounding box. 

The visual performance sequence is rendered across a dense **4x4 panel milestone timeline** ($16$ snapshots sampled at concise $0.7\text{s}$ time intervals). Trajectory tails map path deflections directly at the impact interfaces, while explicit velocity vector mappings dynamically mirror momentum distributions as they swap lengths and directions during elastic frames.