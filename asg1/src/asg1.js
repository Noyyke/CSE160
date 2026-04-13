// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
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
let g_ghostMode = false;
let g_ghostSpeed = 0.01;




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

}

function updateColorPreview() {
  let r = Math.round(g_selectedColor[0] * 255);
  let g = Math.round(g_selectedColor[1] * 255);
  let b = Math.round(g_selectedColor[2] * 255);
  let a = g_selectedColor[3];
  document.getElementById('colorPreview').style.backgroundColor = `rgba(${r},${g},${b},${a})`;
}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// UI Globals
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 20;
let g_selectedType = POINT;
let g_selectedSegments = 10;

function setMode(mode) {
    g_selectedType = mode;

    document.getElementById('point').classList.remove('active-mode');
    document.getElementById('triangle').classList.remove('active-mode');
    document.getElementById('circle').classList.remove('active-mode');

    if (mode == POINT)    document.getElementById('point').classList.add('active-mode');
    if (mode == TRIANGLE) document.getElementById('triangle').classList.add('active-mode');
    if (mode == CIRCLE)   document.getElementById('circle').classList.add('active-mode');

}

function addActionsFromHtmlUI() {


  document.getElementById('red').onclick = function() {g_selectedColor = [1.0, 0.0, 0.0, 1.0]; updateColorPreview();};
  document.getElementById('green').onclick = function() {g_selectedColor = [0.0, 1.0, 0.0, 1.0]; updateColorPreview();};
  document.getElementById('blue').onclick = function() {g_selectedColor = [0.0, 0.0, 1.0, 1.0]; updateColorPreview();};

  document.getElementById('clear').onclick = function() {g_shapesList = []; renderAllShapes();};


  document.getElementById('point').onclick = function() {setMode(POINT)};
  document.getElementById('triangle').onclick = function() {setMode(TRIANGLE)};
  document.getElementById('circle').onclick = function() {setMode(CIRCLE)};

  document.getElementById('totoro').onclick = function() {drawTotoro()};

  document.getElementById('ghost').onclick = function() {
    g_ghostMode = !g_ghostMode;
    document.getElementById('ghost').classList.toggle('active-mode', g_ghostMode);
  };

  document.getElementById('ghostSpeedSlide').addEventListener('input', function() {
    g_ghostSpeed = this.value / 1000;
  });


  document.getElementById('redSlide').addEventListener('mouseup', function() {g_selectedColor[0] = this.value/100; updateColorPreview();});
  document.getElementById('greenSlide').addEventListener('mouseup', function() {g_selectedColor[1] = this.value/100; updateColorPreview();});
  document.getElementById('blueSlide').addEventListener('mouseup', function() {g_selectedColor[2] = this.value/100; updateColorPreview();});
  document.getElementById('alphaSlide').addEventListener('mouseup', function() {g_selectedColor[3] = this.value/100; updateColorPreview();});

  document.getElementById('sizeSlide').addEventListener('mouseup', function() {g_selectedSize = this.value});
  document.getElementById('segmentSlide').addEventListener('mouseup', function() {g_selectedSegments = this.value});


}

function drawTotoro() {
  let t = new Totoro();
  t.position = [0.0, 0.0];
  t.color = g_selectedColor.slice();
  t.size = g_selectedSize;
  g_shapesList.push(t);
  renderAllShapes();
}

function main() {

  setupWebGL();

  connectVariablesToGLSL();

  addActionsFromHtmlUI();  

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) {if (ev.buttons == 1) {click(ev)}};

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  setMode(POINT);

  tick();
}



//var g_points = [];  // The array for the position of a mouse press
//var g_colors = [];  // The array to store the color of a point
//var g_sizes = [];  //array to store size of point


function tick() {
  if (g_ghostMode) {
    g_shapesList.forEach(shape => {
      shape.color[3] -= g_ghostSpeed;
    })

    g_shapesList = g_shapesList.filter(shape => shape.color[3] > 0);

    renderAllShapes();
  }

  requestAnimationFrame(tick);
}


var g_shapesList = [];

function click(ev) {

  let [x,y] = convertCoordinatesEventToGL(ev);


  let point;
  if (g_selectedType == POINT) {
    point = new Point();
  } else if (g_selectedType == TRIANGLE) {
    point = new Triangle();
  } else if (g_selectedType == CIRCLE) {
    point = new Circle();
    point.segments = g_selectedSegments;
  } else {
    point = new Point();
  }

  point.position = [x,y];
  point.color = g_selectedColor.slice();
  point.baseAlpha = g_selectedColor[3];
  point.size = g_selectedSize;

  g_shapesList.push(point);

  // Store the coordinates to g_points array
  //g_points.push([x, y]);
  // Store the coordinates to g_points array
  //g_colors.push(g_selectedColor.slice());

  //g_sizes.push(g_selectedSize);

  //Redraw all shapes
  renderAllShapes();

}

function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
}

function renderAllShapes() {
    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    var len = g_shapesList.length;
    for(var i = 0; i < len; i++) {
      g_shapesList[i].render();
    }
}