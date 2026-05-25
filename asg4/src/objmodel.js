// objmodel.js
// Parses a Wavefront .obj file (fetched as text) and renders it
// using the same shader attributes as Cube/Sphere:
//   a_Position, a_UV, a_Normal, a_Shade
//   u_ModelMatrix, u_FragColor, u_TintColor, u_whichTexture
//
// Usage:
//   var model = new OBJModel();
//   model.load('models/teapot.obj', function() { console.log('ready'); });
//   // then in render loop:
//   model.color = [1,1,1,1];
//   model.textureNum = -2;
//   model.matrix = ...;
//   model.render();

class OBJModel {
    constructor() {
      this.type       = 'obj';
      this.color      = [1.0, 1.0, 1.0, 1.0];
      this.tint       = [1.0, 1.0, 1.0, 1.0];
      this.matrix     = new Matrix4();
      this.textureNum = -2;
  
      this._ready     = false;
      this._vBuf      = null;   // WebGL buffer — positions
      this._nBuf      = null;   // WebGL buffer — normals
      this._uvBuf     = null;   // WebGL buffer — UVs
      this._count     = 0;      // number of vertices to draw
    }
  
    // ── Public API ────────────────────────────────────────────────────────────
  
    /**
     * Fetch and parse an OBJ file.
     * @param {string}   url      Path to the .obj file
     * @param {Function} [onLoad] Optional callback once parsing is done
     */
    load(url, onLoad) {
      var self = this;
      fetch(url)
        .then(function(r) {
          if (!r.ok) throw new Error('OBJ fetch failed: ' + url + ' (' + r.status + ')');
          return r.text();
        })
        .then(function(text) {
          self._parse(text);
          if (onLoad) onLoad(self);
        })
        .catch(function(err) {
          console.error('[OBJModel]', err);
        });
    }
  
    /**
     * Draw the model. Safe to call before load() finishes (no-op until ready).
     */
    render() {
      if (!this._ready) return;
  
      gl.uniform4f(u_FragColor,   this.color[0], this.color[1], this.color[2], this.color[3]);
      gl.uniform4f(u_TintColor,   this.tint[0],  this.tint[1],  this.tint[2],  this.tint[3]);
      gl.uniform1i(u_whichTexture, this.textureNum);
      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
  
      // Shade attribute — constant 1 (no baked face shading; Phong handles it)
      gl.disableVertexAttribArray(a_Shade);
      gl.vertexAttrib1f(a_Shade, 1.0);
  
      // Positions
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vBuf);
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Position);
  
      // UVs
      gl.bindBuffer(gl.ARRAY_BUFFER, this._uvBuf);
      gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_UV);
  
      // Normals
      if (a_Normal >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this._nBuf);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);
      }
  
      gl.drawArrays(gl.TRIANGLES, 0, this._count);
    }
  
    // Alias so the rest of the scene can call renderFaster() uniformly
    renderFaster() { this.render(); }
  
    // ── Internal parser ───────────────────────────────────────────────────────
  
    _parse(text) {
      var posPool  = [];   // [x,y,z, ...]  indexed by (i-1)*3
      var uvPool   = [];   // [u,v, ...]    indexed by (i-1)*2
      var normPool = [];   // [x,y,z, ...]  indexed by (i-1)*3
  
      var outPos  = [];
      var outUV   = [];
      var outNorm = [];
  
      var lines = text.split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.length === 0 || line[0] === '#') continue;
  
        var parts = line.split(/\s+/);
        var tag   = parts[0];
  
        if (tag === 'v') {
          posPool.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
  
        } else if (tag === 'vt') {
          uvPool.push(parseFloat(parts[1]), parseFloat(parts[2]) || 0);
  
        } else if (tag === 'vn') {
          normPool.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
  
        } else if (tag === 'f') {
          // Triangulate n-gons (fan from vertex 0)
          var faceVerts = [];
          for (var k = 1; k < parts.length; k++) {
            faceVerts.push(this._parseFaceVert(parts[k]));
          }
          for (var k = 1; k < faceVerts.length - 1; k++) {
            this._pushVert(faceVerts[0],   posPool, uvPool, normPool, outPos, outUV, outNorm);
            this._pushVert(faceVerts[k],   posPool, uvPool, normPool, outPos, outUV, outNorm);
            this._pushVert(faceVerts[k+1], posPool, uvPool, normPool, outPos, outUV, outNorm);
          }
        }
      }
  
      // If no normals in the file, compute flat normals per triangle
      if (normPool.length === 0) {
        outNorm = this._computeFlatNormals(outPos);
      }
  
      // Pad UVs if the file had no texture coordinates
      if (outUV.length === 0) {
        for (var i = 0; i < outPos.length / 3; i++) outUV.push(0, 0);
      }
  
      // Upload to GPU
      this._vBuf  = this._upload(new Float32Array(outPos));
      this._nBuf  = this._upload(new Float32Array(outNorm));
      this._uvBuf = this._upload(new Float32Array(outUV));
      this._count = outPos.length / 3;
      this._ready = true;
  
      console.log('[OBJModel] loaded', this._count, 'vertices');
    }
  
    /** Parse one face-vertex token: "v", "v/vt", "v//vn", "v/vt/vn" */
    _parseFaceVert(token) {
      var idx = token.split('/');
      return {
        v:  parseInt(idx[0]) || 0,
        vt: parseInt(idx[1]) || 0,
        vn: parseInt(idx[2]) || 0
      };
    }
  
    _pushVert(fv, posPool, uvPool, normPool, outPos, outUV, outNorm) {
      var vi = (fv.v  > 0 ? fv.v  - 1 : posPool.length/3  + fv.v)  * 3;
      outPos.push(posPool[vi], posPool[vi+1], posPool[vi+2]);
  
      if (fv.vt > 0) {
        var ti = (fv.vt - 1) * 2;
        outUV.push(uvPool[ti], uvPool[ti+1]);
      } else if (fv.vt < 0) {
        var ti = (uvPool.length/2 + fv.vt) * 2;
        outUV.push(uvPool[ti], uvPool[ti+1]);
      }
      // (vt==0 → no UV; handled by padding after the loop)
  
      if (fv.vn !== 0) {
        var ni = (fv.vn > 0 ? fv.vn - 1 : normPool.length/3 + fv.vn) * 3;
        outNorm.push(normPool[ni], normPool[ni+1], normPool[ni+2]);
      }
    }
  
    /** Compute per-triangle flat normals when the OBJ has none. */
    _computeFlatNormals(pos) {
      var norms = [];
      for (var i = 0; i < pos.length; i += 9) {
        var ax = pos[i],   ay = pos[i+1], az = pos[i+2];
        var bx = pos[i+3], by = pos[i+4], bz = pos[i+5];
        var cx = pos[i+6], cy = pos[i+7], cz = pos[i+8];
        var ux = bx-ax, uy = by-ay, uz = bz-az;
        var vx = cx-ax, vy = cy-ay, vz = cz-az;
        var nx = uy*vz - uz*vy;
        var ny = uz*vx - ux*vz;
        var nz = ux*vy - uy*vx;
        var len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
        nx /= len; ny /= len; nz /= len;
        // same normal for all 3 verts of this triangle
        norms.push(nx,ny,nz, nx,ny,nz, nx,ny,nz);
      }
      return norms;
    }
  
    _upload(data) {
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return buf;
    }
  }