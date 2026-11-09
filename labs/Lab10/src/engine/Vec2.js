// src/engine/Vec2.js

export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
    
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  clone()        { return new Vec2(this.x, this.y); }
  copy(v)        { this.x = v.x; this.y = v.y; return this; }
  add(v)         { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v)         { return new Vec2(this.x - v.x, this.y - v.y); }
  mul(s)         { return new Vec2(this.x * s, this.y * s); }

  addTo(v)       { this.x += v.x; this.y += v.y; return this; }
  mulTo(s)       { this.x *= s;   this.y *= s;   return this; }

  dot(v)         { return this.x * v.x + this.y * v.y; }
  
  // Reference solution naming style
  len()          { return Math.hypot(this.x, this.y); }
  len2()         { return this.x * this.x + this.y * this.y; }

  // Old project naming style aliases (prevents breaking changes elsewhere)
  length()       { return this.len(); }
  lengthSq()     { return this.len2(); }

  normalized() {
    const L = this.len();
    return L > 1e-12 ? new Vec2(this.x / L, this.y / L) : new Vec2(0, 0);
  }

  static zero()  { return new Vec2(0, 0); }
}
