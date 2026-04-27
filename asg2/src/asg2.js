// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform float u_Size;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    gl_PointSize = u_Size;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

// Global Vars
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;




function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true})
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.enable(gl.DEPTH_TEST);

}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_FragSize');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }
}


// Constants
const ON = 0;
const OFF = 1;

const SHIFT_ANIM_DUR = 2.5;


//Main Camera Angle Globals
let g_globalAngleX = 0;
let g_globalAngleY = 0;
let g_globalAngleZ = 0;


//Drag Coordinate Globals
let g_isDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;


//Drag Camera Globals
let g_sliderAngleY = 40;
let g_dragAngleX = 0;
let g_dragAngleY = 0;


//Joint Angle Globals
let g_bodyAngle = 0;

let g_neckAngle = 0;
let g_jawAngle = 0;

let g_beard1Angle = 0;
let g_beard2Angle = 0;

let g_leg1Angle = 0;
let g_leg2Angle = 0;
let g_leg3Angle = 0;
let g_leg4Angle = 0;

let g_tail1Angle = 0;
let g_tail2Angle = 0;
let g_tail3Angle = 0;


//Animation Globals
let g_animation = true;
let g_shiftAnimation = false;
let g_shiftAnimStart = null;
let g_pendingAnimation = false;



function setMode(mode) {
    g_selectedType = mode;

    document.getElementById('on').classList.remove('active-mode');
    document.getElementById('off').classList.remove('active-mode');
    //document.getElementById('circle').classList.remove('active-mode');

    if (mode == ON)    document.getElementById('on').classList.add('active-mode');
    if (mode == OFF) document.getElementById('off').classList.add('active-mode');
    //if (mode == CIRCLE)   document.getElementById('circle').classList.add('active-mode');

}


//Animation Times
let g_pausedTime = 0;
let g_pauseStart = null;

function addActionsFromHtmlUI() {

  document.getElementById('on').onclick = function() {
    setMode(ON); 
    if (g_shiftAnimation) {
      g_pendingAnimation = true;  // queue it for when shift anim ends
      return;
    }
    if (!g_animation && g_pauseStart !== null) {
      g_pausedTime += performance.now() - g_pauseStart;
      g_pauseStart = null;
    }
    g_animation = true;
  };


  document.getElementById('off').onclick = function() {
    setMode(OFF); 
    g_animation = false;
    g_pauseStart = performance.now();
  };

  
  document.getElementById('angleSlide').addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      g_sliderAngleY = Number(this.value);
      g_dragAngleX = 0;  // reset drag when slider moves
      g_dragAngleY = 0;  // reset drag when slider moves
    }
  });


  document.getElementById('neckSlide').addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      g_neckAngle = this.value;
    }
  });


  document.getElementById('jawSlide').addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      g_jawAngle = this.value;
    }
  });


  document.getElementById('beard1Slide').addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      g_beard1Angle = this.value;
    }
  });


  document.getElementById('beard2Slide').addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      g_beard2Angle = this.value;
    }
  });


  document.getElementById('leg1Slide').addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      g_leg1Angle = this.value;
    }
  });


  document.getElementById('leg2Slide').addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      g_leg2Angle = this.value;
    }
  });


  document.getElementById('leg3Slide').addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      g_leg3Angle = this.value;
    }
  });


  document.getElementById('leg4Slide').addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      g_leg4Angle = this.value;
    }
  });


  document.getElementById('tail1Slide').addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      g_tail1Angle = this.value;
    }
  });



  document.getElementById('tail2Slide').addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      g_tail2Angle = this.value;
    }
  });



  document.getElementById('tail3Slide').addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      g_tail3Angle = this.value;
    }
  });


}


