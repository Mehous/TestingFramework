class Point2D {
    constructor(x, y, t) {
        this.x = x;
        this.y = y;
        this.t = t;
    }
}

class Point3D {
    constructor(x, y, z, t) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.t = t;
    }
}

module.exports = {
    Point2D,
    Point3D
};