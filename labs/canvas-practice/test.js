// main.js
const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");   // your drawing handle


class Camera {
  constructor(canvas, scale = 50, originX = 0, originY = 0) {
    this.canvas = canvas;
    this.scale = scale;        // pixels per physics unit (e.g. per meter)
    this.originX = originX;    // physics coord shown at bottom-left
    this.originY = originY;
  }
  toScreen(v) {
    return {
      x: (v.x - this.originX) * this.scale,
      y: this.canvas.height - (v.y - this.originY) * this.scale
    };
  }
  toWorld(px, py) {   // for mouse input in Week 10
    return new Vec2(
      px / this.scale + this.originX,
      (this.canvas.height - py) / this.scale + this.originY
    );
  }
}

canvas.height = 600; 
const camera = new Camera(canvas, 50, 0, 0);

// 3. Let's test a physics object at the ground (y = 0) 
// and 4 meters over (x = 4) with a radius of 0.5 meters
let ballPhys = { x: 40, y: 15 }; 
let radiusPhys = 0.5;

// Convert physics units to screen pixels
let ballScreen = camera.toScreen(ballPhys);
let radiusScreen = radiusPhys * camera.scale;

// 4. Draw it using the converted pixel values
ctx.fillStyle = "#ff8200";
ctx.beginPath();
ctx.arc(ballScreen.x, ballScreen.y, radiusScreen, 0, 2 * Math.PI);  
ctx.fill();

// Quick Console verification log
console.log(`Physics ground y=0 maps to screen pixel row: ${ballScreen.y}`);





