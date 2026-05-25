// pyramid.js — simple square-base pyramid, shares the same shader attributes as Cube

class Pyramid {
  constructor() {
    this.type       = 'pyramid';
    this.color      = [1.0, 1.0, 1.0, 1.0];
    this.tint       = [1.0, 1.0, 1.0, 1.0];
    this.matrix     = new Matrix4();
    this.textureNum = -2;

    // Build once; reuse across instances
    if (!Pyramid._verts) {
      // Apex at (0,1,0), base corners at y=0
      var apex = [0,1,0];
      var bl   = [0,0,0];
      var br   = [1,0,0];
      var fl   = [0,0,1];
      var fr   = [1,0,1];

      // Helper: flat normal for a triangle
      function norm(a,b,c) {
        var u = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
        var v = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
        return [
          u[1]*v[2] - u[2]*v[1],
          u[2]*v[0] - u[0]*v[2],
          u[0]*v[1] - u[1]*v[0]
        ];
      }

      // 4 side triangles + 2 base triangles = 6 triangles, 18 verts
      var vArr = [], nArr = [], uvArr = [], shArr = [];
      function tri(a,b,c, shade) {
        var n = norm(a,b,c);
        var len = Math.sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2]) || 1;
        n = [n[0]/len, n[1]/len, n[2]/len];
        for (var k=0; k<3; k++) { nArr.push(n[0], n[1], n[2]); }
        vArr.push(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2]);
        uvArr.push(0,0, 1,0, 0.5,1);
        shArr.push(shade, shade, shade);
      }
      // sides
      tri(apex, bl, br, 0.85);   // front
      tri(apex, br, fr, 0.80);   // right
      tri(apex, fr, fl, 0.90);   // back
      tri(apex, fl, bl, 0.75);   // left
      // base
      tri(bl, fr, br, 0.70);
      tri(bl, fl, fr, 0.70);

      Pyramid._verts  = new Float32Array(vArr);
      Pyramid._normals= new Float32Array(nArr);
      Pyramid._uvs    = new Float32Array(uvArr);
      Pyramid._shades = new Float32Array(shArr);
      Pyramid._count  = vArr.length / 3;
    }
  }

  render() { this._draw(); }
  renderFaster() { this._draw(); }

  _draw() {
    gl.uniform4f(u_TintColor, this.tint[0], this.tint[1], this.tint[2], this.tint[3]);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Positions
    var vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, Pyramid._verts, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // UVs
    var uvb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvb);
    gl.bufferData(gl.ARRAY_BUFFER, Pyramid._uvs, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    // Normals
    if (a_Normal >= 0) {
      var nb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, nb);
      gl.bufferData(gl.ARRAY_BUFFER, Pyramid._normals, gl.STATIC_DRAW);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Normal);
    }

    // Shade
    var sb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sb);
    gl.bufferData(gl.ARRAY_BUFFER, Pyramid._shades, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Shade, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Shade);

    gl.drawArrays(gl.TRIANGLES, 0, Pyramid._count);
  }
}