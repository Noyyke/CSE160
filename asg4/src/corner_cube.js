class cornerCube {
  constructor() {
    this.type = 'circle';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.tint  = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2;
    this.uvScale = 1;

    this.cubeVerts = new Float32Array([
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

    this.cubeUVs = new Float32Array([
      0,0, 1,1, 1,0,  0,0, 0,1, 1,1,
      0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
      0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
      0,0, 1,1, 1,0,  0,0, 0,1, 1,1,
      0,0, 0,1, 1,1,  0,0, 1,1, 1,0,
      0,0, 1,1, 0,1,  0,0, 1,0, 1,1,
    ]);

    this.cubeShades = new Float32Array([
      0.95,0.95,0.95, 0.95,0.95,0.95,
      0.85,0.85,0.85, 0.85,0.85,0.85,
      1.0, 1.0, 1.0,  1.0, 1.0, 1.0,
      0.7, 0.7, 0.7,  0.7, 0.7, 0.7,
      0.8, 0.8, 0.8,  0.8, 0.8, 0.8,
      0.9, 0.9, 0.9,  0.9, 0.9, 0.9,
    ]);

    // pre-allocate GPU buffers ONCE
    this._vertBuf  = null;
    this._uvBuf    = null;
    this._shadeBuf = null;
    this._lastUVScale = null;
    this._scaledUVs = null;
  }

  _initBuffers() {
    if (this._vertBuf) return; // already done

    this._vertBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.cubeVerts, gl.STATIC_DRAW);

    this._shadeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._shadeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.cubeShades, gl.STATIC_DRAW);

    this._uvBuf = gl.createBuffer();
    // UV uploaded below based on scale
  }

  render() {
    setDefaultShade();
    var rgba = this.color;
    var u = this.uvScale;

    gl.uniform4f(u_TintColor, this.tint[0], this.tint[1], this.tint[2], this.tint[3]);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    var faceShades = [0.95, 0.85, 1.0, 0.7, 0.8, 0.9];
    for (var f = 0; f < 6; f++) {
      var s = faceShades[f];
      gl.uniform4f(u_FragColor, rgba[0]*s, rgba[1]*s, rgba[2]*s, rgba[3]);
      drawTriangle3DUV(
        Array.from(this.cubeVerts.subarray(f*18, f*18+18)),
        Array.from(this.cubeUVs.subarray(f*12, f*12+12).map(v => v*u))
      );
    }
  }

  renderFaster() {
    this._initBuffers();

    var rgba = this.color;
    var u = this.uvScale;

    gl.uniform4f(u_TintColor, this.tint[0], this.tint[1], this.tint[2], this.tint[3]);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // only re-upload UVs if scale changed
    if (u !== this._lastUVScale) {
      this._lastUVScale = u;
      this._scaledUVs = u === 1 ? this.cubeUVs : new Float32Array(this.cubeUVs.map(v => v * u));
      gl.bindBuffer(gl.ARRAY_BUFFER, this._uvBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this._scaledUVs, gl.STATIC_DRAW);
    }

    // verts
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertBuf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // UVs
    gl.bindBuffer(gl.ARRAY_BUFFER, this._uvBuf);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    // shades
    gl.bindBuffer(gl.ARRAY_BUFFER, this._shadeBuf);
    gl.vertexAttribPointer(a_Shade, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Shade);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}