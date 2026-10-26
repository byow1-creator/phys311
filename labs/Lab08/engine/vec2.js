export class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    clone() { return new Vec2(this.x, this.y); }
    add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
    mul(s) { return new Vec2(this.x * s, this.y * s); }
    dot(v) { return this.x * v.x + this.y * v.y; }
    lengthSq() { return this.x * this.x + this.y * this.y; }
    length() { return Math.sqrt(this.lengthSq()); }
    normalized() {
        const len = this.length();
        return len === 0 ? new Vec2(0, 0) : new Vec2(this.x / len, this.y / len);
    }
    addTo(v) { this.x += v.x; this.y += v.y; return this; }
    addScaled(v, s) { this.x += v.x * s; this.y += v.y * s; return this; }
}