function main() {

  setupWebGL();

  connectVariablesToGLSL();

  addActionsFromHtmlUI();  

  canvas.onmousedown = function(ev) {
    if (ev.shiftKey && !g_shiftAnimation) {
      g_shiftAnimation = true;
      g_shiftAnimStart = (performance.now() - g_pausedTime) / 1000.0 - g_startTime;
      return; // don't start dragging
    }
    g_isDragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };
  
  canvas.onmouseup = function() {
    g_isDragging = false;
  };
  
  canvas.onmousemove = function(ev) {
    if (!g_isDragging) return;
    let dx = ev.clientX - g_lastMouseX;
    let dy = ev.clientY - g_lastMouseY;
    g_dragAngleY += dx * 0.5;
    g_dragAngleX += dy * 0.5;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  setMode(ON);

  //tick();

  requestAnimationFrame(tick);
}



//var g_points = [];  // The array for the position of a mouse press
//var g_colors = [];  // The array to store the color of a point
//var g_sizes = [];  //array to store size of point

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now/1000.0 - g_startTime;

let g_animationOffset = 0;

function tick() {
  
  g_seconds = (performance.now() - g_pausedTime) / 1000.0 - g_startTime;

  console.log(g_seconds);

  updateAnimationAngles();

  renderAllShapes();

  requestAnimationFrame(tick);
}




function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
}





function updateAnimationAngles() {

  if (g_shiftAnimation) {
    let elapsed = g_seconds - g_shiftAnimStart;
    if (elapsed >= SHIFT_ANIM_DUR) {
      g_shiftAnimation = false;
      if (g_pendingAnimation) {
        g_pendingAnimation = false;
        g_animation = true;
      }
    }
  }


  if (g_shiftAnimation) {
    let t = g_seconds - g_shiftAnimStart;


    //Body
    g_bodyAngle = 40 * Math.sin(t * 1.2);

    //Neck
    g_neckAngle = 20 * Math.sin(t * 1.2);

    //Mouth
    g_jawAngle = 40 * Math.sin(t * 1.2);

    //Front Legs
    g_leg3Angle =  60 * Math.sin(-t * 1.2);
    g_leg4Angle =  60 * Math.sin(t * 1.4);

    //Back Legs
    g_leg1Angle =  20 * Math.sin(t * 1);
    g_leg2Angle =  10 * Math.sin(-t * 1.4);


    //Tail
    g_tail1Angle = 25 * Math.sin(t * 5);
    g_tail2Angle = 25 * Math.sin(t * 5 + 1);
    g_tail3Angle = 25 * Math.sin(t * 5 + 2);
    document.getElementById('tail1Slide').value = g_tail1Angle;
    document.getElementById('tail2Slide').value = g_tail2Angle;
    document.getElementById('tail3Slide').value = g_tail3Angle;


    return; // skip normal animation while shift animation plays
  }









  //Normal Animation
  if (g_animation && !g_shiftAnimation) {
    g_jawAngle = 5 * Math.sin(g_seconds*2) + 10;
    document.getElementById('jawSlide').value = g_jawAngle;


    //Body slight shift when walking
    g_bodyAngle = 1.5 * Math.sin(g_seconds*3) + 5;


    //Neck up and down
    g_neckAngle = 5* Math.sin(g_seconds*2) + 0
    document.getElementById('neckSlide').value = g_neckAngle;


    //Walk order + orientation
    // 3    1
    // 2    4


    //Legs
    g_leg1Angle = 8 * Math.sin(g_seconds*3-45) - 5;        //back left
    g_leg2Angle = 8 * Math.sin(g_seconds*3-45) + 5;        //back right
    g_leg3Angle = 12 * Math.sin(g_seconds*3) - 5;       //front left
    g_leg4Angle = 12 * Math.sin(g_seconds*3) + 5;       //front right

    document.getElementById('leg1Slide').value = g_leg1Angle;
    document.getElementById('leg2Slide').value = g_leg2Angle;
    document.getElementById('leg3Slide').value = g_leg3Angle;
    document.getElementById('leg4Slide').value = g_leg4Angle;



    //Waving Beard move with mouth
    g_beard1Angle = 2 * Math.sin(g_seconds*2);
    g_beard2Angle = 4 * Math.sin(g_seconds*2);

    document.getElementById('beard1Slide').value = g_beard1Angle;
    document.getElementById('beard2Slide').value = g_beard2Angle;

    

    //Tail Movement
    g_tail1Angle =  2 * Math.sin(g_seconds*3);
    g_tail2Angle =  4 * Math.sin(g_seconds*3);
    g_tail3Angle =  4 * Math.sin(g_seconds*5);


    document.getElementById('tail1Slide').value = g_tail1Angle;
    document.getElementById('tail2Slide').value = g_tail2Angle;
    document.getElementById('tail3Slide').value = g_tail3Angle;

    
  }
}

