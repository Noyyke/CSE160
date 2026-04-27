class Cube {
    constructor(){
      this.type = 'circle';
      //this.position = [0.0, 0.0, 0.0];
      this.color = [1.0, 1.0, 1.0, 1.0];
      //this.size = 5.0;
      //this.segments = 10;
      this.matrix = new Matrix4();
    }
  
    render() {
      //var xy = this.position;
      var rgba = this.color;
      //var size = this.size;
    
      gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

      // front
      drawTriangle3D([-0.5,0.0,-0.5,  0.5,1.0,-0.5,  0.5,0.0,-0.5]);
      drawTriangle3D([-0.5,0.0,-0.5, -0.5,1.0,-0.5,  0.5,1.0,-0.5]);

      // top
      gl.uniform4f(u_FragColor, rgba[0]*.95, rgba[1]*.95, rgba[2]*.95, rgba[3]);
      drawTriangle3D([-0.5,1.0,-0.5,  0.5,1.0,-0.5,  0.5,1.0, 0.5]);
      drawTriangle3D([-0.5,1.0,-0.5,  0.5,1.0, 0.5, -0.5,1.0, 0.5]);

      // bottom
      gl.uniform4f(u_FragColor, rgba[0]*.7, rgba[1]*.7, rgba[2]*.7, rgba[3]);
      drawTriangle3D([-0.5,0.0, 0.5,  0.5,0.0, 0.5,  0.5,0.0,-0.5]);
      drawTriangle3D([-0.5,0.0, 0.5,  0.5,0.0,-0.5, -0.5,0.0,-0.5]);

      // left
      gl.uniform4f(u_FragColor, rgba[0]*.75, rgba[1]*.75, rgba[2]*.75, rgba[3]);
      drawTriangle3D([-0.5,0.0,-0.5, -0.5,1.0,-0.5, -0.5,1.0, 0.5]);
      drawTriangle3D([-0.5,0.0,-0.5, -0.5,1.0, 0.5, -0.5,0.0, 0.5]);

      // right
      gl.uniform4f(u_FragColor, rgba[0]*.85, rgba[1]*.85, rgba[2]*.85, rgba[3]);
      drawTriangle3D([0.5,0.0,-0.5,  0.5,1.0, 0.5,  0.5,1.0,-0.5]);
      drawTriangle3D([0.5,0.0,-0.5,  0.5,0.0, 0.5,  0.5,1.0, 0.5]);

      // back
      gl.uniform4f(u_FragColor, rgba[0]*.9, rgba[1]*.9, rgba[2]*.9, rgba[3]);
      drawTriangle3D([-0.5,0.0, 0.5,  0.5,1.0, 0.5,  0.5,0.0, 0.5]);
      drawTriangle3D([-0.5,0.0, 0.5, -0.5,1.0, 0.5,  0.5,1.0, 0.5]);


    }
  }
