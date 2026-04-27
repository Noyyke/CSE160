class Pyramid {
  constructor(){
    this.type = 'pyramid';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }

  render() {
    var rgba = this.color;
  
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // front
    drawTriangle3D([0.0,1.0,0.0,  -0.5,0.0,-0.5,  0.5,0.0,-0.5]);

    // back
    gl.uniform4f(u_FragColor, rgba[0]*.9, rgba[1]*.9, rgba[2]*.9, rgba[3]);
    drawTriangle3D([0.0,1.0,0.0,  0.5,0.0,0.5,  -0.5,0.0,0.5]);

    // left
    gl.uniform4f(u_FragColor, rgba[0]*.75, rgba[1]*.75, rgba[2]*.75, rgba[3]);
    drawTriangle3D([0.0,1.0,0.0,  -0.5,0.0,0.5,  -0.5,0.0,-0.5]);

    // right
    gl.uniform4f(u_FragColor, rgba[0]*.85, rgba[1]*.85, rgba[2]*.85, rgba[3]);
    drawTriangle3D([0.0,1.0,0.0,  0.5,0.0,-0.5,  0.5,0.0,0.5]);

    // bottom (two triangles to make a square)
    gl.uniform4f(u_FragColor, rgba[0]*.7, rgba[1]*.7, rgba[2]*.7, rgba[3]);
    drawTriangle3D([-0.5,0.0,-0.5,  0.5,0.0,0.5,  0.5,0.0,-0.5]);
    drawTriangle3D([-0.5,0.0,-0.5,  -0.5,0.0,0.5,  0.5,0.0,0.5]);
  }
}