// asg4.js — Lighting

// ─── Shaders ────────────────────────────────────────────────────────────────

var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4  a_Position;
  attribute vec2  a_UV;
  attribute vec3  a_Normal;
  attribute float a_Shade;
  varying vec2  v_UV;
  varying float v_Shade;
  varying vec3  v_NormalDir;
  varying vec3  v_WorldPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  void main() {
    vec4 worldPos4 = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_WorldPos  = worldPos4.xyz;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos4;
    v_UV    = a_UV;
    v_Shade = a_Shade;
    mat3 normalMat = mat3(u_GlobalRotateMatrix) * mat3(u_ModelMatrix);
    v_NormalDir = normalize(normalMat * a_Normal);
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2  v_UV;
  varying float v_Shade;
  varying vec3  v_NormalDir;
  varying vec3  v_WorldPos;

  uniform vec4 u_FragColor;
  uniform vec4 u_TintColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform int  u_whichTexture;

  uniform int  u_lightOn;
  uniform vec3 u_LightPos;
  uniform vec3 u_LightColor;
  uniform vec3 u_CameraPos;

  uniform int   u_spotOn;
  uniform vec3  u_SpotPos;
  uniform vec3  u_SpotDir;
  uniform float u_SpotCutoff;
  uniform float u_SpotOuter;
  uniform vec3  u_SpotColor;

  vec3 phong(vec3 baseRGB, vec3 lightColor, vec3 N, vec3 L, vec3 V) {
    float ka = 0.2;
    float kd = 0.8;
    float ks = 0.5;
    float sh = 32.0;
    vec3  R  = reflect(-L, N);
    float d  = max(dot(N, L), 0.0);
    float s  = pow(max(dot(V, R), 0.0), sh);
    return ka * lightColor * baseRGB
         + kd * d * lightColor * baseRGB
         + ks * s * lightColor;
  }

  void main() {
    vec4 base;
    if      (u_whichTexture == -3) base = vec4((v_NormalDir + 1.0) / 2.0, 1.0);
    else if (u_whichTexture == -2) base = u_FragColor;
    else if (u_whichTexture == -1) base = vec4(v_UV, 1.0, 1.0);
    else if (u_whichTexture ==  0) base = texture2D(u_Sampler0, v_UV) * u_TintColor;
    else if (u_whichTexture ==  1) base = texture2D(u_Sampler1, v_UV) * u_TintColor;
    else if (u_whichTexture ==  2) base = texture2D(u_Sampler2, v_UV) * u_TintColor;
    else                           base = vec4(1.0, 0.2, 0.2, 1.0);

    if (u_lightOn == 0 || u_whichTexture == -3) {
      gl_FragColor = vec4(base.rgb * v_Shade, base.a);
      return;
    }

    vec3 N = normalize(v_NormalDir);
    vec3 V = normalize(u_CameraPos - v_WorldPos);
    vec3 L_pt = normalize(u_LightPos - v_WorldPos);
    vec3 result = phong(base.rgb, u_LightColor, N, L_pt, V);

    if (u_spotOn == 1) {
      vec3  L_sp     = normalize(u_SpotPos - v_WorldPos);
      vec3  aimDir   = normalize(-u_SpotDir);
      float cosTheta = dot(aimDir, L_sp);
      float intensity = smoothstep(u_SpotOuter, u_SpotCutoff, cosTheta);
      if (intensity > 0.0) {
        vec3  R_sp = reflect(-L_sp, N);
        float d_sp = max(dot(N, L_sp), 0.0);
        float s_sp = pow(max(dot(V, R_sp), 0.0), 32.0);
        result += intensity * (0.8 * d_sp * u_SpotColor * base.rgb
                             + 0.5 * s_sp * u_SpotColor);
      }
    }

    gl_FragColor = vec4(result, base.a);
  }`;

// ─── Globals ─────────────────────────────────────────────────────────────────

var canvas, gl;

var a_Position, a_UV, a_Normal, a_Shade;
var u_FragColor, u_TintColor;
var u_ModelMatrix, u_GlobalRotateMatrix, u_ViewMatrix, u_ProjectionMatrix;
var u_Sampler, u_Sampler1, u_Sampler2;
var u_whichTexture;
var u_LightPos, u_CameraPos, u_LightColor, u_lightOn;
var u_spotOn, u_SpotPos, u_SpotDir, u_SpotCutoff, u_SpotOuter, u_SpotColor;

var g_camera;
var g_keys       = {};
var g_mouseDown  = false;
var g_lastMouseX = 0, g_lastMouseY = 0;

var g_floorCube    = null;
var g_projMat      = null;
var g_globalRotMat = null;

var g_fpsBuffer = [], FPS_SAMPLES = 30;
var g_startTime = performance.now() / 1000.0;
var g_seconds   = 0;

var g_normalOn = false;
var g_lightOn  = true;
var g_spotOn   = false;

var g_lightPos    = [2.0, 3.0, 2.0];
var g_lightColor  = [1.0, 1.0, 1.0];
var g_lightAnimOn = true;

var g_spotPos    = [0.0, 6.0, 0.0];
var g_spotDir    = [0.0, -1.0, 0.0];
var g_spotColor  = [1.0, 0.85, 0.4];
var g_spotCutoff = Math.cos(18 * Math.PI / 180);
var g_spotOuter  = Math.cos(28 * Math.PI / 180);

// Goat animation globals (used by goat.js)
var g_jawAngle=0, g_bodyAngle=0, g_neckAngle=0;
var g_leg1Angle=0, g_leg2Angle=0, g_leg3Angle=0, g_leg4Angle=0;
var g_beard1Angle=0, g_beard2Angle=0;
var g_tail1Angle=0, g_tail2Angle=0, g_tail3Angle=0;

var SPAWN_EYE = [0, 2, 8];
var SPAWN_AT  = [0, 0, 0];

var g_sphere    = null;
var g_lightCube = null;
var g_objModel  = null;

var g_texturesLoaded = 0;
var TEXTURES_TOTAL   = 3;

// ─── UI helpers ──────────────────────────────────────────────────────────────

function setNormalOn() {
  g_normalOn = true;
  document.getElementById('btnNormalOn') .classList.add   ('active');
  document.getElementById('btnNormalOff').classList.remove('active');
}
function setNormalOff() {
  g_normalOn = false;
  document.getElementById('btnNormalOff').classList.add   ('active');
  document.getElementById('btnNormalOn') .classList.remove('active');
}
function setLightOn() {
  g_lightOn = true;
  document.getElementById('btnLightOn') .classList.add   ('active');
  document.getElementById('btnLightOff').classList.remove('active');
}
function setLightOff() {
  g_lightOn = false;
  document.getElementById('btnLightOff').classList.add   ('active');
  document.getElementById('btnLightOn') .classList.remove('active');
}
function setSpotOn() {
  g_spotOn = true;
  document.getElementById('btnSpotOn') .classList.add   ('active');
  document.getElementById('btnSpotOff').classList.remove('active');
}
function setSpotOff() {
  g_spotOn = false;
  document.getElementById('btnSpotOff').classList.add   ('active');
  document.getElementById('btnSpotOn') .classList.remove('active');
}
function toggleLightAnim() {
  g_lightAnimOn = !g_lightAnimOn;
  var btn = document.getElementById('btnLightAnim');
  btn.textContent = 'Animate: ' + (g_lightAnimOn ? 'On' : 'Off');
  btn.classList.toggle('active', g_lightAnimOn);
}

function updateLightSliderX(v) { g_lightPos[0] = parseFloat(v); }
function updateLightSliderY(v) { g_lightPos[1] = parseFloat(v); }
function updateLightSliderZ(v) { g_lightPos[2] = parseFloat(v); }

function updateLightR(v) { g_lightColor[0] = parseFloat(v); }
function updateLightG(v) { g_lightColor[1] = parseFloat(v); }
function updateLightB(v) { g_lightColor[2] = parseFloat(v); }

// ─── WebGL setup ─────────────────────────────────────────────────────────────

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: true });
  if (!gl) { console.error('WebGL not available'); return; }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error('Shader init failed'); return;
  }
  a_Position           = gl.getAttribLocation (gl.program, 'a_Position');
  a_UV                 = gl.getAttribLocation (gl.program, 'a_UV');
  a_Normal             = gl.getAttribLocation (gl.program, 'a_Normal');
  a_Shade              = gl.getAttribLocation (gl.program, 'a_Shade');
  u_FragColor          = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_TintColor          = gl.getUniformLocation(gl.program, 'u_TintColor');
  u_ModelMatrix        = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  u_ViewMatrix         = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix   = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_Sampler            = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1           = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2           = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_whichTexture       = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_LightPos           = gl.getUniformLocation(gl.program, 'u_LightPos');
  u_CameraPos          = gl.getUniformLocation(gl.program, 'u_CameraPos');
  u_LightColor         = gl.getUniformLocation(gl.program, 'u_LightColor');
  u_lightOn            = gl.getUniformLocation(gl.program, 'u_lightOn');
  u_spotOn             = gl.getUniformLocation(gl.program, 'u_spotOn');
  u_SpotPos            = gl.getUniformLocation(gl.program, 'u_SpotPos');
  u_SpotDir            = gl.getUniformLocation(gl.program, 'u_SpotDir');
  u_SpotCutoff         = gl.getUniformLocation(gl.program, 'u_SpotCutoff');
  u_SpotOuter          = gl.getUniformLocation(gl.program, 'u_SpotOuter');
  u_SpotColor          = gl.getUniformLocation(gl.program, 'u_SpotColor');
}

function setDefaultShade() {
  gl.disableVertexAttribArray(a_Shade);
  gl.vertexAttrib1f(a_Shade, 1.0);
}

// ─── Textures ────────────────────────────────────────────────────────────────

function initTextures() {
  var img0 = new Image();
  img0.onload = function() { loadTex(img0, gl.TEXTURE0, u_Sampler, 0); g_texturesLoaded++; };
  img0.src = '../textures/sky.jpg';

  var img1 = new Image();
  img1.onload = function() { loadTex(img1, gl.TEXTURE1, u_Sampler1, 1); g_texturesLoaded++; };
  img1.src = '../textures/forestfloordark.jpg';

  var img2 = new Image();
  img2.onload = function() { loadTex(img2, gl.TEXTURE2, u_Sampler2, 2); g_texturesLoaded++; };
  img2.src = '../textures/mcdirt.jpg';
}

function loadTex(image, texUnit, sampler, unit) {
  var tex = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(texUnit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.uniform1i(sampler, unit);
}

// ─── Input ───────────────────────────────────────────────────────────────────

function addActionsFromHtmlUI() {
  document.onkeydown = function(ev) {
    var key = ev.key.toLowerCase();
    if (ev.ctrlKey && ['w','t','r','n'].includes(key)) ev.preventDefault();
    if ([' ','w','a','s','d'].includes(key)) ev.preventDefault();
    g_keys[key] = true;
    if ((key === 'f11') || (key === 'enter' && ev.altKey)) toggleFullscreen();
  };
  document.onkeyup = function(ev) { g_keys[ev.key.toLowerCase()] = false; };
  window.onblur    = function()   { g_keys = {}; };

  document.addEventListener('pointerlockchange', function() {
    g_keys = {};
    if (document.pointerLockElement === canvas) {
      var skip = 3;
      document.onmousemove = function(ev) {
        if (skip > 0) { skip--; return; }
        var dx = Math.max(-50, Math.min(50, ev.movementX));
        var dy = Math.max(-50, Math.min(50, ev.movementY));
        g_camera.panLeft(-dx * 0.2);
        g_camera.panUp  (-dy * 0.2);
      };
    } else {
      document.onmousemove = null;
    }
  });

  canvas.addEventListener('mousedown', function(ev) {
    if (document.pointerLockElement !== canvas) { canvas.requestPointerLock(); return; }
    g_mouseDown  = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  });
  canvas.addEventListener('mouseup',   function() { g_mouseDown = false; });
  canvas.addEventListener('mousemove', function(ev) {
    if (!g_mouseDown || document.pointerLockElement === canvas) return;
    var dx = ev.clientX - g_lastMouseX;
    var dy = ev.clientY - g_lastMouseY;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    g_camera.panLeft(-dx * 0.3);
    g_camera.panUp  (-dy * 0.3);
  });
  canvas.addEventListener('contextmenu', function(ev) { ev.preventDefault(); });
}

function handleKeys() {
  var speed = g_keys['shift'] ? g_camera.speed * 1.8 : g_camera.speed;
  if (g_keys['w'])       g_camera.moveForward (speed);
  if (g_keys['s'])       g_camera.moveBackward(speed);
  if (g_keys['a'])       g_camera.moveLeft    (speed);
  if (g_keys['d'])       g_camera.moveRight   (speed);
  if (g_keys[' '])       g_camera.moveUp      (speed);
  if (g_keys['control']) g_camera.moveDown    (speed);
  if (g_keys['q'])       g_camera.panLeft     (g_camera.panSpeed);
}

// ─── Scene ───────────────────────────────────────────────────────────────────

function buildScene() {
  g_sphere = new Sphere();
  g_sphere.color      = [1, 1, 1, 1];
  g_sphere.tint       = [1, 1, 1, 1];
  g_sphere.textureNum = -2;

  g_lightCube = new Cube();
  g_lightCube.color      = [1, 1, 0, 1];
  g_lightCube.tint       = [1, 1, 1, 1];
  g_lightCube.textureNum = -2;

  // ── OBJ model ─────────────────────────────────────────────────────────────
  // Drop any .obj file into a "models/" folder next to your HTML, then set
  // the path here. The loader handles v/vt/vn and n-gon faces automatically.
  // If the file has no normals, flat normals are computed per triangle.
  g_objModel = new OBJModel();
  g_objModel.color      = [0.8, 0.75, 0.65, 1];
  g_objModel.tint       = [1,   1,    1,    1];
  g_objModel.textureNum = -2;
  g_objModel.load('../objs/teapot.obj', function(m) {
    console.log('[OBJ] ready —', m._count, 'vertices');
  });
}

// ─── Light animation ─────────────────────────────────────────────────────────

function updateLight() {
  if (!g_lightAnimOn) return;
  var r = 4.0;
  g_lightPos[0] = r * Math.cos(g_seconds * 0.8);
  g_lightPos[2] = r * Math.sin(g_seconds * 0.8);
  var sx = document.getElementById('sliderLX');
  var sz = document.getElementById('sliderLZ');
  if (sx) sx.value = g_lightPos[0];
  if (sz) sz.value = g_lightPos[2];
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function _uploadLightUniforms() {
  gl.uniform3fv(u_LightPos,   g_lightPos);
  gl.uniform3fv(u_LightColor, g_lightColor);
  gl.uniform3f (u_CameraPos,
    g_camera.eye.elements[0],
    g_camera.eye.elements[1],
    g_camera.eye.elements[2]);
  gl.uniform1i(u_lightOn, g_lightOn ? 1 : 0);
  gl.uniform1i  (u_spotOn,     g_spotOn ? 1 : 0);
  gl.uniform3fv (u_SpotPos,    g_spotPos);
  gl.uniform3fv (u_SpotDir,    g_spotDir);
  gl.uniform1f  (u_SpotCutoff, g_spotCutoff);
  gl.uniform1f  (u_SpotOuter,  g_spotOuter);
  gl.uniform3fv (u_SpotColor,  g_spotColor);
}

function _lightsOff()     { gl.uniform1i(u_lightOn, 0); gl.uniform1i(u_spotOn, 0); }
function _lightsRestore() {
  gl.uniform1i(u_lightOn, g_lightOn ? 1 : 0);
  gl.uniform1i(u_spotOn,  g_spotOn  ? 1 : 0);
}

// ─── Render ──────────────────────────────────────────────────────────────────

function renderAllShapes() {
  var t0 = performance.now();

  if (!g_globalRotMat) g_globalRotMat = new Matrix4();
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, g_globalRotMat.elements);

  var aspect = canvas.width / canvas.height;
  if (!g_projMat || Math.abs(g_projMat._aspect - aspect) > 0.001) {
    g_projMat = new Matrix4();
    g_projMat.setPerspective(60, aspect, 0.5, 200);
    g_projMat._aspect = aspect;
  }
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_projMat.elements);

  var viewMat = new Matrix4();
  viewMat.setLookAt(
    g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
    g_camera.at .elements[0], g_camera.at .elements[1], g_camera.at .elements[2],
    g_camera.up .elements[0], g_camera.up .elements[1], g_camera.up .elements[2]
  );
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  _uploadLightUniforms();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // ── Sky — never illuminated by the point light ────────────────────────────
  _lightsOff();
  var sky = new Sphere();
  sky.textureNum = g_normalOn ? -3 : 0;
  sky.tint = [1.4, 1.4, 1.6, 1.0];
  sky.matrix.translate(
    g_camera.eye.elements[0],
    g_camera.eye.elements[1],
    g_camera.eye.elements[2]);
  sky.matrix.scale(80, 80, 80);
  gl.depthMask(false);
  sky.render();
  gl.depthMask(true);
  _lightsRestore();

  // ── Floor ─────────────────────────────────────────────────────────────────
  if (!g_floorCube) {
    g_floorCube = new cornerCube();
    g_floorCube.color   = [1, 1, 1, 1];
    g_floorCube.tint    = [1.1, 1.05, 0.9, 1];
    g_floorCube.uvScale = 100;
    g_floorCube.matrix.translate(0, -1.3, 0);
    g_floorCube.matrix.scale(200, 0.5, 200);
    g_floorCube.matrix.translate(-0.5, 0, -0.5);
  }
  g_floorCube.textureNum = g_normalOn ? -3 : 1;
  g_floorCube.renderFaster();

  // ── Sphere ────────────────────────────────────────────────────────────────
  g_sphere.textureNum = g_normalOn ? -3 : -2;
  g_sphere.matrix = new Matrix4();
  g_sphere.matrix.translate(0, 0.5, 0);
  g_sphere.matrix.scale(0.7, 0.7, 0.7);
  g_sphere.render();

  // ── OBJ model ─────────────────────────────────────────────────────────────
  // Placed to the left of the sphere.  Adjust scale/translate to fit your model.
  // The teapot from the lab pack is ~3 units tall; 0.5 scale puts it at ~1.5 u.
  if (g_objModel) {
    g_objModel.textureNum = g_normalOn ? -3 : -2;
    g_objModel.matrix = new Matrix4();
    g_objModel.matrix.translate(-3, -0.8, -3);
    g_objModel.matrix.scale(0.5, 0.5, 0.5);
    g_objModel.render();
  }

  // ── Goat ─────────────────────────────────────────────────────────────────
  updateAnimationAngles();
  drawGoat(g_goatX, 0.3, g_goatZ, [1, 1, 1, 1], 1.6, 0);

  // ── Light marker (always bright, lighting off) ────────────────────────────
  _lightsOff();
  g_lightCube.color = [g_lightColor[0], g_lightColor[1], g_lightColor[2], 1.0];
  g_lightCube.textureNum = g_normalOn ? -3 : -2;   // ← add this line
  g_lightCube.matrix = new Matrix4();
  g_lightCube.matrix.translate(
    g_lightPos[0] - 0.1, g_lightPos[1] - 0.1, g_lightPos[2] - 0.1);
  g_lightCube.matrix.scale(0.2, 0.2, 0.2);
  g_lightCube.renderFaster();
  _lightsRestore();

  // ── FPS ───────────────────────────────────────────────────────────────────
  var dur = performance.now() - t0;
  g_fpsBuffer.push(1000 / dur);
  if (g_fpsBuffer.length > FPS_SAMPLES) g_fpsBuffer.shift();
  var avg = g_fpsBuffer.reduce(function(a,b){return a+b;},0) / g_fpsBuffer.length;
  var el = document.getElementById('numdot');
  if (el) el.innerHTML = 'ms: ' + Math.floor(dur) + ' &nbsp; fps: ' + Math.floor(avg);
}

// ─── Loop ────────────────────────────────────────────────────────────────────

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  handleKeys();
  updateLight();
  updateGoat();
  if (g_texturesLoaded >= TEXTURES_TOTAL) {
    renderAllShapes();
  }
  requestAnimationFrame(tick);
}

// ─── Entry ───────────────────────────────────────────────────────────────────

function main() {
  g_camera          = new Camera();
  g_camera.eye      = new Vector3(SPAWN_EYE);
  g_camera.at       = new Vector3(SPAWN_AT);
  g_camera.up       = new Vector3([0, 1, 0]);
  g_camera.speed    = 0.05;
  g_camera.panSpeed = 1.5;

  setupWebGL();
  connectVariablesToGLSL();
  addActionsFromHtmlUI();
  initTextures();
  buildScene();

  gl.clearColor(0.53, 0.81, 0.98, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  requestAnimationFrame(tick);
}