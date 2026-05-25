class Camera {
  constructor() {
    this.eye      = new Vector3([0, 1, 3]);
    this.at       = new Vector3([0, 1, 0]);
    this.up       = new Vector3([0, 1, 0]);
    this.speed    = 0.1;
    this.panSpeed = 5;
  }

  moveForward(speed = this.speed) {
    var d = this.at.sub(this.eye);
    d.elements[1] = 0;
    d = d.normalized();
    this.eye = this.eye.add(d.mul(speed));
    this.at  = this.at.add(d.mul(speed));
  }

  moveBackward(speed = this.speed) {
    var d = this.at.sub(this.eye);
    d.elements[1] = 0;
    d = d.normalized();
    this.eye = this.eye.sub(d.mul(speed));
    this.at  = this.at.sub(d.mul(speed));
  }

  moveLeft(speed = this.speed) {
    var d    = this.at.sub(this.eye);
    d.elements[1] = 0;
    d = d.normalized();
    var left = d.cross(this.up).normalized();
    this.eye = this.eye.sub(left.mul(speed));
    this.at  = this.at.sub(left.mul(speed));
  }

  moveRight(speed = this.speed) {
    var d     = this.at.sub(this.eye);
    d.elements[1] = 0;
    d = d.normalized();
    var right = d.cross(this.up).normalized();
    this.eye = this.eye.add(right.mul(speed));
    this.at  = this.at.add(right.mul(speed));
  }

  moveUp(speed = this.speed) {
    var delta = new Vector3([0, 1, 0]).mul(speed);
    this.eye = this.eye.add(delta);
    this.at  = this.at.add(delta);
  }

  moveDown(speed = this.speed) {
    var delta = new Vector3([0, 1, 0]).mul(speed);
    this.eye = this.eye.sub(delta);
    this.at  = this.at.sub(delta);
  }

  panLeft(degrees) {
    var forward = this.at.sub(this.eye).normalized();
    var rotMat  = new Matrix4();
    rotMat.setRotate(degrees, 0, 1, 0);
    var newForward = rotMat.multiplyVector3(forward);
    this.at.elements[0] = this.eye.elements[0] + newForward.elements[0];
    this.at.elements[1] = this.eye.elements[1] + newForward.elements[1];
    this.at.elements[2] = this.eye.elements[2] + newForward.elements[2];
  }

  panRight(angle) {
    this.panLeft(-angle);
  }

  panUp(degrees) {
    var forward      = this.at.sub(this.eye).normalized();
    var currentPitch = Math.asin(forward.elements[1]) * 180 / Math.PI;
    if (currentPitch + degrees > 89.0 || currentPitch + degrees < -89.0) return;
    var right  = forward.cross(this.up).normalized();
    var rotMat = new Matrix4();
    rotMat.setRotate(degrees, right.elements[0], right.elements[1], right.elements[2]);
    var newForward = rotMat.multiplyVector3(forward);
    this.at.elements[0] = this.eye.elements[0] + newForward.elements[0];
    this.at.elements[1] = this.eye.elements[1] + newForward.elements[1];
    this.at.elements[2] = this.eye.elements[2] + newForward.elements[2];
  }

  panDown(angle) {
    this.panUp(-angle);
  }
}