function renderAllShapes() {
    // Clear <canvas>

    var startTime = performance.now();

    //pass matrix to u_ModelMatrix
    var globalRotMat = new Matrix4().rotate(g_dragAngleX, 1,0,0);
                        globalRotMat.rotate(g_sliderAngleY + g_dragAngleY, 0,1,0);
                        globalRotMat.rotate(g_globalAngleZ, 0,0,1);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);


    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);





                                              //GOAT
//---------------------------------------------------------------------------------------------------


    //Draw Body

    var body = new Cube();
    body.color = [.85,.85,.85,1];

    body.matrix.translate(0.1,-0.3,0.2);
    body.matrix.rotate(45, 0,1,0);
    body.matrix.rotate(-5, 1,0,0);
    body.matrix.rotate(g_bodyAngle, 1,0,0);
  
    var bodyCordsMat = new Matrix4(body.matrix);
  
    body.matrix.scale(.5,.55,.85);
  
    body.render();



//---------------------------------------------------------------------------------------------------



    //Neck 1
    var neck1 = new Cube();
    neck1.color = [.9,.9,.9,1.0];
    neck1.matrix = new Matrix4(bodyCordsMat);

    neck1.matrix.translate(0,.6,-.3);
    neck1.matrix.rotate(180, 1,0,0);
    neck1.matrix.rotate(30, 1,0,0);    //here
    neck1.matrix.rotate(g_neckAngle, 1,0,0);

    var neck1CordsMat = new Matrix4(neck1.matrix);

    neck1.matrix.scale(.35,.35,.5);

    neck1.render();



    //Head
    var head = new Cube();
    head.color = [.9,.9,.9,1.0];
    head.matrix = new Matrix4(neck1CordsMat);

    head.matrix.translate(0,.13,.14);
    head.matrix.rotate(50, 1,0,0);


    var headCordsMat = new Matrix4(head.matrix);

    head.matrix.scale(.351,.351,.351);

    head.render();


//---------------------------------------------------------------------------------------------------


    //Eye 1 - outer
    var eye1 = new Cube();
    eye1.color = [.2,.2,.2,1];
    eye1.matrix = new Matrix4(head.matrix);

    eye1.matrix.translate(0,.45,.2);
    eye1.matrix.rotate(0, 1,0,0);

    var eye1CordsMat = new Matrix4(eye1.matrix);

    eye1.matrix.scale(1.03,.5,.45);

    eye1.render();




    //Eye 2 - inner
    var eye1 = new Cube();
    eye1.color = [.05,.05,.05,1];
    eye1.matrix = new Matrix4(head.matrix);

    eye1.matrix.translate(0,.5,.2);
    eye1.matrix.rotate(0, 1,0,0);

    var eye1CordsMat = new Matrix4(eye1.matrix);

    eye1.matrix.scale(1.04,.4,.2);

    eye1.render();



