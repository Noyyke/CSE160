class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.tint  = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2;
    this.uvScale = 1;

    this.cubeVerts = new Float32Array([
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

    this.cubeUVs = new Float32Array([
      // front
      0,0, 1,1, 1,0,
      0,0, 0,1, 1,1,
      // back
      0,0, 1,0, 1,1,
      0,0, 1,1, 0,1,
      // top
      0,0, 1,0, 1,1,
      0,0, 1,1, 0,1,
      // bottom
      0,0, 1,0, 1,1,
      0,0, 1,1, 0,1,
      // left
      0,0, 0,1, 1,1,
      0,0, 1,1, 1,0,
      // right
      0,0, 1,1, 0,1,
      0,0, 1,0, 1,1,
    ]);
  }

  render() {
    var rgba = this.color;
    var u = this.uvScale;

    gl.uniform4f(u_TintColor, this.tint[0], this.tint[1], this.tint[2], this.tint[3]);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // front
    gl.uniform4f(u_FragColor, rgba[0]*.95, rgba[1]*.95, rgba[2]*.95, rgba[3]);
    drawTriangle3DUV([-0.5,0.0,-0.5,  0.5,1.0,-0.5,  0.5,0.0,-0.5], [0,0, u,u, u,0]);
    drawTriangle3DUV([-0.5,0.0,-0.5, -0.5,1.0,-0.5,  0.5,1.0,-0.5], [0,0, 0,u, u,u]);

    // back
    gl.uniform4f(u_FragColor, rgba[0]*.85, rgba[1]*.85, rgba[2]*.85, rgba[3]);
    drawTriangle3DUV([-0.5,0.0, 0.5,  0.5,0.0, 0.5,  0.5,1.0, 0.5], [0,0, u,0, u,u]);
    drawTriangle3DUV([-0.5,0.0, 0.5,  0.5,1.0, 0.5, -0.5,1.0, 0.5], [0,0, u,u, 0,u]);

    // top
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    drawTriangle3DUV([-0.5,1.0,-0.5,  0.5,1.0,-0.5,  0.5,1.0, 0.5], [0,0, u,0, u,u]);
    drawTriangle3DUV([-0.5,1.0,-0.5,  0.5,1.0, 0.5, -0.5,1.0, 0.5], [0,0, u,u, 0,u]);

    // bottom
    gl.uniform4f(u_FragColor, rgba[0]*.7, rgba[1]*.7, rgba[2]*.7, rgba[3]);
    drawTriangle3DUV([-0.5,0.0, 0.5,  0.5,0.0, 0.5,  0.5,0.0,-0.5], [0,0, u,0, u,u]);
    drawTriangle3DUV([-0.5,0.0, 0.5,  0.5,0.0,-0.5, -0.5,0.0,-0.5], [0,0, u,u, 0,u]);

    // left
    gl.uniform4f(u_FragColor, rgba[0]*.8, rgba[1]*.8, rgba[2]*.8, rgba[3]);
    drawTriangle3DUV([-0.5,0.0,-0.5, -0.5,1.0,-0.5, -0.5,1.0, 0.5], [0,0, 0,u, u,u]);
    drawTriangle3DUV([-0.5,0.0,-0.5, -0.5,1.0, 0.5, -0.5,0.0, 0.5], [0,0, u,u, u,0]);

    // right
    gl.uniform4f(u_FragColor, rgba[0]*.9, rgba[1]*.9, rgba[2]*.9, rgba[3]);
    drawTriangle3DUV([ 0.5,0.0,-0.5,  0.5,1.0, 0.5,  0.5,1.0,-0.5], [0,0, u,u, 0,u]);
    drawTriangle3DUV([ 0.5,0.0,-0.5,  0.5,0.0, 0.5,  0.5,1.0, 0.5], [0,0, u,0, u,u]);
  }

  renderFaster() {
    enableShade();

    var rgba = this.color;
    var u = this.uvScale;

    gl.uniform4f(u_TintColor, this.tint[0], this.tint[1], this.tint[2], this.tint[3]);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    var uvData = this.cubeUVs;
    if (u !== 1) {
      uvData = new Float32Array(this.cubeUVs.map(v => v * u));
    }

    var vertBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.cubeVerts, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    var uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvData, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}