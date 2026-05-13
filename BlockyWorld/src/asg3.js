//asg3.js

//

// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute float a_Shade;
  varying vec2 v_UV;
  varying float v_Shade;
  varying vec3 v_WorldPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    vec4 worldPos = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_WorldPos = worldPos.xyz;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;
    v_UV = a_UV;
    v_Shade = a_Shade;
  }`

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying float v_Shade;
  varying vec3 v_WorldPos;
  uniform vec4 u_FragColor;
  uniform vec4 u_TintColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform int u_whichTexture;
  uniform int u_flashlight;
  uniform vec3 u_FlashPos;
  uniform vec3 u_FlashDir;
  uniform float u_FlashCutoff;   // cos of cone half-angle
  uniform float u_FlashOuter;    // cos of outer cone (softer edge)
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

    vec3 lit = baseColor.rgb * v_Shade;

    if (u_flashlight == 1) {
      vec3 toFrag    = v_WorldPos - u_FlashPos;
      float dist     = length(toFrag);
      vec3 toFragDir = toFrag / dist;
      float cosAngle = dot(toFragDir, u_FlashDir);

      // Cone check: inside inner cone = full light, between inner/outer = smooth falloff
      float intensity = smoothstep(u_FlashOuter, u_FlashCutoff, cosAngle);

      // Distance attenuation — light falls off with square of distance
      float attenuation = 1.0 / (1.0 + 0.15 * dist + 0.08 * dist * dist);

      intensity *= attenuation;

      // Add flashlight contribution on top of existing shading
      lit += baseColor.rgb * intensity * 20.;
    }

    gl_FragColor = vec4(lit, baseColor.a);
  }`
 
 
// ─── Global Vars ────────────────────────────────────────────────────────────
 
let canvas;
let gl;
 
// Shader Variables
let a_Position;
let a_UV;
let a_Shade;
let u_FragColor;
let u_TintColor;
let u_Size;
 
// Shader Matrices
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
 
// Textures
let u_Sampler;
let u_Sampler1;
let u_Sampler2;
let u_Sampler3;
 
// Texture Select
let u_whichTexture;
 
// Movement
let g_keys = {};
let g_camera;
let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
 
// Game
let g_flashlight = false;
 
// Ray
let g_rayResult = null;
let g_highlightCube = null;
 
// FPS
let g_fpsBuffer = [];
let g_fpsBufferSize = 30;
 
// Reused objects
let g_floorCube = null;
let g_projMat = null;
let g_globalRotMat = null;
 
// Goat joint angles
let g_bodyAngle = 0, g_neckAngle = 0, g_jawAngle = 0;
let g_beard1Angle = 0, g_beard2Angle = 0;
let g_leg1Angle = 0, g_leg2Angle = 0, g_leg3Angle = 0, g_leg4Angle = 0;
let g_tail1Angle = 0, g_tail2Angle = 0, g_tail3Angle = 0;
 

//Flashlight Globals
let u_flashlight;
let u_FlashPos;
let u_FlashDir;
let u_FlashCutoff;
let u_FlashOuter;
// ─── Mode ───────────────────────────────────────────────────────────────────
 
// 'creative' or 'survival'
let g_gameMode = 'creative';
 
const SPAWN_EYE = [15, 1, 15];
const SPAWN_AT  = [-17, 1, -16];
 
function toggleMode() {
  if (g_gameMode === 'creative') {
    enterSurvival();
  } else {
    enterCreative();
  }
}

function updateBrightness(val) {
  canvas.style.filter = 'brightness(' + val + '%)';
  document.getElementById('brightnessVal').textContent = val + '%';
}

function toggleFullscreen() {
  var el = document.documentElement; // fullscreen the whole page
  // or use: var el = canvas;        // fullscreen just the canvas

  if (!document.fullscreenElement) {
    el.requestFullscreen().catch(function(err) {
      console.warn('Fullscreen request failed:', err);
    });
  } else {
    document.exitFullscreen();
  }
}
 

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function enterCreative() {
  g_gameMode = 'creative';
  var btn = document.getElementById('modeBtn');
  btn.textContent = 'Creative';
  btn.className = 'mode-btn creative-active';
  document.getElementById('pages-hud').style.display = 'none';
  document.getElementById('pickup-hint').style.display = 'none';
}
 