//---------------------------------------------------------------------------------------------------


    //Mouth 1 - bottom jaw
    var mouth1 = new Cube();
    mouth1.color = [.8,.8,.8,1.0];
    mouth1.matrix = new Matrix4(headCordsMat);

    mouth1.matrix.translate(0,.3,-.1);
    mouth1.matrix.rotate(-g_jawAngle, 1,0,0);
    mouth1.matrix.rotate(0, 1,0,0);
    mouth1.matrix.rotate(0, 1,0,0);

    var mouth1CordsMat = new Matrix4(mouth1.matrix);

    mouth1.matrix.scale(.2,.3,.1);

    mouth1.render();






    //Mouth 2 - bottom jaw - inner
    var mouth2 = new Cube();
    mouth2.color = [.7,.2,.3,1.0];
    mouth2.matrix = new Matrix4(mouth1CordsMat);

    mouth2.matrix.translate(0,0,0.02);
    mouth2.matrix.rotate(0, 1,0,0);
    mouth2.matrix.rotate(0, 1,0,0);
    mouth2.matrix.rotate(0, 1,0,0);

    mouth2.matrix.scale(.17,.27,.07);

    mouth2.render();




    //Mouth 3 - top jaw
    var mouth3 = new Cube();
    mouth3.color = [.8,.8,.8,1.0];
    mouth3.matrix = new Matrix4(headCordsMat);

    mouth3.matrix.translate(0,.3,.05);
    mouth3.matrix.rotate(0, 1,0,0);
    mouth3.matrix.rotate(0, 1,0,0);
    mouth3.matrix.rotate(0, 1,0,0);

    var mouth3CordsMat = new Matrix4(mouth3.matrix);

    mouth3.matrix.scale(.25,.3,.2);

    mouth3.render();    



//---------------------------------------------------------------------------------------------------




    //Beard 1 - base
    var beard1 = new Cube();
    beard1.color = [.8,.8,.8,1.0];
    beard1.matrix = new Matrix4(mouth1CordsMat);

    beard1.matrix.translate(0,.2,0);
    beard1.matrix.rotate(g_jawAngle, 1,0,0);
    beard1.matrix.rotate(g_beard1Angle, 1,0,0);
    beard1.matrix.rotate(-90, 1,0,0);
    beard1.matrix.rotate(-8, 1,0,0);

    var beard1CordsMat = new Matrix4(beard1.matrix);

    beard1.matrix.scale(.13,.15,.1);

    beard1.render();    



    //Beard 2 - base
    var beard2 = new Cube();
    beard2.color = [.8,.8,.8,1.0];
    beard2.matrix = new Matrix4(beard1CordsMat);

    beard2.matrix.translate(0,.1,0);
    beard2.matrix.rotate(g_jawAngle/3, 1,0,0);
    beard2.matrix.rotate(g_beard2Angle, 1,0,0);
    beard2.matrix.rotate(0, 1,0,0);
    beard2.matrix.rotate(-10, 1,0,0);

    var beard2CordsMat = new Matrix4(beard2.matrix);

    beard2.matrix.scale(.08,.14,.06);

    beard2.render();    



//---------------------------------------------------------------------------------------------------


 
    
    //Nose
    var nose = new Cube();
    nose.color = [.5,.5,.5,1.0];
    nose.matrix = new Matrix4(mouth3CordsMat);

    nose.matrix.translate(0,.23,.065);
    nose.matrix.rotate(0, 1,0,0);
    nose.matrix.rotate(0, 1,0,0);
    nose.matrix.rotate(0, 1,0,0);

    var noseCordsMat = new Matrix4(nose.matrix);

    nose.matrix.scale(.251,.08,.08);

    nose.render();        




