// cube.js
// Two cube classes sharing static GPU geometry buffers.
// Both support per-vertex face shading via the a_Shade attribute.

// ─── Shared static buffers (created once on first use) ───────────────────────

// Cube  (origin at center-bottom, spans -0.5..0.5 x, 0..1 y, -0.5..0.5 z)
let _cubeVB   = null;  // vertex buffer
let _cubeUVB  = null;  // UV buffer
let _cubeSHB  = null;  // shade buffer

// cornerCube (origin at corner, spans 0..1 x, 0..1 y, 0..1 z)
let _ccVB  = null;
let _ccUVB = null;
let _ccSHB = null;

// Shade values per vertex (6 faces × 6 verts = 36), same for both geometries
// since shading is face-based:  front .95 | back .85 | top 1.0 | bot .7 | left .8 | right .9
const _SHADE_DATA = new Float32Array([
  .95,.95,.95, .95,.95,.95,   // front  (2 tris × 3 verts)
  .85,.85,.85, .85,.85,.85,   // back
  1.0,1.0,1.0, 1.0,1.0,1.0,  // top
  .70,.70,.70, .70,.70,.70,   // bottom
  .80,.80,.80, .80,.80,.80,   // left
  .90,.90,.90, .90,.90,.90,   // right
]);

function _initCubeBuffers(verts, uvs) {
  if (_cubeVB) return;
  _cubeVB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, _cubeVB);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

  _cubeUVB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, _cubeUVB);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

  _cubeSHB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, _cubeSHB);
  gl.bufferData(gl.ARRAY_BUFFER, _SHADE_DATA, gl.STATIC_DRAW);
}

function _initCornerCubeBuffers(verts, uvs) {
  if (_ccVB) return;
  _ccVB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, _ccVB);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

  _ccUVB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, _ccUVB);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

  _ccSHB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, _ccSHB);
  gl.bufferData(gl.ARRAY_BUFFER, _SHADE_DATA, gl.STATIC_DRAW);
}

// Helper: bind the three attrib buffers and draw
function _drawCubeBuffers(vb, uvb, shb, uvScale) {
  // Position
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // UV

  gl.bindBuffer(gl.ARRAY_BUFFER, uvb);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  // Shade
  gl.bindBuffer(gl.ARRAY_BUFFER, shb);
  gl.vertexAttribPointer(a_Shade, 1, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Shade);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}


// ─── Cube ──────
// Origin at bottom-center

class Cube {
  constructor() {
    this.type       = 'cube';
    this.color      = [1.0, 1.0, 1.0, 1.0];
    this.tint       = [1.0, 1.0, 1.0, 1.0];
    this.matrix     = new Matrix4();
    this.textureNum = -2;
    this.uvScale    = 1;

    // Geometry 
    if (!Cube._verts) {
      Cube._verts = new Float32Array([
        // front (z=-0.5)
        -0.5,0.0,-0.5,  0.5,1.0,-0.5,  0.5,0.0,-0.5,
        -0.5,0.0,-0.5, -0.5,1.0,-0.5,  0.5,1.0,-0.5,
        // back (z=0.5)
        -0.5,0.0, 0.5,  0.5,0.0, 0.5,  0.5,1.0, 0.5,
        -0.5,0.0, 0.5,  0.5,1.0, 0.5, -0.5,1.0, 0.5,
        // top (y=1)
        -0.5,1.0,-0.5,  0.5,1.0,-0.5,  0.5,1.0, 0.5,
        -0.5,1.0,-0.5,  0.5,1.0, 0.5, -0.5,1.0, 0.5,
        // bottom (y=0)
        -0.5,0.0, 0.5,  0.5,0.0, 0.5,  0.5,0.0,-0.5,
        -0.5,0.0, 0.5,  0.5,0.0,-0.5, -0.5,0.0,-0.5,
        // left (x=-0.5)
        -0.5,0.0,-0.5, -0.5,1.0,-0.5, -0.5,1.0, 0.5,
        -0.5,0.0,-0.5, -0.5,1.0, 0.5, -0.5,0.0, 0.5,
        // right (x=0.5)
         0.5,0.0,-0.5,  0.5,1.0, 0.5,  0.5,1.0,-0.5,
         0.5,0.0,-0.5,  0.5,0.0, 0.5,  0.5,1.0, 0.5,
      ]);
      Cube._uvs = new Float32Array([
        0,0, 1,1, 1,0,  0,0, 0,1, 1,1,
        0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
        0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
        0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
        0,0, 0,1, 1,1,  0,0, 1,1, 1,0,
        0,0, 1,1, 0,1,  0,0, 1,0, 1,1,
      ]);
    }

    // UV scale cache
    this._lastUVScale  = null;
    this._scaledUVBuf  = null; // used when uvScale != 1
  }