function enterSurvival() {
  g_gameMode = 'survival';
 
  // Teleport player to spawn
  g_camera.eye = new Vector3(SPAWN_EYE);
  g_camera.at  = new Vector3(SPAWN_AT);
  g_camera.up  = new Vector3([0, 1, 0]);
 
  // Reset and randomize pages
  resetPages();
  updatePagesHUD();
 
  var btn = document.getElementById('modeBtn');
  btn.textContent = 'Survival';
  btn.className = 'mode-btn survival-active';
  document.getElementById('pages-hud').style.display = 'block';
}
 
// ─── Map ────────────────────────────────────────────────────────────────────
 
let g_map = [];
for (let x = 0; x < 32; x++) {
  g_map[x] = [];
  for (let y = 0; y < 8; y++) {
    g_map[x][y] = new Uint8Array(32);
  }
}
 
function setBlock(x, y, z, val) { g_map[x][y][z] = val; }
function getBlock(x, y, z) {
  if (x<0||x>=32||y<0||y>=8||z<0||z>=32) return 0;
  return g_map[x][y][z];
}
 
function buildWorld() {
  for (let i = 0; i < 32; i++) {
    setBlock(0,  0, i, 1);
    setBlock(31, 0, i, 1);
    setBlock(i,  0, 0, 1);
    setBlock(i,  0, 31, 1);
  }
}
 
let g_mapDirty = true;
let g_mapDrawList = [];
 
function rebuildMapDrawList() {
  g_mapDrawList = [];
  for (let x=0;x<32;x++) for (let y=0;y<8;y++) for (let z=0;z<32;z++)
    if (g_map[x][y][z] === 1) g_mapDrawList.push({x, y, z});
  g_mapDirty = false;
}
 
function drawMap() {
  if (g_mapDirty) rebuildMapDrawList();
  var body = new cornerCube();
  for (var i = 0; i < g_mapDrawList.length; i++) {
    var b = g_mapDrawList[i];
    body.color = [1,1,1,1];
    body.tint  = [.05,.05,.05,1];
    body.textureNum = 2;
    body.matrix.setTranslate(b.x-16, -0.75+b.y, b.z-16);
    body.renderFaster();
  }
}
 
// ─── Tree positions ──────────────────────────────────────────────────────────
const TREE_DEFS = [
  [ 3,  3,  90],  // 0
  [-5,  7,   0],  // 1
  [ 7, -5,  45],  // 2
  [-8, -3, 135],  // 3
  [ 4, -8,  60],  // 4
  [-4,  4, 200],  // 5
  [ 9,  6, 300],  // 6
  [-6, -7,  20],  // 7
  [ 2,  9, 180],  // 8
  [ 8, -9,  75],  // 9
  [-9,  9, 250],  // 10
  [ 6,  0, 110],  // 11
  [ 9, -5, 160],  // 12
  [-2,  0,  20],  // 13
  [10, -1, 110],  // 14
  [-11,  2,  55], // 15
  [ 12,  5, 230], // 16
  [-10, -8, 170], // 17
  [ 11, -7,  30], // 18
  [-13,  6,  80], // 19
  [ 13,  0, 310], // 20
  [ 0,  13, 145], // 21
  [ 0, -12,  95], // 22
  [-7,  12, 200], // 23
  [ 7,  11, 340], // 24
  [-12, -5, 125], // 25
  [ 5,  13,  15], // 26
  [-5, -13,  70], // 27
  [ 13, -12, 220],// 28
  [-13,  13, 280],// 29
  [ 11,  10, 190],// 30
  [-11, -11,  40],// 31
  [ 3,  -13, 160],// 32
  [-8,   0, 330], // 33
  [ 14,  7,  85], // 34
];

const TREE_SCALES = TREE_DEFS.map(function() {
  return 2.0 + Math.random() * 2.0;  // range 2.0 – 4.0
});
 
// ─── Pages ──────────────────────────────────────────────────────────────────
 
let g_pagesCollected = 0;
const PAGE_PICKUP_DIST   = 2.5;
const PAGE_HIGHLIGHT_DIST = 6.0;
const PAGE_COUNT = 8;
 
let g_pageObjects = [];
 
// 8 random trees, page at each
function resetPages() {
  g_pagesCollected = 0;
  g_pageObjects = [];
 
  var indices = TREE_DEFS.map(function(_, i) { return i; });
  for (var i = indices.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
  }
  var chosen = indices.slice(0, PAGE_COUNT);
 
  for (var k = 0; k < PAGE_COUNT; k++) {
    var td = TREE_DEFS[chosen[k]];
    g_pageObjects.push({
      wx: td[0] + 0.3,
      wy: 0.9,
      wz: td[1] + 0.3,
      collected: false
    });
  }
}
 
