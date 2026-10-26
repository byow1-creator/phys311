"use strict";

const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");

const SCALE = 50;      // px per meter
const g = 9.81;
const e = 0.99;        // restitution — from Week 4!    must be less than 1 or it gains height with evey hit.
const DT = 1 / 120;

let pos = { x: 2, y: 8 };   // meters
let vel = { x: 3, y: 0 };   // m/s
const R = 0.3;                // meters

function step(dt) {
  vel.y -= g * dt;          // velocity first...
  pos.x += vel.x * dt;      // ...then position = Euler-Cromer
  pos.y += vel.y * dt;

  if (pos.y - R < 0) {     // floor
    pos.y = R;
    vel.y = -vel.y * e;
  }
  const W = canvas.width / SCALE;
  if (pos.x - R < 0)  { pos.x = R;     vel.x = -vel.x * e; }
  if (pos.x + R > W)  { pos.x = W - R; vel.x = -vel.x * e; }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const px = pos.x * SCALE;
  const py = canvas.height - pos.y * SCALE;   // FLIP

  ctx.fillStyle = "#ff8200";
  ctx.beginPath();
  ctx.arc(px, py, R * SCALE, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#2d3b45";
  ctx.font = "14px monospace";
  ctx.fillText(`y = ${pos.y.toFixed(2)} m`, 10, 20);
}

let last = 0, acc = 0;
function loop(ts) {
  if (!last) last = ts;
  acc += Math.min((ts - last) / 1000, 0.25);
  last = ts;
  while (acc >= DT) { step(DT); acc -= DT; }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);