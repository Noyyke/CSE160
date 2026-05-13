class Camera {
    constructor() {
      this.eye = new Vector3([0, 1, 3]);
      this.at  = new Vector3([0, 1, 0]);
      this.up  = new Vector3([0, 1, 0]);
      this.speed    = 0.1;
      this.panSpeed = 5;
    }

    
  
    moveForward(speed = this.speed) {
      var d = this.at.sub(this.eye);
      // flatten to XZ only — ignore Y component
      d.elements[1] = 0;
      d = d.normalized();
      var newEye = this.eye.add(d.mul(speed));
      if (!isBlocked(newEye.elements[0], this.eye.elements[1], newEye.elements[2])) {
        this.eye = newEye;
        this.at  = this.at.add(d.mul(speed));
      }
    }
    
    moveBackward(speed = this.speed) {
      var d = this.at.sub(this.eye);
      d.elements[1] = 0;
      d = d.normalized();
      var newEye = this.eye.sub(d.mul(speed));
      if (!isBlocked(newEye.elements[0], this.eye.elements[1], newEye.elements[2])) {
        this.eye = newEye;
        this.at  = this.at.sub(d.mul(speed));
      }
    }
    
    moveLeft(speed = this.speed) {
      var d = this.at.sub(this.eye);
      d.elements[1] = 0;
      d = d.normalized();
      var left = d.cross(this.up).normalized();
      var newEye = this.eye.sub(left.mul(speed));
      if (!isBlocked(newEye.elements[0], this.eye.elements[1], newEye.elements[2])) {
        this.eye = newEye;
        this.at  = this.at.sub(left.mul(speed));
      }
    }
    
    moveRight(speed = this.speed) {
      var d = this.at.sub(this.eye);
      d.elements[1] = 0;
      d = d.normalized();
      var right = d.cross(this.up).normalized();
      var newEye = this.eye.add(right.mul(speed));
      if (!isBlocked(newEye.elements[0], this.eye.elements[1], newEye.elements[2])) {
        this.eye = newEye;
        this.at  = this.at.add(right.mul(speed));
      }
    }
    
    moveUp(speed = this.speed) {
      var newEye = this.eye.add(new Vector3([0, 1, 0]).mul(speed));
      if (!isBlocked(newEye.elements[0], newEye.elements[1], newEye.elements[2])) {
        this.at  = this.at.add(new Vector3([0, 1, 0]).mul(speed));
        this.eye = newEye;
      }
    }
    
    moveDown(speed = this.speed) {
      var newEye = this.eye.sub(new Vector3([0, 1, 0]).mul(speed));
      if (isOnFloor(newEye.elements[1])) return;
      if (!isBlocked(newEye.elements[0], newEye.elements[1], newEye.elements[2])) {
        this.at  = this.at.sub(new Vector3([0, 1, 0]).mul(speed));
        this.eye = newEye;
      }
    }
  
    panLeft(angle) {
      var d   = this.at.sub(this.eye);
      var rot = new Matrix4().setRotate(angle, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
      this.at = this.eye.add(rot.multiplyVector3(d));
    }
    
    panRight(angle) {
      this.panLeft(-angle);
    }
    
    panUp(angle) {
      var d       = this.at.sub(this.eye).normalized();
      var right   = d.cross(this.up).normalized();
    
      // get current pitch angle (-90 to 90)
      var currentPitch = Math.asin(d.elements[1]); // in radians
      var maxPitch     = 0.99 * (Math.PI / 2);     // just under 90 degrees
    
      // clamp the incoming angle so we never exceed the limit
      var newPitch = currentPitch + (angle * Math.PI / 180);
      if (newPitch > maxPitch)  angle = (maxPitch - currentPitch) * (180 / Math.PI);
      if (newPitch < -maxPitch) angle = (-maxPitch - currentPitch) * (180 / Math.PI);
    
      var rot = new Matrix4().setRotate(angle, right.elements[0], right.elements[1], right.elements[2]);
      this.at = this.eye.add(rot.multiplyVector3(this.at.sub(this.eye)));
    }
    
    panDown(angle) {
      this.panUp(-angle);
    }
  }





  /* OLD MOVEMENT
     moveForward(speed = this.speed) {
      var d      = this.at.sub(this.eye).normalized();
      var newEye = this.eye.add(d.mul(speed));
      if (!isBlocked(newEye.elements[0], newEye.elements[1], newEye.elements[2])) {
        this.eye = newEye;
        this.at  = this.at.add(d.mul(speed));
      }
    }
    
    moveBackward(speed = this.speed) {
      var d      = this.at.sub(this.eye).normalized();
      var newEye = this.eye.sub(d.mul(speed));
      if (!isBlocked(newEye.elements[0], newEye.elements[1], newEye.elements[2])) {
        this.eye = newEye;
        this.at  = this.at.sub(d.mul(speed));
      }
    }
    
    moveLeft(speed = this.speed) {
      var d      = this.at.sub(this.eye).normalized();
      var left   = d.cross(this.up).normalized();
      var newEye = this.eye.sub(left.mul(speed));
      if (!isBlocked(newEye.elements[0], newEye.elements[1], newEye.elements[2])) {
        this.eye = newEye;
        this.at  = this.at.sub(left.mul(speed));
      }
    }
    
    moveRight(speed = this.speed) {
      var d      = this.at.sub(this.eye).normalized();
      var right  = d.cross(this.up).normalized();
      var newEye = this.eye.add(right.mul(speed));
      if (!isBlocked(newEye.elements[0], newEye.elements[1], newEye.elements[2])) {
        this.eye = newEye;
        this.at  = this.at.add(right.mul(speed));
      }
    }
    
    moveUp(speed = this.speed) {
      var newEye = this.eye.add(new Vector3([0, 1, 0]).mul(speed));
      if (!isBlocked(newEye.elements[0], newEye.elements[1], newEye.elements[2])) {
        this.at  = this.at.add(new Vector3([0, 1, 0]).mul(speed));
        this.eye = newEye;
      }
    }
    
    moveDown(speed = this.speed) {
      var newEye = this.eye.sub(new Vector3([0, 1, 0]).mul(speed));
      if (!isBlocked(newEye.elements[0], newEye.elements[1], newEye.elements[2])) {
        this.at  = this.at.sub(new Vector3([0, 1, 0]).mul(speed));
        this.eye = newEye;
      }
    }
      */