function updatePagesHUD() {
  var el = document.getElementById('pages-hud');
  el.textContent = '📄 Pages: ' + g_pagesCollected + ' / ' + PAGE_COUNT;
}
 
function castRayToPages() {
  var forward = g_camera.at.sub(g_camera.eye).normalized();
  var stepSize = 0.08;
  var maxDist  = PAGE_HIGHLIGHT_DIST;
  var ex = g_camera.eye.elements[0];
  var ey = g_camera.eye.elements[1];
  var ez = g_camera.eye.elements[2];
 
  for (var dist = 0; dist < maxDist; dist += stepSize) {
    var rx = ex + forward.elements[0] * dist;
    var ry = ey + forward.elements[1] * dist;
    var rz = ez + forward.elements[2] * dist;
    for (var i = 0; i < g_pageObjects.length; i++) {
      var p = g_pageObjects[i];
      if (p.collected) continue;
      var dx = rx - p.wx, dy = ry - p.wy, dz = rz - p.wz;
      if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 0.45) return i;
    }
  }
  return -1;
}
 
function distToPage(i) {
  var p = g_pageObjects[i];
  var e = g_camera.eye.elements;
  var dx = e[0]-p.wx, dy = e[1]-p.wy, dz = e[2]-p.wz;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}
 
function tryPickupPage() {
  if (g_gameMode !== 'survival') return;
  if (g_jumpscare) return;
  var idx = castRayToPages();
  if (idx === -1) return;
  if (distToPage(idx) > PAGE_PICKUP_DIST) return;
  if (g_pageObjects[idx].collected) return;
  g_pageObjects[idx].collected = true;
  g_pagesCollected++;
  Audio.play('page', 0.8);
  updatePagesHUD();
 
  if (g_pagesCollected >= PAGE_COUNT) {
    triggerJumpscare();
  }
}
 
// Only draw pages in survival mode
function drawPages(highlightIdx) {
  if (g_gameMode !== 'survival') return;
 
  for (var i = 0; i < g_pageObjects.length; i++) {
    var p = g_pageObjects[i];
    if (p.collected) continue;
 
    var isHighlighted = (i === highlightIdx);
    var bob  = 0.08 * Math.sin(g_seconds * 2.0 + i * 1.3);
    var spin = (g_seconds * 40 + i * 45) % 360;
 
    var page = new Cube();
    page.textureNum = -2;
    page.color = isHighlighted ? [1.0, 1.0, 0.3, 1.0] : [0.95, 0.92, 0.80, 1.0];
    page.matrix = new Matrix4();
    page.matrix.setTranslate(p.wx, p.wy + bob, p.wz);
    page.matrix.rotate(spin, 0, 1, 0);
    page.matrix.scale(0.22, 0.28, 0.02);
    page.matrix.translate(-0.5, 0, -0.5);
    page.renderFaster();
 
    if (isHighlighted) {
      var glow = new Cube();
      glow.textureNum = -2;
      glow.color = [1.0, 1.0, 0.0, 0.18];
      glow.matrix = new Matrix4();
      glow.matrix.setTranslate(p.wx, p.wy + bob, p.wz);
      glow.matrix.rotate(spin, 0, 1, 0);
      glow.matrix.scale(0.28, 0.34, 0.06);
      glow.matrix.translate(-0.5, -0.1, -0.5);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      glow.renderFaster();
      gl.depthMask(true);
    }
  }
}
 
// ─── Jumpscare ────
 
let g_jumpscare       = false;
let g_jumpscareStart  = 0;
const JUMPSCARE_START_DIST  = 18.0; 
const JUMPSCARE_END_DIST    =  2.0; 
const JUMPSCARE_FLASH_COUNT =  4; 
const JUMPSCARE_DUR         =  3.0; 

let g_slenderHeadAngle = 0;
 
function triggerJumpscare() {
  g_jumpscare      = true;
  g_jumpscareStart = g_seconds;
  g_slenderHeadAngle = 0;
  Audio.playJumpscare();
 
  // Flash screen white 
  var ov = document.getElementById('jumpscare-overlay');
  if (ov) {
    ov.style.opacity = '1';
    setTimeout(function() {
      ov.style.transition = 'opacity 0.3s';
      ov.style.opacity = '0';
    }, 150);
  }
}
 
