class Triangle {
    constructor(){
      this.type = 'triangle';
      this.position = [0.0, 0.0, 0.0];
      this.color = [1.0, 1.0, 1.0, 1.0];
      this.size = 5.0;
    }
  
    render() {
      var xy = this.position;
      var rgba = this.color;
      var size = this.size;
    
      // Pass the position of a point to a_Position variable
      gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);

      // Pass the color of a point to u_FragColor variable
      gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

      // Pass the size of a point to u_Size variable
      gl.uniform1f(u_Size, size);
      
      // Draw
      var scale = this.size/200.0
      drawTriangle([xy[0], xy[1], xy[0]+scale, xy[1], xy[0], xy[1]+scale])
    }
  }

  function drawTriangle(vertices) {
    var n = 3;

    //create buffer obj
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create buffer object');
        return -1;
    }

    //bind buffer obj to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    //send data into buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    //assign buffer to a_pos
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    //enable assignment
    gl.enableVertexAttribArray(a_Position);

    //draw
    gl.drawArrays(gl.TRIANGLES, 0, n);
  }

  function drawTriangle3D(vertices) {
    var n = 3;

    //create buffer obj
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create buffer object');
        return -1;
    }

    //bind buffer obj to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    //send data into buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    //assign buffer to a_pos
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

    //enable assignment
    gl.enableVertexAttribArray(a_Position);

    //draw
    gl.drawArrays(gl.TRIANGLES, 0, n);
  }

