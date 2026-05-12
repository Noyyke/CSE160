// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute float a_Shade;
  varying vec2 v_UV;
  varying float v_Shade;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Shade = a_Shade;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying float v_Shade;
  uniform vec4 u_FragColor;
  uniform vec4 u_TintColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform int u_whichTexture;
  void main() {
    vec4 baseColor;
    if (u_whichTexture == -2) {
        baseColor = u_FragColor;

    } else if (u_whichTexture == -1) {
        baseColor = vec4(v_UV,1.0,1.0);

    } else if (u_whichTexture == 0) {
        baseColor = texture2D(u_Sampler0, v_UV) * u_TintColor;

    } else if (u_whichTexture == 1) {
        baseColor = texture2D(u_Sampler1, v_UV) * u_TintColor;

    } else if (u_whichTexture == 2) {
        baseColor = texture2D(u_Sampler2, v_UV) * u_TintColor;

    } else if (u_whichTexture == 3) {
        baseColor = texture2D(u_Sampler3, v_UV) * u_TintColor;

    } else {
        baseColor = vec4(1,.2,.2,1);
    } 
    gl_FragColor = vec4(baseColor.rgb * v_Shade, baseColor.a);

  }`




// Global Vars
let canvas;
let gl;

//Shader Variables
let a_Position;
let a_UV;
let a_Shade;
let u_FragColor;
let u_TintColor;
let u_Size;

//Shader Matrices
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;

//Textures
let u_Sampler;
let u_Sampler1;
let u_Sampler2;
let u_Sampler3;

//Texture Select
let u_whichTexture;

//Movement Variables
let g_keys = {};
let g_camera;
let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

//Game Variables
let g_flashlight = false;

//Ray Variables
let g_rayResult = null;      // current looked-at block
let g_highlightCube = null;  // reusable highlight cube

//Fps vars
let g_fpsBuffer = [];
let g_fpsBufferSize = 30;


//Unchanging / reused
let g_floorCube = null;
let g_projMat = null;
let g_globalRotMat = null;



// Goat joint angles
let g_bodyAngle = 0, g_neckAngle = 0, g_jawAngle = 0;
let g_beard1Angle = 0, g_beard2Angle = 0;
let g_leg1Angle = 0, g_leg2Angle = 0, g_leg3Angle = 0, g_leg4Angle = 0;
let g_tail1Angle = 0, g_tail2Angle = 0, g_tail3Angle = 0;


/*
let g_map = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];
*/


let g_map = [];
for (let x = 0; x < 32; x++) {
  g_map[x] = [];
  for (let y = 0; y < 8; y++) {   // 8 layers tall
    g_map[x][y] = new Uint8Array(32); // all zeros
  }
}


function setBlock(x, y, z, val) { g_map[x][y][z] = val; }
function getBlock(x, y, z) {
  if (x<0||x>=32||y<0||y>=8||z<0||z>=32) return 0;
  return g_map[x][y][z];
}


function buildWorld() {
  // Perimeter walls (Y=0 layer)
  for (let i = 0; i < 32; i++) {
    setBlock(0,  0, i, 1);
    setBlock(31, 0, i, 1);
    setBlock(i,  0, 0, 1);
    setBlock(i,  0, 31, 1);
  }

  // A few interior walls from the original map
  setBlock(1, 0, 3, 1);
  setBlock(3, 0, 3, 1);
  setBlock(6, 0, 4, 1);

  // Example: a 2-tall tower
  setBlock(10, 0, 10, 1);
  setBlock(10, 1, 10, 1);

  // Example: a little platform
  for (let x = 14; x < 18; x++)
    for (let z = 14; z < 18; z++)
      setBlock(x, 2, z, 1);
}





function drawMap() {
  var body = new cornerCube();

  for (let x = 0; x < 32; x++) {
    for (let y = 0; y < 8; y++) {
      for (let z = 0; z < 32; z++) {
        if (g_map[x][y][z] === 1) {
          body.color = [1, 1, 1, 1];
          body.tint  = [.05, .05, .05, 1.0];
          body.textureNum = 2;
          // world Y: layer 0 sits at -0.75, each layer is 1 unit up
          body.matrix.setTranslate(x - 16, -0.75 + y, z - 16);
          body.renderFaster();
        }
      }
    }
  }
}





function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", {
    preserveDrawingBuffer: true,
    antialias: true
  });
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

  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }

  a_Shade = gl.getAttribLocation(gl.program, 'a_Shade');
  if (a_Shade < 0) {
      console.log('Failed to get a_Shade');
      return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_TintColor = gl.getUniformLocation(gl.program, 'u_TintColor');
  if (!u_TintColor) {
      console.log('Failed to get u_TintColor');
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

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }




  u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler) {
      console.log('Failed to get the storage location of u_Sampler0');
      return;
  }

  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if (!u_Sampler1) {
      console.log('Failed to get the storage location of u_Sampler1');
      return;
  }

  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  if (!u_Sampler2) {
      console.log('Failed to get the storage location of u_Sampler2');
      return;
  }

  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  if (!u_Sampler3) {
      console.log('Failed to get u_Sampler3');
      return;
  }

  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
    if (u_whichTexture < 0) {
      console.log('Failed to get u_whichTexture');
      return;
  }
}


function setDefaultShade() {
  // disable the shade attrib array and set a constant value of 1.0 (no darkening)
  gl.disableVertexAttribArray(a_Shade);
  gl.vertexAttrib1f(a_Shade, 1.0);
}

function enableShade() {
  gl.enableVertexAttribArray(a_Shade);
}



//Main Camera Angle Globals
let g_globalAngleX = 0;
let g_globalAngleY = 0;
let g_globalAngleZ = 0;




function initTextures() {

    var image = new Image();
    if (!image) {
        console.log('Failed to create image object');
        return false;
    }
    image.onload = function() { sendImageToTEXTURE0(image); };
    image.src = '../textures/sky.jpg';

    var image1 = new Image();
    if (!image1) {
        console.log('Failed to create image 1 object');
        return false;
    }
    image1.onload = function() { sendImageToTEXTURE1(image1); };
    image1.src = '../textures/forestfloordark.jpg';

    var image2 = new Image();
    if (!image2) {
        console.log('Failed to create image 2 object');
        return false;
    }
    image2.onload = function() { sendImageToTEXTURE2(image2); };
    image2.src = '../textures/mcdirt.jpg';


    return true;
}


function sendImageToTEXTURE0(image) {
  var texture = gl.createTexture();
  if (!texture) { return false; }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);  // generate mipmap chain

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);  // trilinear
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  gl.uniform1i(u_Sampler, 0);
  console.log('finished loadTexture0');
}

function sendImageToTEXTURE1(image) {
  var texture = gl.createTexture();
  if (!texture) { return false; }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  gl.uniform1i(u_Sampler1, 1);
  console.log('finished loadTexture1');
}

function sendImageToTEXTURE2(image) {
  var texture = gl.createTexture();
  if (!texture) { return false; }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  gl.uniform1i(u_Sampler2, 2);
  console.log('finished loadTexture2');
}


function setMode(mode) {
    //g_selectedType = mode;

    //document.getElementById('on').classList.remove('active-mode');
    //document.getElementById('off').classList.remove('active-mode');
    //document.getElementById('circle').classList.remove('active-mode');

    //if (mode == ON)    document.getElementById('on').classList.add('active-mode');
    //if (mode == OFF) document.getElementById('off').classList.add('active-mode');
    //if (mode == CIRCLE)   document.getElementById('circle').classList.add('active-mode');

}

function isBlocked(x, y, z) {
  var mapX   = Math.floor(x + 16);
  var mapZ   = Math.floor(z + 16);
  var blockY = Math.floor(y + 0.75);

  if (mapX < 0 || mapX >= 32 || mapZ < 0 || mapZ >= 32) return true;
  if (blockY < 0 || blockY >= 8) return false;

  return g_map[mapX][blockY][mapZ] === 1;
}

function isOnFloor(y) {
  return y < 0.25;
}

/*
function isBlocked(x, z) {
  var r = 0.3; // collision radius
  var mapX1 = Math.floor(x - r + 4);
  var mapX2 = Math.floor(x + r + 4);
  var mapZ1 = Math.floor(z - r + 4);
  var mapZ2 = Math.floor(z + r + 4);

  for (let mx = mapX1; mx <= mapX2; mx++) {
    for (let mz = mapZ1; mz <= mapZ2; mz++) {
      if (mx < 0 || mx >= 8 || mz < 0 || mz >= 8) return true;
      if (g_map[mx][mz] == 1) return true;
    }
  }
  return false;
}
*/

//Animation Times
let g_pausedTime = 0;
let g_pauseStart = null;




function addActionsFromHtmlUI() {
  document.onkeydown = function(ev) {
    var key = ev.key.toLowerCase();
  
    // prevent browser shortcuts when game is focused
    if (ev.ctrlKey && ['w', 't', 'r', 'n'].includes(key)) {
      ev.preventDefault();
    }
  
    g_keys[key] = true;
    if (key === 'f') g_flashlight = !g_flashlight;
    if ([' ', 'w', 'a', 's', 'd'].includes(key)) ev.preventDefault();
  };

  document.onkeyup = function(ev) {
      g_keys[ev.key.toLowerCase()] = false;
  };

  window.onblur = function() {
    g_keys = {};
  };

  // ONE pointerlockchange listener total
  document.addEventListener('pointerlockchange', function() {
    g_keys = {};
    if (document.pointerLockElement === canvas) {
      document.onmousemove = function(ev) {
        g_camera.panLeft(-ev.movementX * 0.2);
        g_camera.panUp(-ev.movementY * 0.2);
      };
    } else {
      document.onmousemove = null;
    }
  });
}


function handleKeys() {
  var speed = g_keys['shift'] ? g_camera.speed * 3 : g_camera.speed;
  if (g_keys['w']) g_camera.moveForward(speed);
  if (g_keys['s']) g_camera.moveBackward(speed);
  if (g_keys['a']) g_camera.moveLeft(speed);
  if (g_keys['d']) g_camera.moveRight(speed);
  if (g_keys[' '])         g_camera.moveUp(speed);
  if (g_keys['control'])   g_camera.moveDown(speed);
  if (g_keys['q']) g_camera.panLeft(g_camera.panSpeed);
  if (g_keys['e']) g_camera.panRight(g_camera.panSpeed);

  const FLOOR_Y = 1;
  if (g_camera.eye.elements[1] < FLOOR_Y) {
    var correction = FLOOR_Y - g_camera.eye.elements[1];
    g_camera.eye.elements[1] = FLOOR_Y;
    g_camera.at.elements[1] += correction;
  }
}



function mouseHandler() {
  canvas.onmousedown = function(ev) {
    g_mouseDown = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };

  canvas.onmouseup = function(ev) {
    g_mouseDown = false;
  };

  canvas.onmousemove = function(ev) {
    if (!g_mouseDown) return;
    var dx = ev.clientX - g_lastMouseX;
    var dy = ev.clientY - g_lastMouseY;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    g_camera.panLeft(-dx * 0.3);
    g_camera.panUp(-dy * 0.3);
  };

  canvas.onclick = function() {
    canvas.requestPointerLock();
  };
  // NO pointerlockchange listener here anymore

  canvas.addEventListener('mousedown', function(ev) {
    if (document.pointerLockElement !== canvas) return;

    var result = castRay();
    if (!result) return;

    if (ev.button === 0 && result.hit) {
      // break
      g_map[result.mapX][result.mapY][result.mapZ] = 0;
    }
    
    if (ev.button === 2) {
      // place — goes into the prev cell the ray passed through
      var px = result.prevMapX;
      var py = result.prevMapY;
      var pz = result.prevMapZ;
    
      if (result.hit && px >= 0 && py >= 0 && pz >= 0) {
        var camX = Math.floor(g_camera.eye.elements[0] + 16);
        var camZ = Math.floor(g_camera.eye.elements[2] + 16);
        if (px !== camX || pz !== camZ) {
          g_map[px][py][pz] = 1;
        }
      } else if (result.onFloor) {
        var camX = Math.floor(g_camera.eye.elements[0] + 16);
        var camZ = Math.floor(g_camera.eye.elements[2] + 16);
        if (result.mapX !== camX || result.mapZ !== camZ) {
          g_map[result.mapX][0][result.mapZ] = 1;
        }
      }
    }
  });

  // prevent right-click context menu on canvas
  canvas.addEventListener('contextmenu', function(ev) {
      ev.preventDefault();
  });

}


function createFlashlightTexture() {
  var size = 256;
  var c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  var ctx = c.getContext('2d');

  var gradient = ctx.createRadialGradient(
      size/2, size/2, 0,       // inner circle center
      size/2, size/2, size/2   // outer circle
  );
  gradient.addColorStop(0,    'rgba(255,255,255,0.3)');  // was 1
  gradient.addColorStop(0.6,  'rgba(255,255,255,0.3)');  // was 0.8
  gradient.addColorStop(0.7,  'rgba(255,255,255,0.4)');  // was 0.2
  gradient.addColorStop(0.8,  'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // upload to WebGL as texture 3
  var texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(u_Sampler3, 3);
}



function main() {

  g_camera = new Camera();
  g_camera.speed = 0.04;
  g_camera.panSpeed = 0.4;


  setupWebGL();

  connectVariablesToGLSL();

  createFlashlightTexture();

  addActionsFromHtmlUI();  

  mouseHandler();

  initTextures();

  buildWorld();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //setMode(ON);



  requestAnimationFrame(tick);
}



var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;

let g_animationOffset = 0;

function tick() {
  
  g_seconds = (performance.now() - g_pausedTime) / 1000.0 - g_startTime;

  //console.log(g_seconds);

  //
  //g_globalAngleX += 0.25;
  //g_globalAngleY += 0.25;
  handleKeys();

  updateGoat();

  updateAnimationAngles();
  updateTreeAnimation();

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






function castRay() {
  var forward  = g_camera.at.sub(g_camera.eye).normalized();
  var stepSize = 0.1;
  var maxDist  = 8.0;

  var x = g_camera.eye.elements[0];
  var y = g_camera.eye.elements[1];
  var z = g_camera.eye.elements[2];

  var prevMapX = -1, prevMapY = -1, prevMapZ = -1;

  for (var dist = 0; dist < maxDist; dist += stepSize) {
    x += forward.elements[0] * stepSize;
    y += forward.elements[1] * stepSize;
    z += forward.elements[2] * stepSize;

    var mapX  = Math.floor(x + 16);
    var mapZ  = Math.floor(z + 16);
    var blockY = Math.floor(y + 0.75);

    if (mapX < 0 || mapX >= 32 || mapZ < 0 || mapZ >= 32) continue;
    if (blockY < 0 || blockY >= 8) continue;

    if (g_map[mapX][blockY][mapZ] === 1) {
      return {
        hit: true,
        mapX, mapY: blockY, mapZ,
        prevMapX, prevMapY, prevMapZ,
        worldX: x, worldY: y, worldZ: z
      };
    }

    prevMapX = mapX;
    prevMapY = blockY;
    prevMapZ = mapZ;
  }

  // floor check
  if (forward.elements[1] < 0) {
    var t = (-0.75 - g_camera.eye.elements[1]) / forward.elements[1];
    if (t > 0 && t < maxDist) {
      var fx  = g_camera.eye.elements[0] + forward.elements[0] * t;
      var fz  = g_camera.eye.elements[2] + forward.elements[2] * t;
      var fmx = Math.floor(fx + 16);
      var fmz = Math.floor(fz + 16);
      if (fmx >= 0 && fmx < 32 && fmz >= 0 && fmz < 32)
        return { hit: false, onFloor: true, mapX: fmx, mapY: 0, mapZ: fmz };
    }
  }

  return { hit: false, onFloor: false };
}


function drawHighlight(result) {
  if (!result) return;

  var wx, wz;

  if (result.hit) {
      wx = result.mapX - 16;
      wz = result.mapZ - 16;
  } else if (result.onFloor) {
      wx = result.mapX - 16;
      wz = result.mapZ - 16;
  } else {
      return;
  }

  if (!g_highlightCube) g_highlightCube = new cornerCube();

  g_highlightCube.textureNum = -2;
  g_highlightCube.color = [.5, .5, 0, 0.25];  // yellow, semi-transparent
  g_highlightCube.tint  = [1, 1, 1, 1];
  g_highlightCube.matrix.setTranslate(wx, -0.75 + result.mapY, wz);
  g_highlightCube.matrix.scale(1.01, 1.01, 1.01);  // slightly bigger to avoid z-fight
  g_highlightCube.matrix.translate(-0.005, -0.005, -0.005);

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  g_highlightCube.renderFaster();
  gl.depthMask(true);
}





function renderAllShapes() {
  var startTime = performance.now();

  // global rotate — only recompute if angles change (they don't currently)
  if (!g_globalRotMat) {
    g_globalRotMat = new Matrix4();
    // if you ever animate these, set a dirty flag and recompute
  }
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, g_globalRotMat.elements);

  // projection — only compute once (canvas size never changes)
  if (!g_projMat) {
    g_projMat = new Matrix4();
    g_projMat.setPerspective(60, canvas.width / canvas.height, 0.1, 100);
  }
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_projMat.elements);

  // view matrix — must update every frame (camera moves)
  var viewMat = new Matrix4();
  viewMat.setLookAt(
    g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
    g_camera.at.elements[0],  g_camera.at.elements[1],  g_camera.at.elements[2],
    g_camera.up.elements[0],  g_camera.up.elements[1],  g_camera.up.elements[2]
  );
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  g_rayResult = castRay();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // floor — reuse same object every frame
  if (!g_floorCube) {
    g_floorCube = new cornerCube();
    g_floorCube.color = [1.0, 0.0, 0.0, 1.0];
    g_floorCube.tint = [.05, .025, 0, 1];
    g_floorCube.textureNum = 1;
    g_floorCube.uvScale = 100;
    g_floorCube.matrix.translate(0, -.75, 0);
    g_floorCube.matrix.scale(50, 0, 50);
    g_floorCube.matrix.translate(-.5, 0, -.5);
  }
  g_floorCube.renderFaster();

  // sky
  var sky = new Sphere();
  sky.textureNum = 0;
  sky.tint = [0.2, 0.0, 0.0, 1.0];
  sky.matrix.translate(
    g_camera.eye.elements[0],
    g_camera.eye.elements[1],
    g_camera.eye.elements[2]
  );
  sky.matrix.scale(45, 45, 45);
  gl.depthMask(false);
  sky.render();
  gl.depthMask(true);

  drawMap();
  drawGoat(g_goatX, 0.25, g_goatZ);

  drawTree(3, -0.75, 3, [.1,.1,.1,1], 2, 90);   // place wherever you want
  drawTree(-5, -0.75, 7, [.1,.1,.1,1], 2, 0);




  drawHighlight(g_rayResult);


  if (g_flashlight) {
    var forward = g_camera.at.sub(g_camera.eye).normalized();
    var right   = forward.cross(g_camera.up).normalized();
    var up      = right.cross(forward).normalized();

    var dist = 0.5;
    var cx = g_camera.eye.elements[0] + forward.elements[0] * dist;
    var cy = g_camera.eye.elements[1] + forward.elements[1] * dist;
    var cz = g_camera.eye.elements[2] + forward.elements[2] * dist;

    var light = new cornerCube();
    light.textureNum = 3;
    light.tint = [.6, .6, .6, 0.1];

    light.matrix.translate(cx, cy, cz);

    var e = light.matrix.elements;
    e[0] = right.elements[0];    e[1] = right.elements[1];    e[2] = right.elements[2];
    e[4] = up.elements[0];       e[5] = up.elements[1];       e[6] = up.elements[2];
    e[8] = -forward.elements[0]; e[9] = -forward.elements[1]; e[10] = -forward.elements[2];

    light.matrix.scale(0.35, 0.35, 0.001);
    light.matrix.translate(-0.4, -0.6, 0);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    gl.depthFunc(gl.ALWAYS);   // <-- ignore depth, always draw on top
    light.render();
    gl.depthFunc(gl.LESS);     // <-- restore normal depth testing
    gl.depthMask(true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
    

    //check time at end of draw and show on webpage
    var duration = performance.now() - startTime;
    g_fpsBuffer.push(1000 / duration);
    if (g_fpsBuffer.length > g_fpsBufferSize) g_fpsBuffer.shift();
    var avgFps = g_fpsBuffer.reduce((a,b) => a+b, 0) / g_fpsBuffer.length;
    sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(avgFps), "numdot");

}



function sendTextToHTML(text, htmlID) {
    var htmlElm = document.getElementById(htmlID);
    if (!htmlElm) {
        console.log("Failed to get " + htmlID + " from HTML");
        return;
    }
    htmlElm.innerHTML = text;
}