// Draw slenderman in front of camera
function drawSlenderman() {
  if (!g_jumpscare) return;

  var elapsed = g_seconds - g_jumpscareStart;
  if (elapsed > JUMPSCARE_DUR) {
    g_jumpscare = false;
    // Clear overlay
    var ov = document.getElementById('jumpscare-overlay');
    if (ov) { ov.style.opacity = '0'; }
    resetPages();
    updatePagesHUD();
    return;
  }

  var forward = g_camera.at.sub(g_camera.eye).normalized();
  var ex = g_camera.eye.elements[0];
  var ey = g_camera.eye.elements[1];
  var ez = g_camera.eye.elements[2];

  // Flash / step 
  // Divide duration 
  // white glash
  // slenderman draw
  var phaseDur   = JUMPSCARE_DUR / JUMPSCARE_FLASH_COUNT;
  var phaseIdx   = Math.floor(elapsed / phaseDur);
  phaseIdx       = Math.min(phaseIdx, JUMPSCARE_FLASH_COUNT - 1);
  var phaseT     = (elapsed % phaseDur) / phaseDur;

  var flashPhase = phaseT < 0.15;   // white flash

 
  var t    = phaseIdx / Math.max(1, JUMPSCARE_FLASH_COUNT - 1);
  var dist = JUMPSCARE_START_DIST + (JUMPSCARE_END_DIST - JUMPSCARE_START_DIST) * t;

  var sx = ex + forward.elements[0] * dist;
  var sy = ey - 1.0;
  var sz = ez + forward.elements[2] * dist;

  // Head sway 
  var swaySpeed = 2.0 + t * 4.0;
  var swayAmp   = 20.0 + t * 45.0;
  g_slenderHeadAngle = swayAmp * Math.sin(elapsed * Math.PI * swaySpeed);

  var flicker = 0.7 + 0.3 * Math.sin(elapsed * 47.3);
  var fade    = Math.min(1.0, elapsed * 4.0);
  var v = flashPhase ? 0.0 : (0.04 * flicker * fade);
  var sc = [v, v, v, 1.0];

  // Overlay 
  var ov = document.getElementById('jumpscare-overlay');
  if (ov) {
    if (flashPhase) {
      // white flash
      ov.style.transition = 'none';
      ov.style.background = 'rgba(255,255,255,1.0)';
      ov.style.opacity = '1';
    } else {
      // red pulse between flashes
      var pulse = 0.25 + 0.15 * Math.sin(elapsed * 8.0);
      ov.style.transition = 'none';
      ov.style.background = 'rgba(10,0,0,' + (pulse * fade) + ')';
      ov.style.opacity = '1';
    }
  }

  // draw body
  if (flashPhase) return;

  var facingAngle = Math.atan2(forward.elements[0], forward.elements[2]) * 180 / Math.PI + 180;

  var baseMat = new Matrix4();
  baseMat.setTranslate(sx, sy, sz);
  baseMat.rotate(facingAngle, 0, 1, 0);

  // left leg
  var leftLeg = new Cube();
  leftLeg.textureNum = -2; leftLeg.color = sc;
  leftLeg.matrix = new Matrix4(baseMat);
  leftLeg.matrix.translate(-0.1, 0, -0.06);
  var leftLegCords = new Matrix4(leftLeg.matrix);
  leftLeg.matrix.scale(0.12, 1.4, 0.12);
  leftLeg.renderFaster();

  // right leg
  var rightLeg = new Cube();
  rightLeg.textureNum = -2; rightLeg.color = sc;
  rightLeg.matrix = new Matrix4(baseMat);
  rightLeg.matrix.translate(0.1, 0, -0.06);
  var rightLegCords = new Matrix4(rightLeg.matrix);
  rightLeg.matrix.scale(0.12, 1.4, 0.12);
  rightLeg.renderFaster();

  // torso
  var torso = new Cube();
  torso.textureNum = -2; torso.color = sc;
  torso.matrix = new Matrix4(baseMat);
  torso.matrix.translate(0, 1.2, -0.08); 
  var torsoCords = new Matrix4(torso.matrix);
  torso.matrix.scale(0.44, 1.2, 0.16);
  torso.renderFaster();
  
  // left arm
  var leftArm = new Cube();
  leftArm.textureNum = -2; leftArm.color = sc;
  leftArm.matrix = new Matrix4(torsoCords);
  leftArm.matrix.translate(-0.2, 1.2, 0.04); 
  leftArm.matrix.rotate(-5, 0, 0, 1); 
  leftArm.matrix.rotate(180, 1, 0, 0); 
  var leftArmCords = new Matrix4(leftArm.matrix);
  leftArm.matrix.scale(0.08, 1.6, 0.08);
  leftArm.renderFaster();
  
  //right arm
  var rightArm = new Cube();
  rightArm.textureNum = -2; rightArm.color = sc;
  rightArm.matrix = new Matrix4(torsoCords);
  rightArm.matrix.translate(0.2, 1.2, 0.04);
  rightArm.matrix.rotate(5, 0, 0, 1);
  rightArm.matrix.rotate(180, 1, 0, 0);
  var rightArmCords = new Matrix4(rightArm.matrix);
  rightArm.matrix.scale(0.08, 1.6, 0.08);
  rightArm.renderFaster();
  
  // neck
  var neck = new Cube();
  neck.textureNum = -2; neck.color = sc;
  neck.matrix = new Matrix4(torsoCords);
  neck.matrix.translate(0, 1.1, 0.1);
  neck.matrix.rotate(g_slenderHeadAngle, 0, 0, 1);
  var neckCords = new Matrix4(neck.matrix);
  neck.matrix.scale(0.08, 0.22, 0.08);
  neck.renderFaster();

  // head
  var head = new Cube();
  head.textureNum = -2; head.color = [1, 1, 1, 1];
  head.matrix = new Matrix4(neckCords);
  head.matrix.translate(0, 0.22, -0.1); 
  head.matrix.rotate(g_slenderHeadAngle * 0.35, 0, 0, 1); 
  var headCords = new Matrix4(head.matrix);
  head.matrix.scale(0.2, 0.28, 0.2);
  head.renderFaster();


  // Vignette overlay
  var ov = document.getElementById('jumpscare-overlay');
  if (ov) {
    var pulse = 0.18 + 0.12 * Math.sin(elapsed * 8.0);
    ov.style.transition = 'none';
    ov.style.background = 'rgba(10,0,0,' + (pulse * fade) + ')';
    ov.style.opacity = '1';
  }
} 
 