  // one draw call per face
  render() {
    var rgba = this.color;
    var u    = this.uvScale;

    gl.uniform4f(u_TintColor, this.tint[0], this.tint[1], this.tint[2], this.tint[3]);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    var shades = [0.95, 0.85, 1.0, 0.7, 0.8, 0.9];
    var v = Cube._verts;
    var uv = Cube._uvs;
    for (var f = 0; f < 6; f++) {
      var s = shades[f];
      gl.uniform4f(u_FragColor, rgba[0]*s, rgba[1]*s, rgba[2]*s, rgba[3]);
      drawTriangle3DUV(
        Array.from(v.subarray(f*18, f*18+18)),
        Array.from(uv.subarray(f*12, f*12+12).map(v => v*u))
      );
    }
  }

  // single draw call 
  renderFaster() {
    _initCubeBuffers(Cube._verts, Cube._uvs);

    gl.uniform4f(u_TintColor, this.tint[0], this.tint[1], this.tint[2], this.tint[3]);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

    var uvb = _cubeUVB;
    var u   = this.uvScale;
    if (u !== 1) {
      
      if (u !== this._lastUVScale) {
        this._lastUVScale = u;
        var scaled = new Float32Array(Cube._uvs.map(v => v * u));
        if (!this._scaledUVBuf) this._scaledUVBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._scaledUVBuf);
        gl.bufferData(gl.ARRAY_BUFFER, scaled, gl.STATIC_DRAW);
      }
      uvb = this._scaledUVBuf;
    }

    _drawCubeBuffers(_cubeVB, uvb, _cubeSHB);
  }
}


// ─── cornerCube ──────
// Origin at corner; spans x:0..1  y:0..1  z:0..1

class cornerCube {
  constructor() {
    this.type       = 'circle';
    this.color      = [1.0, 1.0, 1.0, 1.0];
    this.tint       = [1.0, 1.0, 1.0, 1.0];
    this.matrix     = new Matrix4();
    this.textureNum = -2;
    this.uvScale    = 1;

    if (!cornerCube._verts) {
      cornerCube._verts = new Float32Array([
        // front (z=0)
        0,0,0, 1,1,0, 1,0,0,
        0,0,0, 0,1,0, 1,1,0,
        // back (z=1)
        0,0,1, 1,0,1, 1,1,1,
        0,0,1, 1,1,1, 0,1,1,
        // top (y=1)
        0,1,0, 1,1,0, 1,1,1,
        0,1,0, 1,1,1, 0,1,1,
        // bottom (y=0)
        0,0,0, 1,0,1, 1,0,0,
        0,0,0, 0,0,1, 1,0,1,
        // left (x=0)
        0,0,0, 0,1,0, 0,1,1,
        0,0,0, 0,1,1, 0,0,1,
        // right (x=1)
        1,0,0, 1,1,1, 1,1,0,
        1,0,0, 1,0,1, 1,1,1,
      ]);
      cornerCube._uvs = new Float32Array([
        0,0, 1,1, 1,0,  0,0, 0,1, 1,1,
        0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
        0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
        0,0, 1,1, 1,0,  0,0, 0,1, 1,1,
        0,0, 0,1, 1,1,  0,0, 1,1, 1,0,
        0,0, 1,1, 0,1,  0,0, 1,0, 1,1,
      ]);
    }

    this._lastUVScale = null;
    this._scaledUVBuf = null;
  }

  render() {
    var rgba = this.color;
    var u    = this.uvScale;
    var v    = cornerCube._verts;
    var uvs  = cornerCube._uvs;

    gl.uniform4f(u_TintColor, this.tint[0], this.tint[1], this.tint[2], this.tint[3]);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    var shades = [0.95, 0.85, 1.0, 0.7, 0.8, 0.9];
    for (var f = 0; f < 6; f++) {
      var s = shades[f];
      gl.uniform4f(u_FragColor, rgba[0]*s, rgba[1]*s, rgba[2]*s, rgba[3]);
      drawTriangle3DUV(
        Array.from(v.subarray(f*18, f*18+18)),
        Array.from(uvs.subarray(f*12, f*12+12).map(x => x*u))
      );
    }
  }

  renderFaster() {
    _initCornerCubeBuffers(cornerCube._verts, cornerCube._uvs);

    gl.uniform4f(u_TintColor, this.tint[0], this.tint[1], this.tint[2], this.tint[3]);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

    var uvb = _ccUVB;
    var u   = this.uvScale;
    if (u !== 1) {
      if (u !== this._lastUVScale) {
        this._lastUVScale = u;
        var scaled = new Float32Array(cornerCube._uvs.map(v => v * u));
        if (!this._scaledUVBuf) this._scaledUVBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._scaledUVBuf);
        gl.bufferData(gl.ARRAY_BUFFER, scaled, gl.STATIC_DRAW);
      }
      uvb = this._scaledUVBuf;
    }

    _drawCubeBuffers(_ccVB, uvb, _ccSHB);
  }
}