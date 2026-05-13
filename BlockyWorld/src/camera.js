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
  
    panLeft(degrees) {
      var forward = this.at.sub(this.eye).normalized();
      var rotMat = new Matrix4();
      rotMat.setRotate(degrees, 0, 1, 0);  // always world Y
    
      var newForward = rotMat.multiplyVector3(forward);
      this.at.elements[0] = this.eye.elements[0] + newForward.elements[0];
      this.at.elements[1] = this.eye.elements[1] + newForward.elements[1];
      this.at.elements[2] = this.eye.elements[2] + newForward.elements[2];
    }
    
    panRight(angle) {
      this.panLeft(-angle);
    }
    
    panUp(degrees) {
      // Get current pitch angle
      var forward = this.at.sub(this.eye).normalized();
      var currentPitch = Math.asin(forward.elements[1]) * 180 / Math.PI;
    
      // Clamp: don't apply rotation if it would push past ±89°
      var newPitch = currentPitch + degrees;
      if (newPitch > 89.0 || newPitch < -89.0) return;
    
      // Rotate around the camera's local right axis (not world Y)
      var right = forward.cross(this.up).normalized();
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