// ─── WebGL setup ─────
 
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", {
    preserveDrawingBuffer: true,
    antialias: true
  });
  if (!gl) { console.log('Failed to get the rendering context for WebGL'); return; }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.DEPTH_TEST);
}
 
function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  a_Position           = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV                 = gl.getAttribLocation(gl.program, 'a_UV');
  a_Shade              = gl.getAttribLocation(gl.program, 'a_Shade');
  u_FragColor          = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_TintColor          = gl.getUniformLocation(gl.program, 'u_TintColor');
  u_ModelMatrix        = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  u_ViewMatrix         = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix   = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_Sampler            = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1           = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2           = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3           = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_whichTexture       = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_flashlight         = gl.getUniformLocation(gl.program, 'u_flashlight');
  u_FlashPos           = gl.getUniformLocation(gl.program, 'u_FlashPos');
  u_FlashDir           = gl.getUniformLocation(gl.program, 'u_FlashDir');
  u_FlashCutoff        = gl.getUniformLocation(gl.program, 'u_FlashCutoff');
  u_FlashOuter         = gl.getUniformLocation(gl.program, 'u_FlashOuter');
}
 
function setDefaultShade() {
  gl.disableVertexAttribArray(a_Shade);
  gl.vertexAttrib1f(a_Shade, 1.0);
}
 
function enableShade() {
  gl.enableVertexAttribArray(a_Shade);
}
 
// Camera angles
 
let g_globalAngleX = 0;
let g_globalAngleY = 0;
let g_globalAngleZ = 0;
 
// Textures
 
function initTextures() {
  var image = new Image();
  image.onload = function() { sendImageToTEXTURE0(image); };
  image.src = '../textures/sky.jpg';
 
  var image1 = new Image();
  image1.onload = function() { sendImageToTEXTURE1(image1); };
  image1.src = '../textures/forestfloordark.jpg';
 
  var image2 = new Image();
  image2.onload = function() { sendImageToTEXTURE2(image2); };
  image2.src = '../textures/mcdirt.jpg';
 
  return true;
}
 
function sendImageToTEXTURE0(image) {
  var texture = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.uniform1i(u_Sampler, 0);
}
 
function sendImageToTEXTURE1(image) {
  var texture = gl.createTexture();
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
}
 
function sendImageToTEXTURE2(image) {
  var texture = gl.createTexture();
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
}
 
// Collision
 
