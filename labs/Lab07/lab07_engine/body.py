import numpy as np

class Body:
    """Represents a single moving point-mass in the engine."""
    def __init__(self, mass, position, velocity, name="body"):
        self.mass = float(mass)
        # Force shallow dependencies on NumPy using basic 1D arrays
        self.position = np.array(position, dtype=float)
        self.velocity = np.array(velocity, dtype=float)
        self.force = np.zeros(2, dtype=float)
        self.name = name

    def clear_force(self):
        """Resets the force accumulator before every physics step."""
        self.force = np.zeros(2, dtype=float)
        