//---------------------------------------------------------------------------------------------------



    //Left Horn 1
    var leftHorn1 = new Cube();
    leftHorn1.color = [.4,.4,.4,1];
    leftHorn1.matrix = new Matrix4(headCordsMat);

    leftHorn1.matrix.translate(0.05,0.15,.1);
    leftHorn1.matrix.rotate(-90, 0,1,0);
    leftHorn1.matrix.rotate(-90, 0,0,1);
    leftHorn1.matrix.rotate(-15, 1,0,0);

    var leftHorn1CordsMat = new Matrix4(leftHorn1.matrix);

    leftHorn1.matrix.scale(.25,.2,.17);

    leftHorn1.render();

    //Left Horn 2
    var leftHorn2 = new Cube();
    leftHorn2.color = [.4,.4,.4,1];
    leftHorn2.matrix = new Matrix4(leftHorn1CordsMat);

    leftHorn2.matrix.translate(0,0.14,0);
    leftHorn2.matrix.rotate(5, 0,1,0);
    leftHorn2.matrix.rotate(-15, 0,0,1);
    leftHorn2.matrix.rotate(-5, 1,0,0);

    var leftHorn2CordsMat = new Matrix4(leftHorn2.matrix);

    leftHorn2.matrix.scale(.2,.15,.12);

    leftHorn2.render();
  
    //Left Horn 3
    var leftHorn3 = new Cube();
    leftHorn3.color = [.4,.4,.4,1];
    leftHorn3.matrix = new Matrix4(leftHorn2CordsMat);

    leftHorn3.matrix.translate(0,0.1,0);
    leftHorn3.matrix.rotate(5, 0,1,0);
    leftHorn3.matrix.rotate(-25, 0,0,1);
    leftHorn3.matrix.rotate(5, 1,0,0);

    var leftHorn3CordsMat = new Matrix4(leftHorn3.matrix);

    leftHorn3.matrix.scale(.15,.18,.08);

    leftHorn3.render();
  
    //Left Horn 4
    var leftHorn4 = new Cube();
    leftHorn4.color = [.4,.4,.4,1];
    leftHorn4.matrix = new Matrix4(leftHorn3CordsMat);

    leftHorn4.matrix.translate(0,0.1,0);
    leftHorn4.matrix.rotate(5, 0,1,0);
    leftHorn4.matrix.rotate(-20, 0,0,1);
    leftHorn4.matrix.rotate(5, 1,0,0);

    leftHorn4.matrix.scale(.1,.2,.04);

    leftHorn4.render();





//---------------------------------------------------------------------------------------------------



    //right Horn 1
    var rightHorn1 = new Cube();
    rightHorn1.color = [.4,.4,.4,1];
    rightHorn1.matrix = new Matrix4(headCordsMat);

    rightHorn1.matrix.translate(-0.05,0.15,.1);
    rightHorn1.matrix.rotate(-90, 0,1,0);
    rightHorn1.matrix.rotate(-90, 0,0,1);
    rightHorn1.matrix.rotate(15, 1,0,0);

    var rightHorn1CordsMat = new Matrix4(rightHorn1.matrix);

    rightHorn1.matrix.scale(.25,.2,.17);

    rightHorn1.render();

    //right Horn 2
    var rightHorn2 = new Cube();
    rightHorn2.color = [.4,.4,.4,1];
    rightHorn2.matrix = new Matrix4(rightHorn1CordsMat);

    rightHorn2.matrix.translate(0,0.14,0);
    rightHorn2.matrix.rotate(-5, 0,1,0);
    rightHorn2.matrix.rotate(-15, 0,0,1);
    rightHorn2.matrix.rotate(5, 1,0,0);

    var rightHorn2CordsMat = new Matrix4(rightHorn2.matrix);

    rightHorn2.matrix.scale(.2,.15,.12);

    rightHorn2.render();
  
    //right Horn 3
    var rightHorn3 = new Cube();
    rightHorn3.color = [.4,.4,.4,1];
    rightHorn3.matrix = new Matrix4(rightHorn2CordsMat);

    rightHorn3.matrix.translate(0,0.1,0);
    rightHorn3.matrix.rotate(-5, 0,1,0);
    rightHorn3.matrix.rotate(-25, 0,0,1);
    rightHorn3.matrix.rotate(-5, 1,0,0);

    var rightHorn3CordsMat = new Matrix4(rightHorn3.matrix);

    rightHorn3.matrix.scale(.15,.18,.08);

    rightHorn3.render();
  
    //right Horn 4
    var rightHorn4 = new Cube();
    rightHorn4.color = [.4,.4,.4,1];
    rightHorn4.matrix = new Matrix4(rightHorn3CordsMat);

    rightHorn4.matrix.translate(0,0.1,0);
    rightHorn4.matrix.rotate(-5, 0,1,0);
    rightHorn4.matrix.rotate(-20, 0,0,1);
    rightHorn4.matrix.rotate(-5, 1,0,0);

    rightHorn4.matrix.scale(.1,.2,.04);

    rightHorn4.render();