function isBlocked(x, y, z) {
  var mapX   = Math.floor(x + 16);
  var mapZ   = Math.floor(z + 16);
  var blockY = Math.floor(y + 0.75);
  if (mapX < 0 || mapX >= 32 || mapZ < 0 || mapZ >= 32) return true;
  if (blockY < 0 || blockY >= 8) return false;
  return g_map[mapX][blockY][mapZ] === 1;
}
 
function isOnFloor(y) { return y < 0.25; }
 
// input
 
let g_pausedTime = 0;
let g_pauseStart = null;
 
function addActionsFromHtmlUI() {
  document.onkeydown = function(ev) {
    var key = ev.key.toLowerCase();
    if (ev.ctrlKey && ['w', 't', 'r', 'n'].includes(key)) ev.preventDefault();
    g_keys[key] = true;
    if (key === 'f') {g_flashlight = !g_flashlight; Audio.playFlashlight();}
    if (key === 'e') tryPickupPage();
    if ([' ', 'w', 'a', 's', 'd'].includes(key)) ev.preventDefault();
    if (key === 'f11' || (key === 'enter' && ev.altKey)) toggleFullscreen();
  };
 
  document.onkeyup = function(ev) {
    g_keys[ev.key.toLowerCase()] = false;
  };
 
  window.onblur = function() { g_keys = {}; };
 
  document.addEventListener('pointerlockchange', function() {
    g_keys = {};
    if (document.pointerLockElement === canvas) {
      var skipFrames = 3;  // skip first few events, browsers vary
      document.onmousemove = function(ev) {
        if (skipFrames > 0) { skipFrames--; return; }
        // Also clamp per-frame delta to catch any remaining spikes
        var dx = Math.max(-50, Math.min(50, ev.movementX));
        var dy = Math.max(-50, Math.min(50, ev.movementY));
        g_camera.panLeft(-dx * 0.2);
        g_camera.panUp(-dy * 0.2);
      };
    } else {
      document.onmousemove = null;
    }
  });

  document.addEventListener('fullscreenchange', function() {
    var btn = document.getElementById('fullscreenBtn');
    if (btn) btn.textContent = document.fullscreenElement ? '✕ Exit Fullscreen' : '⛶ Fullscreen';
  });
}
 
function handleKeys() {
  if (g_jumpscare) return;

  var isRunning = !!g_keys['shift'];
  var moving    = !!(g_keys['w'] || g_keys['s'] || g_keys['a'] || g_keys['d']);

  // Footsteps only in survival mode
  if (g_gameMode === 'survival') {
    Audio.updateFootsteps(moving, isRunning && moving);
  } else {
    Audio.stopFootsteps();
  }

  var speed = isRunning ? g_camera.speed * 1.5 : g_camera.speed;

  if (g_keys['w']) g_camera.moveForward(speed);
  if (g_keys['s']) g_camera.moveBackward(speed);
  if (g_keys['a']) g_camera.moveLeft(speed);
  if (g_keys['d']) g_camera.moveRight(speed);
  if (g_keys['q']) g_camera.panLeft(g_camera.panSpeed);

  if (g_gameMode === 'creative') {
    if (g_keys[' '])       g_camera.moveUp(speed);
    if (g_keys['control']) g_camera.moveDown(speed);
  } else {
    const FLOOR_Y = 1;
    if (g_camera.eye.elements[1] < FLOOR_Y) {
      var correction = FLOOR_Y - g_camera.eye.elements[1];
      g_camera.eye.elements[1] = FLOOR_Y;
      g_camera.at.elements[1] += correction;
    }
  }
}
 
// mouse
 
function mouseHandler() {
  canvas.onmousedown = function(ev) {
    g_mouseDown = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };
  canvas.onmouseup   = function() { g_mouseDown = false; };
  canvas.onmousemove = function(ev) {
    if (!g_mouseDown) return;
    var dx = ev.clientX - g_lastMouseX;
    var dy = ev.clientY - g_lastMouseY;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    g_camera.panLeft(-dx * 0.3);
    g_camera.panUp(-dy * 0.3);
  };
 
  canvas.addEventListener('contextmenu', function(ev) { ev.preventDefault(); });
 
  canvas.addEventListener('mousedown', function(ev) {
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
      Audio.init();
      Audio.startAmbient();
      return;
    }
    if (g_gameMode !== 'creative') return;
 
    var result = castRay();
    if (!result) return;
 
    if (ev.button === 0 && result.hit) {
      g_map[result.mapX][result.mapY][result.mapZ] = 0;
      g_mapDirty = true;
    }
 
    if (ev.button === 2) {
      var px = result.prevMapX, py = result.prevMapY, pz = result.prevMapZ;
      if (result.hit && px >= 0 && py >= 0 && pz >= 0) {
        var camX = Math.floor(g_camera.eye.elements[0] + 16);
        var camZ = Math.floor(g_camera.eye.elements[2] + 16);
        if (px !== camX || pz !== camZ) { g_map[px][py][pz] = 1; g_mapDirty = true; }
      } else if (result.onFloor) {
        var camX = Math.floor(g_camera.eye.elements[0] + 16);
        var camZ = Math.floor(g_camera.eye.elements[2] + 16);
        if (result.mapX !== camX || result.mapZ !== camZ) {
          g_map[result.mapX][0][result.mapZ] = 1;
          g_mapDirty = true;
        }
      }
    }
  });
}
 
