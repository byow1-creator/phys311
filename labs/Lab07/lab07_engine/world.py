class World:
    """Manages bodies, forces, the integrator, and records data history."""
    def __init__(self, integrator):
        self.bodies = []
        self.forces = []
        self.integrator = integrator
        self.time = 0.0
        # Data recording structure
        self.history = {
            "time": [],
            "bodies": {}  # Maps body name -> lists of positions/velocities
        }

    def add_body(self, body):
        self.bodies.append(body)
        self.history["bodies"][body.name] = {"pos": [], "vel": []}

    def add_force(self, force):
        self.forces.append(force)

    def step(self, dt):
        """The core physics engine pipeline loop."""
        # 1. Clear forces
        for body in self.bodies:
            body.clear_force()
            
        # 2. Accumulate forces (Polymorphic call)
        for force in self.forces:
            force.apply(self)
            
        # 3. Integrate kinematics
        self.integrator.step(self, dt)
        
        # 4. Record history
        self.time += dt
        self.history["time"].append(self.time)
        for body in self.bodies:
            self.history["bodies"][body.name]["pos"].append(body.position.copy())
            self.history["bodies"][body.name]["vel"].append(body.velocity.copy())