//---------------------------------------------------------------------------------------------------



    //Leg 1 - Back Left
    var leg1 = new Cube();
    leg1.color = [.9,.9,.9,1.0];
    leg1.matrix = new Matrix4(bodyCordsMat);

    leg1.matrix.translate(.18,.3,.25);
    leg1.matrix.rotate(180, 1,0,0);
    leg1.matrix.rotate(-10, 0,0,1);
    leg1.matrix.rotate(-10, 1,0,0);
    leg1.matrix.rotate(180, 0,1,0);

    leg1.matrix.rotate(g_leg1Angle, 1,0,0);

    var leg1CordsMat = new Matrix4(leg1.matrix);

    leg1.matrix.scale(.18,.7,.18);

    leg1.render();



    //Hoof 1 - Back Left
    var hoof1 = new Cube();
    hoof1.color = [.5,.55,.5,1.0];
    hoof1.matrix = new Matrix4(leg1CordsMat);

    hoof1.matrix.translate(0,.61,0);

    var hoof1CordsMat = new Matrix4(hoof1.matrix);

    hoof1.matrix.scale(.19,.1,.19);

    hoof1.render();






    //Leg 2 - Back Right
    var leg2 = new Cube();
    leg2.color = [.9,.9,.9,1.0];
    leg2.matrix = new Matrix4(bodyCordsMat);

    leg2.matrix.translate(-.18,.3,.25);
    leg2.matrix.rotate(180, 1,0,0);
    leg2.matrix.rotate(10, 0,0,1);
    leg2.matrix.rotate(-10, 1,0,0);
    leg2.matrix.rotate(0, 0,1,0);

    leg2.matrix.rotate(g_leg2Angle, 1,0,0); 

    var leg2CordsMat = new Matrix4(leg2.matrix);

    leg2.matrix.scale(.18,.7,.18);

    leg2.render();



    //Hoof 2 - Back Right
    var hoof2 = new Cube();
    hoof2.color = [.5,.55,.5,1.0];
    hoof2.matrix = new Matrix4(leg2CordsMat);

    hoof2.matrix.translate(0,.61,0);

    var hoof2CordsMat = new Matrix4(hoof2.matrix);

    hoof2.matrix.scale(.19,.1,.19);

    hoof2.render();    





    //Leg 3 - Front Left
    var leg3 = new Cube();
    leg3.color = [.9,.9,.9,1.0];
    leg3.matrix = new Matrix4(bodyCordsMat);

    leg3.matrix.translate(.15,.3,-.3);
    leg3.matrix.rotate(180, 1,0,0);
    leg3.matrix.rotate(-10, 0,0,1);
    leg3.matrix.rotate(10, 1,0,0);
    leg3.matrix.rotate(180, 0,1,0);

    leg3.matrix.rotate(g_leg3Angle, 1,0,0);

    var leg3CordsMat = new Matrix4(leg3.matrix);

    leg3.matrix.scale(.2,.7,.2);

    leg3.render();



    //Hoof 3 - Front Left
    var hoof3 = new Cube();
    hoof3.color = [.5,.55,.5,1.0];
    hoof3.matrix = new Matrix4(leg3CordsMat);

    hoof3.matrix.translate(0,.61,0);

    var hoof3CordsMat = new Matrix4(hoof3.matrix);

    hoof3.matrix.scale(.21,.1,.21);

    hoof3.render();        






    //Leg 4 - Front Right
    var leg4 = new Cube();
    leg4.color = [.9,.9,.9,1.0];
    leg4.matrix = new Matrix4(bodyCordsMat);

    leg4.matrix.translate(-.15,.3,-.3);
    leg4.matrix.rotate(180, 1,0,0);
    leg4.matrix.rotate(10, 0,0,1);
    leg4.matrix.rotate(10, 1,0,0);
    leg4.matrix.rotate(0, 0,1,0);

    leg4.matrix.rotate(g_leg4Angle, 1,0,0);

    var leg4CordsMat = new Matrix4(leg4.matrix);

    leg4.matrix.scale(.2,.7,.2);

    leg4.render();    



    //Hoof 4 - Front Right
    var hoof4 = new Cube();
    hoof4.color = [.5,.55,.5,1.0];
    hoof4.matrix = new Matrix4(leg4CordsMat);

    hoof4.matrix.translate(0,.61,0);

    var hoof4CordsMat = new Matrix4(hoof4.matrix);

    hoof4.matrix.scale(.21,.1,.21);

    hoof4.render();        



    //---------------------------------------------------------------------------------------------------



    //Spot 1
    var spot1 = new Cube();
    spot1.color = [.4,.4,.4,1.0];
    spot1.matrix = new Matrix4(bodyCordsMat);

    spot1.matrix.translate(0,.14,0);

    spot1.matrix.scale(.501,.18,.18);

    spot1.render();


    //Spot 2
    var spot2 = new Cube();
    spot2.color = [.4,.4,.4,1.0];
    spot2.matrix = new Matrix4(bodyCordsMat);

    spot2.matrix.translate(0,.35,0.2);
    spot2.matrix.rotate(45, 1,0,0);

    spot2.matrix.scale(.501,.15,.15);

    spot2.render();


    //Spot 3
    var spot3 = new Cube();
    spot3.color = [.4,.4,.4,1.0];
    spot3.matrix = new Matrix4(bodyCordsMat);

    spot3.matrix.translate(0,.33,-0.25);

    spot3.matrix.scale(.501,.12,.12);

    spot3.render();



    //---------------------------------------------------------------------------------------------------



    //Tail 1 - base
    var tail1 = new Cube();
    tail1.color = [.7,.7,.7,1.0];
    tail1.matrix = new Matrix4(bodyCordsMat);

    tail1.matrix.translate(0,.45,0.4);
    tail1.matrix.rotate(90, 1,0,0);

    tail1.matrix.rotate(g_tail1Angle, 1,0,0);

    var tail1CordsMat = new Matrix4(tail1.matrix);

    tail1.matrix.scale(.1,.15,.1);

    tail1.render();


    var tail2 = new Cube();
    tail2.color = [.7,.7,.7,1.0];
    tail2.matrix = new Matrix4(tail1CordsMat);

    tail2.matrix.translate(0,0.13,0.01);
    tail2.matrix.rotate(-30, 1,0,0);

    tail2.matrix.rotate(g_tail2Angle, 1,0,0);

    var tail2CordsMat = new Matrix4(tail2.matrix);

    tail2.matrix.scale(.07,.15,.07);

    tail2.render();


    //Tail 2 - tip
    var tail3 = new Pyramid();
    tail3.color = [.7,.7,.7,1.0];
    tail3.matrix = new Matrix4(tail2CordsMat);

    tail3.matrix.translate(0,0.12,0);
    tail3.matrix.rotate(-20, 1,0,0);

    tail3.matrix.rotate(g_tail3Angle, 1,0,0);

    tail3.matrix.scale(.07,.15,.07);

    tail3.render();


    //check time at end of draw and show on webpage
    var duration = performance.now() - startTime;
    sendTextToHTML( " ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration).toFixed(1), "numdot");

}



function sendTextToHTML(text, htmlID) {
    var htmlElm = document.getElementById(htmlID);
    if (!htmlElm) {
        console.log("Failed to get " + htmlID + " from HTML");
        return;
    }
    htmlElm.innerHTML = text;
}