// flashlight
 
function createFlashlightTexture() {
  var size = 512;
  var c = document.createElement('canvas');
  c.width = size; c.height = size;
  var ctx = c.getContext('2d');

  var gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0,    'rgba(255,255,255,0.18)'); // soft center
  gradient.addColorStop(0.4,  'rgba(255,255,255,0.12)');
  gradient.addColorStop(0.7,  'rgba(255,255,255,0.05)');
  gradient.addColorStop(1.0,  'rgba(255,255,255,0.0)');  // transparent rim

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

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
 
// main
 
function main() {
  g_camera = new Camera();
  g_camera.speed    = 0.01;
  g_camera.panSpeed = 0.2;
 
  setupWebGL();
  connectVariablesToGLSL();
  createFlashlightTexture();
  addActionsFromHtmlUI();
  mouseHandler();
  initTextures();
  buildWorld();
  updateBrightness(30);

  //g_jumpscare = true;
  
 
 
  var ov = document.getElementById('jumpscare-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'jumpscare-overlay';
    ov.style.cssText = [
      'position:absolute', 'top:0', 'left:0', 'width:100%', 'height:100%',
      'pointer-events:none', 'opacity:0', 'z-index:999',
      'background:rgba(10,0,0,0)'
    ].join(';');
  
    var wrapper = document.getElementById('canvas-wrapper');
    (wrapper || document.body).appendChild(ov);
  }
 
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  requestAnimationFrame(tick);
}
 
// tick
 
var g_startTime = performance.now() / 1000.0;
var g_seconds   = performance.now() / 1000.0 - g_startTime;
let g_animationOffset = 0;
 
function tick() {
  g_seconds = (performance.now() - g_pausedTime) / 1000.0 - g_startTime;
  handleKeys();
  updateGoat();
  updateAnimationAngles();
  updateTreeAnimation();
  renderAllShapes();
  requestAnimationFrame(tick);
}
 
// ray casting
 
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
    var mapX   = Math.floor(x + 16);
    var mapZ   = Math.floor(z + 16);
    var blockY = Math.floor(y + 0.75);
    if (mapX<0||mapX>=32||mapZ<0||mapZ>=32) continue;
    if (blockY<0||blockY>=8) continue;
    if (g_map[mapX][blockY][mapZ] === 1)
      return { hit:true, mapX, mapY:blockY, mapZ, prevMapX, prevMapY, prevMapZ, worldX:x, worldY:y, worldZ:z };
    prevMapX = mapX; prevMapY = blockY; prevMapZ = mapZ;
  }
 
  if (forward.elements[1] < 0) {
    var t = (-0.75 - g_camera.eye.elements[1]) / forward.elements[1];
    if (t > 0 && t < maxDist) {
      var fx  = g_camera.eye.elements[0] + forward.elements[0] * t;
      var fz  = g_camera.eye.elements[2] + forward.elements[2] * t;
      var fmx = Math.floor(fx + 16);
      var fmz = Math.floor(fz + 16);
      if (fmx>=0&&fmx<32&&fmz>=0&&fmz<32)
        return { hit:false, onFloor:true, mapX:fmx, mapY:0, mapZ:fmz };
    }
  }
  return { hit:false, onFloor:false };
}
 
