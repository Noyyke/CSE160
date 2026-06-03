// look.js — first-person mouse look via raw Pointer Lock API
// Replaces PointerLockControls entirely.
// Clamps per-frame delta to prevent the Chrome spurious-huge-movement bug.
import * as THREE from 'three';

const MAX_DELTA = 100; // px — ignore any movement larger than this per event
const PI_2      = Math.PI / 2;
const _euler    = new THREE.Euler(0, 0, 0, 'YXZ');

export class Look {
  /** @param {THREE.Camera} camera  @param {HTMLElement} domElement */
  constructor(camera, domElement, sensitivity = 0.002) {
    this.camera      = camera;
    this.domElement  = domElement;
    this.sensitivity = sensitivity;
    this.isLocked    = false;

    this._onMove   = this._onMove.bind(this);
    this._onChange = this._onChange.bind(this);
    this._onError  = this._onError.bind(this);

    document.addEventListener('pointerlockchange', this._onChange);
    document.addEventListener('pointerlockerror',  this._onError);
  }

  lock()   { this.domElement.requestPointerLock(); }
  unlock() { document.exitPointerLock(); }

  _onChange() {
    if (document.pointerLockElement === this.domElement) {
      this.isLocked = true;
      document.addEventListener('mousemove', this._onMove);
      this.domElement.dispatchEvent(new Event('lock'));
    } else {
      this.isLocked = false;
      document.removeEventListener('mousemove', this._onMove);
      this.domElement.dispatchEvent(new Event('unlock'));
    }
  }

  _onError() { console.warn('Look: pointer lock error'); }

  _onMove(e) {
    // Clamp to ignore spurious huge values (Chrome/Firefox pointer lock bug)
    const dx = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, e.movementX));
    const dy = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, e.movementY));

    _euler.setFromQuaternion(this.camera.quaternion);
    _euler.y -= dx * this.sensitivity;
    _euler.x -= dy * this.sensitivity;
    _euler.x  = Math.max(-PI_2, Math.min(PI_2, _euler.x));
    this.camera.quaternion.setFromEuler(_euler);
  }

  dispose() {
    document.removeEventListener('pointerlockchange', this._onChange);
    document.removeEventListener('pointerlockerror',  this._onError);
    document.removeEventListener('mousemove', this._onMove);
  }
}