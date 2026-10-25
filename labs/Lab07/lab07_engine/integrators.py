class EulerCromer:
    """Semi-implicit Euler integration scheme (Conserves energy well for orbits/springs)."""
    def step(self, world, dt):
        dt = float(dt)
        for body in world.bodies:
            if body.mass == 0 or body.mass == float('inf'):
                continue
            # 1. Update velocity FIRST using accumulated forces
            accel = body.force / body.mass
            body.velocity += accel * dt
            # 2. Update position SECOND using the NEW velocity
            body.position += body.velocity * dt
            
class VelocityVerlet:
    """Velocity Verlet integration scheme (Provides excellent long-term orbit stability)."""
    def step(self, world, dt):
        dt = float(dt)
        for body in world.bodies:
            if body.mass == 0 or body.mass == float('inf'):
                continue
            
            # 1. Initialize stored acceleration on the first time step
            if not hasattr(body, '_a_old'):
                body._a_old = body.force / body.mass
            
            # 2. Get the newly accumulated acceleration at the current position
            a_current = body.force / body.mass
            
            # 3. Update velocity using the average of the old and current acceleration
            # v_t = v_{t-dt} + 0.5 * (a_{t-dt} + a_t) * dt
            body.velocity += 0.5 * (body._a_old + a_current) * dt
            
            # 4. Update position using the synchronized velocity and current acceleration
            # r_{t+dt} = r_t + v_t * dt + 0.5 * a_t * dt^2
            body.position += body.velocity * dt + 0.5 * a_current * dt**2
            
            # 5. Save the current acceleration to use as old acceleration in the next step
            body._a_old = a_current