function drawHighlight(result) {
  if (!result) return;
  if (g_gameMode !== 'creative') return;
  var wx, wz;
  if (result.hit)          { wx = result.mapX - 16; wz = result.mapZ - 16; }
  else if (result.onFloor) { wx = result.mapX - 16; wz = result.mapZ - 16; }
  else return;
 
  if (!g_highlightCube) g_highlightCube = new cornerCube();
  g_highlightCube.textureNum = -2;
  g_highlightCube.color = [.5,.5,0,0.25];
  g_highlightCube.tint  = [1,1,1,1];
  g_highlightCube.matrix.setTranslate(wx, -0.75 + result.mapY, wz);
  g_highlightCube.matrix.scale(1.01, 1.01, 1.01);
  g_highlightCube.matrix.translate(-0.005, -0.005, -0.005);
 
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  g_highlightCube.renderFaster();
  gl.depthMask(true);
}
 
// render
 
function renderAllShapes() {
  var startTime = performance.now();
 
  if (!g_globalRotMat) g_globalRotMat = new Matrix4();
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, g_globalRotMat.elements);
 
  if (!g_projMat) {
    g_projMat = new Matrix4();
    g_projMat.setPerspective(60, canvas.width / canvas.height, 0.1, 100);
  }
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_projMat.elements);
 
  var viewMat = new Matrix4();
  viewMat.setLookAt(
    g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
    g_camera.at.elements[0],  g_camera.at.elements[1],  g_camera.at.elements[2],
    g_camera.up.elements[0],  g_camera.up.elements[1],  g_camera.up.elements[2]
  );
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);
 
  g_rayResult = castRay();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Flashlight
  if (g_flashlight) {
    var forward = g_camera.at.sub(g_camera.eye).normalized();
    gl.uniform1i(u_flashlight, 1);
    gl.uniform3f(u_FlashPos,
      g_camera.eye.elements[0],
      g_camera.eye.elements[1],
      g_camera.eye.elements[2]);
    gl.uniform3f(u_FlashDir,
      forward.elements[0],
      forward.elements[1],
      forward.elements[2]);
    gl.uniform1f(u_FlashCutoff, Math.cos(0.25));  // inner cone
    gl.uniform1f(u_FlashOuter,  Math.cos(0.35));  //outer cone
  } else {
    gl.uniform1i(u_flashlight, 0);
  }
 
  // Floor
  if (!g_floorCube) {
    g_floorCube = new cornerCube();
    g_floorCube.color = [1.0,0.0,0.0,1.0];
    g_floorCube.tint  = [.03,.025,0,1];
    g_floorCube.textureNum = 1;
    g_floorCube.uvScale = 100;
    g_floorCube.matrix.translate(0,-.75,0);
    g_floorCube.matrix.scale(50,0.0001,50);
    g_floorCube.matrix.translate(-.5,0,-.5);
  }
  g_floorCube.renderFaster();
 
  // Sky
  var sky = new Sphere();
  sky.textureNum = 0;
  sky.tint = [0.2,0.0,0.0,1.0];
  sky.matrix.translate(g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2]);
  sky.matrix.scale(45,45,45);
  gl.depthMask(false);
  sky.render();
  gl.depthMask(true);
 
  drawMap();
 
  drawGoat(g_goatX, 0.25, g_goatZ, [.2,.2,.2,1]);
 
  for (var ti = 0; ti < TREE_DEFS.length; ti++) {
    var td = TREE_DEFS[ti];
    drawTree(td[0], -0.75, td[1], [.2,.2,.2,1], TREE_SCALES[ti], td[2]);
  }
 
  // Pages survival only, handled inside drawPages
  var hoveredPageIdx = -1;
  if (g_gameMode === 'survival' && !g_jumpscare) {
    hoveredPageIdx = castRayToPages();
    var hintEl = document.getElementById('pickup-hint');
    if (hoveredPageIdx !== -1 && distToPage(hoveredPageIdx) <= PAGE_PICKUP_DIST) {
      hintEl.style.display = 'block';
    } else {
      hintEl.style.display = 'none';
    }
  } else {
    var hintEl = document.getElementById('pickup-hint');
    if (hintEl) hintEl.style.display = 'none';
  }
 
  drawPages(hoveredPageIdx);
 
  // Slenderman jumpscare 
  drawSlenderman();
 
  // Block highlight
  if (!g_jumpscare) drawHighlight(g_rayResult);
 

 

 
  var duration = performance.now() - startTime;
  g_fpsBuffer.push(1000 / duration);
  if (g_fpsBuffer.length > g_fpsBufferSize) g_fpsBuffer.shift();
  var avgFps = g_fpsBuffer.reduce((a,b)=>a+b,0) / g_fpsBuffer.length;
  sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(avgFps), "numdot");
}
 
function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) { console.log("Failed to get " + htmlID + " from HTML"); return; }
  htmlElm.innerHTML = text;
}