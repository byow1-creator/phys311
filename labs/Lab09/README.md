# Lab 09: Multi-Body Browser Physics Engine

In my html file I am simulating the physics of 3 different 2D systems: first is the “ball pit,” a simulation of 40 elastic objects that are interacting; next I have a simulation of an orbit, there are three objects of close mass with a decaying orbit about a slightly heaver object; lastly there is a system of 5 balls connect by springs in gravity. 
# Controls
To go between these scenes there is a dropdown selection at the top left of the purple box. It is labeled Simulation Scene, and has the options listed above in that order. 
You can also choice to run the simulations with the two different integrators, this is only important for the orbit simulation. The dropdown contains Euler Cromer and Velocity Verlet it is located in the upper center of the purple box. Velocity Verlet allows for the three orbits to be maintained for some time, while Euler Cromer gives room for error to build. 
There is a gray button next to the drop down selection that resets the simulation, the blue button is there to start the simulation. 
The last button is the bright green Run performance test, once pressed it will start to run five different simulations that have different numbers of objects, appending the relevant data into a file that then downloads to your computer.
# EXTRA 
I was able to run the simulation all the way up to 100 bodies bofre my FPS started to drop. To streamline this I would try to either set a limit to how many balls can be summoned, or decrese the number of steps taken per frame to lower the cost of each. 
# example of the data what will download when runnin the prefromance Test

| Bodies | Avg Physics ms | Avg Render ms | Avg FPS |
|--------|----------------|---------------|---------|
| 10     | 0.015          | 0.066         | 60.0    |
| 20     | 0.033          | 0.092         | 60.0    |
| 50     | 0.058          | 0.126         | 60.0    |
| 100    | 0.141          | 0.143         | 60.0    |
| 200    | 0.329          | 0.198         | 58.8    |

my live link is 
https://byow1-creator.github.io/phys311/labs/Lab09/