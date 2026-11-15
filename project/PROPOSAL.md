# Final Project Proposal

---------------------------------------------------------------------------------------------------

## A1 -- Title and Pitch 
**Astronomical golf**: Clicking and dragging on the screen to find the trajectory of your satellite that will lead to the green goal while keeping your speed under 6 m/s. 

---------------------------------------------------------------------------------------------------

## A2 -- The Physics

* **Time ($\text{s}$):** Fixed physics timestep $\Delta t = \frac{1}{120}\text{ s} \approx 0.00833\text{ s}$; typical shot flight duration is $1.5\text{–}4.0\text{ s}$.
* **Mass ($\text{kg}$) & Gravity ($G$):** Central star $M_1 = 55\text{ kg}$ (tunable $20\text{–}120\text{ kg}$), orbiting planet $M_2 = 3.0\text{ kg}$, probe $m_p = 0.05\text{ kg}$, and scaled gravitational constant $G = 4.0\text{ N}\cdot\text{m}^2/\text{kg}^2$.
* **Velocity ($\text{m/s}$):** Circular planet speed $v_c = \sqrt{G M_1 / r_0} \approx 6.32\text{ m/s}$; probe launch speed clamped to $v_{\text{launch}} \le 22\text{ m/s}$.
 
  Every pair of bodies exerts a mutual inverse-square gravitational pull:
  $$\vec{F}_{ij} = \frac{G \, m_i \, m_j}{\left(r_{ij}^2 + \varepsilon^2\right)^{3/2}} \, \vec{r}_{ij}$$
  where $\vec{r}_{ij} = \vec{r}_j - \vec{r}_i$ and $r_{ij} = |\vec{r}_{ij}|$.
* **Conserved Mechanical Energy ($E_{\text{total}}$):**  
  $$E_{\text{total}} = \sum_{i} \frac{1}{2} m_i |\vec{v}_i|^2 - \sum_{i < j} \frac{G \, m_i \, m_j}{\sqrt{r_{ij}^2 + \varepsilon^2}}$$
* **Capture, Collision & Escape Constraints:**  
  * **Goal Capture (`SCORED`):** Triggered when $|\vec{r}_p - \vec{r}_{\text{goal}}| \le r_{\text{goal}}$ **and** $|\vec{v}_p| \le v_{\text{max}}$, clamping $\vec{v}_p = \vec{0}$.
  * **Planetary Impact (`CRASHED`):** Triggered when $|\vec{r}_p - \vec{r}_i| \le R_p + R_i + 0.05\text{ m}$, halting the probe.
  * **Escape (`LOST`):** Triggered if $|\vec{r}_p| > 35\text{ m}$.

### The "One New Thing"
* **Non-Destructive Multi-Body Ghost Trajectory Predictor & Velocity-Bounded Capture:**  
 This project introduces a **real-time cloned-state N-body trajectory predictor** that integrates both the probe and orbiting planets forward under full mutual gravity without mutating the live world, paired with a **velocity-bounded orbital capture rule** ($|\vec{v}_p| \le v_{\text{max}}$ inside `goalRadius`).

### Integrator Choice & Justification
* **Integrator:** **Velocity Verlet** (2nd-order symplectic integrator) running at a fixed $\Delta t = 1/120\text{ s}$.
* **Justification:** Because gravitational orbits are conservative Hamiltonian systems with zero physical drag, non-symplectic integratorsa lot of energy drift that causes orbits to diverge over time. **Velocity Verlet** preserves phase-space volume and keeps total mechanical energy bounded.

----------------------------------------------------------------

## A3 -- Three-tier scope 

* **Must** A single body orbit with the ability to launch a projectile into the frame. Preferably have the launched object have a fixed starting position and there be a goal with some kind of requirement. Have code that is in a state where it can be deployed to GitHub pages.

* **Should** 
    -More scenes that add to the challenge of getting the ball in the goal. Preferably done by adding a new planet to the simulation but no more than three.

    -Be able to change the scale of the window so the different orbits are viewable. 

    -Ability to speed up the simulation so as to prevent long waiting time

    -A set number of attempts to get to the goal before the simulation resets. 


* **Could** 
    -Location of the plantes orbits be something that can be changed by the user 
    
    -Location of the goal able to be changed by the user
    
    -Sound effects for when you win/ louse

------------------

### A4 -- Validation plan


1. **Conservation of orbital energy and radius**
   * **Setup:** Initialize the planet of ($M_2 = 3.0\text{ kg}$) at $r_0 = 5.5\text{ m}$ around the central star of ($M_1 = 55\text{ kg}$) with analytical circular speed $v_c = \sqrt{G M_1 / r_0} \approx 6.3246\text{ m/s}$ ($G = 4.0$, $\varepsilon = 0.1\text{ m}$), integrated with Velocity Verlet at $\Delta t = 1/120\text{ s}$ for $t = 20.0\text{ s}$ ($2{,}400$ steps).
   * **Quantity & Expected Result:** Total mechanical energy $E_{\text{total}}$ remains constant ($E(t) = E_0$) and orbital radius remains fixed ($r(t) = 5.5\text{ m}$).
   * **Tolerance:** The relative energy drift is $|\Delta E / E_0| < 0.05\%$ and relative radial drift is $|\Delta r / r_0| < 0.5\%$.

2. **Ghost Trajectory Accuracy**
   * **Setup:** From the Tee at $\vec{r}_0 = (-11, -4)\text{ m}$, compute a $300$-step ($2.5\text{ s}$) ghost path using cloned-state Velocity Verlet at $\vec{v}_0 = (6.8, 5.2)\text{ m/s}$, then launch the live probe with identical starting conditions.
   * **Quantity & Expected Results:** Predicted final probe position $\vec{r}_{\text{predicted}}(2.5\text{ s})$ matches the actual simulated probe position $\vec{r}_{\text{actual}}(2.5\text{ s})$.
   * **Tolerance:** Position discrepancy of $|\vec{r}_{\text{actual}} - \vec{r}_{\text{predicted}}| < 10^{-10}\text{ m}$ (machine-precision agreement) with single-preview compute time $< 1.0\text{ ms}$.

3. **Timestep Convergence & Capture Boundary Test**
   * **Setup:** Halve the physics timestep from $\Delta t = 1/120\text{ s}$ to $\Delta t = 1/240\text{ s}$ on a close planetary slingshot trajectory, and verify goal capture at $|\vec{v}_p| \le v_{\text{max}}$ versus $|\vec{v}_p| > v_{\text{max}}$.
   * **Quantity & Expected Result:** Final probe speed upon entering `goalRadius` ($1.01\text{ m}$) converges across timesteps, and `SCORED` triggers only when $|\vec{v}_p| \le v_{\text{max}}$.
   * **Tolerance:** Halving $\Delta t$ changes measured goal-entry speed by $< 0.5\%$.


--------------
## A5 -- Biggest risk + fallback

The thing most likely to sink this project is the ghost line not accurately depicting the path and my fallback is to track the movement of the orbiting body and account for its interaction. 

--------
## A6 --  Week-by-week timeline 

| Week | Deliverable |
| :--- | :--- |
| 11 | Compleat the change needed to acheave the spike prototype for better object tracking |
| 12 | A single body orbit with the ability to launch a projectile into the frame. The launched object having a fixed starting position and a goal with some kind of requirement to win. Have code that is in a state where it can be deployed to GitHub pages. |
|13 | Have more scenes, more planets, changeable scale for the window, changeable simulation speed, and a set number of attempts |


------------
## A7 -- Audience  
This simulation is intended for physics and astronomy freshman in college, once playing for a couple of minutes they will understand the concept of a slingshot orbit.