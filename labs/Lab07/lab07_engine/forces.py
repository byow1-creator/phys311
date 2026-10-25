import numpy as np

class Force:
    """Abstract base class for all force types (Polymorphism)."""
    def apply(self, world):
        raise NotImplementedError("Subclasses must implement apply(world)")

class UniformGravity(Force):
    """Applies a constant downward gravitational force to all bodies."""
    def __init__(self, g=9.81):
        self.g = np.array([0.0, -g], dtype=float)

    def apply(self, world):
        for body in world.bodies:
            # F = m * g
            body.force += body.mass * self.g

class LinearDrag(Force):
    """Applies air resistance opposing the direction of velocity (F = -b * v)."""
    def __init__(self, b=0.1):
        self.b = float(b)

    def apply(self, world):
        for body in world.bodies:
            body.force -= self.b * body.velocity

class SpringForce(Force):
    """Applies Hooke's Law correctly, accounting for compression vector signs."""
    def __init__(self, body_a, body_b, k, rest_length):
        self.body_a = body_a
        self.body_b = body_b
        self.k = float(k)
        self.rest_length = float(rest_length)

    def apply(self, world):
        # 1. Distance vector from A to B
        r_vec = self.body_b.position - self.body_a.position
        dist = np.linalg.norm(r_vec)
        
        if dist == 0:
            return  # Prevent division by zero
            
        r_hat = abs(r_vec / dist)    # needs to be an absolute value to ensure the direction is correct
        displacement = dist - self.rest_length
        
        # 2. Hooke's law restorative force magnitude
        f_mag = self.k * displacement
        f_vec = f_mag * r_hat
        
        # 3. Action-Reaction (Newton's Third Law)
        # Pull body_a toward body_b, and pull body_b toward body_a
        self.body_b.force -= f_vec
        self.body_a.force += f_vec

        
class NewtonGravity(Force):
    """Applies Newton's Law of Universal Gravitation between two specific bodies."""
    def __init__(self, body_a, body_b, G=1.0):
        self.body_a = body_a
        self.body_b = body_b
        self.G = float(G)

    def apply(self, world):
        # 1. Distance vector from A to B
        r_vec = self.body_b.position - self.body_a.position
        dist = np.linalg.norm(r_vec)
        
        if dist == 0:
            return  # Prevent division by zero
            
        r_hat = r_vec / dist
        
        # 2. Gravitational force magnitude: F = G * m1 * m2 / r^2
        f_mag = (self.G * self.body_a.mass * self.body_b.mass) / (dist ** 2)
        f_vec = f_mag * r_hat
        
        # 3. Action-Reaction (Newton's Third Law)
        self.body_a.force += f_vec
        self.body_b.force -= f_vec
class ElasticCollision(Force):
    """Handles perfect elastic circle-circle collisions between all bodies."""
    def __init__(self, radius=0.5, restitution=1.0):
        self.radius = float(radius)
        self.restitution = float(restitution)  # 1.0 = perfectly elastic

    def apply(self, world):
        n_bodies = len(world.bodies)
        # Check every unique pair of bodies
        for i in range(n_bodies):
            for j in range(i + 1, n_bodies):
                b1 = world.bodies[i]
                b2 = world.bodies[j]
                
                # Calculate distance vector
                r_vec = b2.position - b1.position
                dist = np.linalg.norm(r_vec)
                min_dist = 2 * self.radius  # Assuming uniform size for simplicity
                
                if dist < min_dist and dist > 0:
                    # 1. Resolve Overlap (Positional Correction to prevent sticking)
                    overlap = min_dist - dist
                    normal = r_vec / dist
                    correction = (overlap / 2.0) * normal
                    b1.position -= correction
                    b2.position += correction
                    
                    # 2. Impulse Physics (Velocity Change)
                    relative_vel = b2.velocity - b1.velocity
                    vel_along_normal = np.dot(relative_vel, normal)
                    
                    # Only bounce if they are moving toward each other
                    if vel_along_normal < 0:
                        # Calculate impulse scalar
                        reduced_mass = (b1.mass * b2.mass) / (b1.mass + b2.mass)
                        impulse_scalar = -(1.0 + self.restitution) * vel_along_normal * reduced_mass
                        
                        # Apply impulse to velocities directly
                        b1.velocity -= (impulse_scalar / b1.mass) * normal
                        b2.velocity += (impulse_scalar / b2.mass) * normal

                        # === FIX A: RESET VELOCITY VERLET ACCELERATION CACHE ===
                        # This prevents artificial energy changes after hard impulses
                        if hasattr(b1, '_a_old'):
                            delattr(b1, '_a_old')
                        if hasattr(b2, '_a_old'):
                            delattr(b2, '_a_old')
class BoxBoundary(Force):
    """Keeps all bodies contained within a 2D box by bouncing them off the walls."""
    def __init__(self, x_min=-5.0, x_max=5.0, y_min=-3.0, y_max=7.0, radius=0.4, restitution=1.0):
        self.x_min = float(x_min)
        self.x_max = float(x_max)
        self.y_min = float(y_min)
        self.y_max = float(y_max)
        self.radius = float(radius)
        self.restitution = float(restitution)

    def apply(self, world):
        for body in world.bodies:
            collided = False  # Track if a bounce occurs on this frame

            # Left Wall
            if body.position[0] - self.radius < self.x_min:
                body.position[0] = self.x_min + self.radius
                if body.velocity[0] < 0:
                    body.velocity[0] = -body.velocity[0] * self.restitution
                    collided = True
            
            # Right Wall
            elif body.position[0] + self.radius > self.x_max:
                body.position[0] = self.x_max - self.radius
                if body.velocity[0] > 0:
                    body.velocity[0] = -body.velocity[0] * self.restitution
                    collided = True

            # Bottom Floor (Prevents falling off screen)
            if body.position[1] - self.radius < self.y_min:
                body.position[1] = self.y_min + self.radius
                if body.velocity[1] < 0:
                    body.velocity[1] = -body.velocity[1] * self.restitution
                    collided = True
            
            # Top Ceiling
            elif body.position[1] + self.radius > self.y_max:
                body.position[1] = self.y_max - self.radius
                if body.velocity[1] > 0:
                    body.velocity[1] = -body.velocity[1] * self.restitution
                    collided = True

            # === FIX A: RESET VELOCITY VERLET ACCELERATION CACHE ===
            # If the body hit a wall, delete its old acceleration 
            # to keep the integrator synced up.
            if collided and hasattr(body, '_a_old'):
                delattr(body, '_a_old')
