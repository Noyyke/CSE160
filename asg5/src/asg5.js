// ============================================================
//  asg5.js  —  Neon Rhythm  (Three.js r184)
//  Cyberpunk world + DDR/Beat-Saber style rhythm game
//
//  SETUP: Place your model.glb in a `models/` folder.
//  See README.md for the free CC0 car model download link.
//  All textures are procedurally generated — no image files needed.
// ============================================================

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const LANE_COUNT   = 4;
const LANE_KEYS    = ['a','s','w','d'];          // left, down, up, right
const LANE_COLORS  = [0x00ffff, 0xff00aa, 0x00ff88, 0xffcc00];
const LANE_LABELS  = ['◄','▼','▲','►'];
const LANE_X       = [-1.5, -0.5, 0.5, 1.5];    // X positions in game lane
const HIGHWAY_LEN  = 40;                          // how far arrows spawn from camera
const HIT_Z        = 0;                           // target zone z (camera-relative)
const HIT_WINDOW   = 0.18;                        // ±seconds for a hit
const PERFECT_WIN  = 0.07;
const ARROW_SPEED  = 14;                          // units/sec (travel time ~2.8s)
const TRAVEL_TIME  = HIGHWAY_LEN / ARROW_SPEED;
const BPM_DEFAULT  = 128;
const PROXIMITY_R  = 7;                           // metres to trigger game prompt

// ─────────────────────────────────────────────
//  Renderer / Scene / Camera
// ─────────────────────────────────────────────
const canvas   = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(960, 540);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

const scene  = new THREE.Scene();
scene.fog    = new THREE.FogExp2(0x080010, 0.018);

const camera = new THREE.PerspectiveCamera(70, 16/9, 0.1, 500);
camera.position.set(0, 1.7, 20);

// ─────────────────────────────────────────────
//  Texture / Asset Loader helpers
// ─────────────────────────────────────────────
const texLoader  = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

function makeColorTex(hex, w=2, h=2) {
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#' + hex.toString(16).padStart(6,'0');
  ctx.fillRect(0,0,w,h);
  return new THREE.CanvasTexture(c);
}

// Procedural grid texture for dance floor
function makeGridTex(size=512, lines=16, bg=0x110022, line=0x00ffff) {
  const c = document.createElement('canvas'); c.width=size; c.height=size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#' + bg.toString(16).padStart(6,'0');
  ctx.fillRect(0,0,size,size);
  ctx.strokeStyle = '#' + line.toString(16).padStart(6,'0');
  ctx.lineWidth = 1.5;
  const step = size / lines;
  for (let i=0; i<=lines; i++) {
    ctx.beginPath(); ctx.moveTo(i*step,0); ctx.lineTo(i*step,size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i*step); ctx.lineTo(size,i*step); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4,4);
  return t;
}

// Procedural neon sign texture
function makeNeonTex(text, fg='#ff00cc', bg='#110011', size=256) {
  const c = document.createElement('canvas'); c.width=size; c.height=Math.floor(size/3);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0,0,c.width,c.height);
  ctx.font = `bold ${Math.floor(c.height*0.7)}px monospace`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor=fg; ctx.shadowBlur=18;
  ctx.fillStyle=fg;
  ctx.fillText(text, c.width/2, c.height/2);
  return new THREE.CanvasTexture(c);
}

// Arrow shape (extruded)
function makeArrowShape() {
  const s = new THREE.Shape();
  // Pointing +Y
  s.moveTo( 0,    0.5);
  s.lineTo( 0.35, 0.05);
  s.lineTo( 0.15, 0.05);
  s.lineTo( 0.15,-0.5);
  s.lineTo(-0.15,-0.5);
  s.lineTo(-0.15, 0.05);
  s.lineTo(-0.35, 0.05);
  s.closePath();
  return s;
}

// ─────────────────────────────────────────────
//  Skybox — procedural dark cyberpunk gradient
// ─────────────────────────────────────────────
function buildSkybox() {
  // Use a large sphere with a gradient shader as fake sky
  const skyGeo = new THREE.SphereGeometry(300, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor:    { value: new THREE.Color(0x000510) },
      bottomColor: { value: new THREE.Color(0x1a0030) },
      midColor:    { value: new THREE.Color(0x050025) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main(){
        vWorldPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 midColor;
      varying vec3 vWorldPos;
      void main(){
        float t = clamp((vWorldPos.y + 100.0)/200.0, 0.0, 1.0);
        vec3 col = mix(bottomColor, midColor, smoothstep(0.0,0.3,t));
        col = mix(col, topColor, smoothstep(0.3,1.0,t));
        gl_FragColor = vec4(col,1.0);
      }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(2000*3);
  for (let i=0; i<2000; i++) {
    const theta = Math.random()*Math.PI*2;
    const phi   = Math.acos(2*Math.random()-1);
    const r     = 280;
    starPos[i*3]   = r*Math.sin(phi)*Math.cos(theta);
    starPos[i*3+1] = r*Math.abs(Math.cos(phi));   // upper half
    starPos[i*3+2] = r*Math.sin(phi)*Math.sin(theta);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos,3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({color:0xffffff,size:0.8,sizeAttenuation:true})));
}

// ─────────────────────────────────────────────
//  Lights
// ─────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x110033, 0.6);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x0a0020, 0x220044, 0.5);
scene.add(hemiLight);

const moonLight = new THREE.DirectionalLight(0x8899ff, 0.4);
moonLight.position.set(30, 80, 20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048,2048);
moonLight.shadow.camera.near = 1;
moonLight.shadow.camera.far  = 300;
moonLight.shadow.camera.left = moonLight.shadow.camera.bottom = -80;
moonLight.shadow.camera.right= moonLight.shadow.camera.top   =  80;
scene.add(moonLight);

// Dance floor spotlight (added later when floor is built)
let floorSpot = null;

// ─────────────────────────────────────────────
//  Ground
// ─────────────────────────────────────────────
const groundTex = makeGridTex(512,32,0x050010,0x220044);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400,400),
  new THREE.MeshStandardMaterial({ map:groundTex, roughness:0.85, metalness:0.1 })
);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

// ─────────────────────────────────────────────
//  City Builder
// ─────────────────────────────────────────────
const cityGroup = new THREE.Group();
scene.add(cityGroup);

const buildingMats = [
  new THREE.MeshStandardMaterial({color:0x0a0a1a, roughness:0.9, metalness:0.2}),
  new THREE.MeshStandardMaterial({color:0x0d0d22, roughness:0.8, metalness:0.3}),
  new THREE.MeshStandardMaterial({color:0x080818, roughness:0.95, metalness:0.1}),
];

// Window texture for buildings
function makeWindowTex() {
  const c=document.createElement('canvas'); c.width=128; c.height=256;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#05050f'; ctx.fillRect(0,0,128,256);
  const cols=['#00eeff','#ff00cc','#ffcc00','#00ff88','#ffffff'];
  for(let row=0;row<16;row++) for(let col=0;col<4;col++) {
    if(Math.random()>0.35) {
      ctx.fillStyle = cols[Math.floor(Math.random()*cols.length)];
      ctx.globalAlpha = 0.4+Math.random()*0.6;
      ctx.fillRect(col*32+4, row*16+3, 24, 10);
    }
  }
  ctx.globalAlpha=1;
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}

function buildCity() {
  const rng = mulberry32(42);
  const rings = [
    { count:12, minR:30, maxR:50, hMin:8,  hMax:30 },
    { count:20, minR:50, maxR:90, hMin:15, hMax:60 },
    { count:18, minR:90, maxR:140,hMin:5,  hMax:20 },
  ];

  rings.forEach(ring => {
    for(let i=0;i<ring.count;i++) {
      const angle = (i/ring.count)*Math.PI*2 + rng()*0.4;
      const dist  = ring.minR + rng()*(ring.maxR-ring.minR);
      const x = Math.cos(angle)*dist;
      const z = Math.sin(angle)*dist;
      const w = 3 + rng()*8;
      const d = 3 + rng()*8;
      const h = ring.hMin + rng()*(ring.hMax-ring.hMin);

      // Main tower
      const geo  = new THREE.BoxGeometry(w,h,d);
      const winT = makeWindowTex();
      winT.repeat.set(Math.ceil(w/4), Math.ceil(h/4));
      const mat  = new THREE.MeshStandardMaterial({
        map: winT,
        roughness:0.7, metalness:0.4,
        emissiveMap: winT,
        emissive: new THREE.Color(0x111122),
        emissiveIntensity: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, h/2, z);
      mesh.castShadow = mesh.receiveShadow = true;
      cityGroup.add(mesh);

      // Rooftop neon sign (PlaneGeometry — counts as shape type)
      if(rng()>0.5) {
        const signs = ['NEON','CYBER','SYNTH','WAVE','GRID','PULSE','BASS','RAVE'];
        const signTex = makeNeonTex(signs[Math.floor(rng()*signs.length)]);
        const sw = 3+rng()*2, sh=0.8+rng()*0.5;
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(sw,sh),
          new THREE.MeshStandardMaterial({map:signTex, emissiveMap:signTex, emissive:new THREE.Color(0xffffff), emissiveIntensity:1.5, transparent:true})
        );
        sign.position.set(x, h+0.5+sh/2, z);
        sign.rotation.y = angle;
        cityGroup.add(sign);

        // Neon point light near sign
        const col = LANE_COLORS[Math.floor(rng()*4)];
        const pl = new THREE.PointLight(col, 1.5+rng()*2, 20);
        pl.position.set(x, h+1, z);
        cityGroup.add(pl);
      }

      // Antenna / cylinder on some buildings
      if(rng()>0.65) {
        const ant = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05,0.1,3+rng()*4,8),
          new THREE.MeshStandardMaterial({color:0x333344, metalness:0.8})
        );
        ant.position.set(x+rng()*w*0.3, h+2, z+rng()*d*0.3);
        cityGroup.add(ant);
      }
    }
  });

  // Streetlights along a main avenue
  for(let i=-5;i<=5;i++) {
    const sl = makeStreetlight(i*12, 0, -15);
    cityGroup.add(sl);
    const sr = makeStreetlight(i*12, 0, 15);
    cityGroup.add(sr);
  }
}

function makeStreetlight(x,y,z) {
  const g = new THREE.Group();
  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08,0.12,5,8),
    new THREE.MeshStandardMaterial({color:0x223333,metalness:0.7})
  );
  pole.position.set(x,2.5,z);
  pole.castShadow=true;
  g.add(pole);
  // Arm
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04,0.04,1.5,6),
    new THREE.MeshStandardMaterial({color:0x223333,metalness:0.7})
  );
  arm.rotation.z=Math.PI/2;
  arm.position.set(x+0.75,5,z);
  g.add(arm);
  // Lamp sphere
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.18,8,8),
    new THREE.MeshStandardMaterial({color:0xffffff,emissive:new THREE.Color(0x88ccff),emissiveIntensity:3})
  );
  lamp.position.set(x+1.5,5,z);
  g.add(lamp);
  // Actual light
  const pl = new THREE.PointLight(0x88ccff, 1.2, 18);
  pl.position.set(x+1.5,4.8,z);
  g.add(pl);
  return g;
}

// Simple seeded RNG
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

buildCity();

// ─────────────────────────────────────────────
//  Dance Platform
// ─────────────────────────────────────────────
const FLOOR_POS = new THREE.Vector3(0, 0, 0);

function buildDanceFloor() {
  const floorTex = makeGridTex(512,8,0x0a0020,0x00ffff);

  // Platform base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(12,0.3,20),
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness:0.2, metalness:0.6,
      emissiveMap: floorTex,
      emissive: new THREE.Color(0x002233),
      emissiveIntensity:0.4
    })
  );
  base.position.set(0,0.15,0);
  base.receiveShadow=true;
  scene.add(base);

  // Edge trim strips (CylinderGeometry for variety)
  [-6,6].forEach(xOff => {
    const trim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08,0.08,20,12),
      new THREE.MeshStandardMaterial({color:0x00ffff, emissive:new THREE.Color(0x00ffff), emissiveIntensity:2})
    );
    trim.rotation.x=Math.PI/2;
    trim.position.set(xOff,0.3,0);
    scene.add(trim);
    const el = new THREE.PointLight(0x00ffff,1.5,10);
    el.position.set(xOff,1,0);
    scene.add(el);
  });

  // Target zone platform (raised step)
  const tBase = new THREE.Mesh(
    new THREE.BoxGeometry(8,0.1,3),
    new THREE.MeshStandardMaterial({color:0x110033, roughness:0.3, metalness:0.5})
  );
  tBase.position.set(0,0.25,-8);
  scene.add(tBase);

  // Overhead spotlight
  floorSpot = new THREE.SpotLight(0xffffff,4,50,Math.PI/5,0.3,1);
  floorSpot.position.set(0,20,0);
  floorSpot.target.position.set(0,0,-8);
  floorSpot.castShadow=true;
  scene.add(floorSpot);
  scene.add(floorSpot.target);

  // Additional colored spots
  const spot2 = new THREE.SpotLight(0xff00cc,2,30,Math.PI/6,0.5,1);
  spot2.position.set(-8,15,-5);
  spot2.target.position.set(0,0,-8);
  scene.add(spot2); scene.add(spot2.target);

  const spot3 = new THREE.SpotLight(0x00ffcc,2,30,Math.PI/6,0.5,1);
  spot3.position.set(8,15,-5);
  spot3.target.position.set(0,0,-8);
  scene.add(spot3); scene.add(spot3.target);

  // Decorative pillars (TorusGeometry for shape variety)
  [[-5,-10],[5,-10],[-5,8],[5,8]].forEach(([px,pz])=>{
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2,0.25,6,12),
      new THREE.MeshStandardMaterial({color:0x112233,metalness:0.8,roughness:0.2})
    );
    pillar.position.set(px,3,pz);
    pillar.castShadow=true;
    scene.add(pillar);
    // Torus ring near top
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.4,0.06,8,20),
      new THREE.MeshStandardMaterial({color:0x00ffff,emissive:new THREE.Color(0x00ffff),emissiveIntensity:2})
    );
    ring.position.set(px,5.5,pz);
    scene.add(ring);
  });

  // Sphere orbs floating above corners
  [[-4,4],[-4,-12],[4,4],[4,-12]].forEach(([px,pz],i)=>{
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.25,16,16),
      new THREE.MeshStandardMaterial({
        color:LANE_COLORS[i],
        emissive:new THREE.Color(LANE_COLORS[i]),
        emissiveIntensity:2,
        roughness:0.1,metalness:0.5
      })
    );
    orb.position.set(px,3,pz);
    orbs.push({mesh:orb, baseY:3, phase:i*Math.PI/2});
    scene.add(orb);
    const ol = new THREE.PointLight(LANE_COLORS[i],1,8);
    ol.position.copy(orb.position);
    orbLights.push(ol);
    scene.add(ol);
  });
}

const orbs=[]; const orbLights=[];

// ─────────────────────────────────────────────
//  Target Zones (the 4 receptor pads)
// ─────────────────────────────────────────────
const targetZones=[];
const targetLights=[];

function buildTargetZones() {
  const shape = makeArrowShape();
  const extSettings = { depth:0.08, bevelEnabled:true, bevelThickness:0.02, bevelSize:0.02, bevelSegments:3 };

  const rotations = [Math.PI/2, 0, Math.PI, -Math.PI/2]; // L D U R

  for(let i=0;i<LANE_COUNT;i++) {
    const geo = new THREE.ExtrudeGeometry(shape, extSettings);
    const mat = new THREE.MeshStandardMaterial({
      color: LANE_COLORS[i],
      emissive: new THREE.Color(LANE_COLORS[i]),
      emissiveIntensity: 0.3,
      roughness:0.2, metalness:0.5,
      transparent:true, opacity:0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    geo.center();
    mesh.rotation.z = rotations[i];
    mesh.position.set(LANE_X[i], 0.36, -8);
    scene.add(mesh);

    const pl = new THREE.PointLight(LANE_COLORS[i], 0, 4);
    pl.position.set(LANE_X[i], 0.8, -8);
    scene.add(pl);

    targetZones.push(mesh);
    targetLights.push(pl);
  }
}

// ─────────────────────────────────────────────
//  Arrow Pool
// ─────────────────────────────────────────────
const POOL_SIZE = 60;
const arrowPool = [];
const activeArrows = [];

function buildArrowPool() {
  const shape = makeArrowShape();
  const ext   = { depth:0.12, bevelEnabled:true, bevelThickness:0.03, bevelSize:0.03, bevelSegments:3 };
  const rotations = [Math.PI/2, 0, Math.PI, -Math.PI/2];

  for(let i=0;i<POOL_SIZE;i++) {
    const lane = i % LANE_COUNT;
    const geo  = new THREE.ExtrudeGeometry(shape, ext);
    geo.center();
    const mat = new THREE.MeshStandardMaterial({
      color:    LANE_COLORS[lane],
      emissive: new THREE.Color(LANE_COLORS[lane]),
      emissiveIntensity: 1.5,
      roughness:0.1, metalness:0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.z = rotations[lane];
    mesh.visible = false;
    mesh.castShadow = true;

    // Attach a small glow light
    const pl = new THREE.PointLight(LANE_COLORS[lane], 0, 5);
    mesh.add(pl);
    mesh.userData.light = pl;
    mesh.userData.lane  = lane;

    scene.add(mesh);
    arrowPool.push(mesh);
  }
}

function getPooledArrow(lane) {
  // Find a non-visible arrow of matching lane, or any lane
  for(let a of arrowPool) {
    if(!a.visible && a.userData.lane===lane) {
      a.visible=true; return a;
    }
  }
  // Fallback: any unused
  for(let a of arrowPool) {
    if(!a.visible) {
      // re-skin for new lane
      a.userData.lane = lane;
      a.material.color.setHex(LANE_COLORS[lane]);
      a.material.emissive.setHex(LANE_COLORS[lane]);
      a.userData.light.color.setHex(LANE_COLORS[lane]);
      const rots = [Math.PI/2, 0, Math.PI, -Math.PI/2];
      a.rotation.z = rots[lane];
      a.visible=true; return a;
    }
  }
  return null;
}

function recycleArrow(arrow) {
  arrow.visible=false;
  arrow.userData.light.intensity=0;
  const idx=activeArrows.indexOf(arrow);
  if(idx>=0) activeArrows.splice(idx,1);
}

// ─────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────
const STATES = { EXPLORE:'explore', PROMPT:'prompt', PLAYING:'playing', RESULT:'result' };
let gameState  = STATES.EXPLORE;
let score      = 0;
let combo      = 0;
let maxCombo   = 0;
let perfects   = 0;
let goods      = 0;
let misses     = 0;
let totalNotes = 0;

// Audio
let audioCtx   = null;
let songBuffer = null;
let songSource = null;
let songStartTime=0;
let songTime   = ()=> audioCtx ? audioCtx.currentTime - songStartTime : 0;

// Chart data
let chart       = null;          // { bpm, offset, notes:[{time,lane}] }
let noteIndex   = 0;             // next note to spawn
let gameMode    = 'random';      // 'random' | 'chart'
let bpm         = BPM_DEFAULT;
let beatTimer   = 0;
let beatInterval= 60/bpm;
let randomActive= false;

// Keys held
const keysDown = {};
window.addEventListener('keydown',e=>{ keysDown[e.key.toLowerCase()]=true; });
window.addEventListener('keyup',  e=>{ keysDown[e.key.toLowerCase()]=false; });

// ─────────────────────────────────────────────
//  Pointer Lock / FPS Camera Controls
// ─────────────────────────────────────────────
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(camera);

const vel   = new THREE.Vector3();
const dir   = new THREE.Vector3();
let moveF=false,moveB=false,moveL=false,moveR=false,moveU=false,moveD=false;

// Separate keydown listener for movement (only in EXPLORE/PROMPT)
document.addEventListener('keydown', e=>{
  if(gameState===STATES.PLAYING) return;
  if(e.code==='KeyW'||e.code==='ArrowUp')    moveF=true;
  if(e.code==='KeyS'||e.code==='ArrowDown')  moveB=true;
  if(e.code==='KeyA'||e.code==='ArrowLeft')  moveL=true;
  if(e.code==='KeyD'||e.code==='ArrowRight') moveR=true;
  if(e.code==='Space')   { moveU=true; e.preventDefault(); }
  if(e.code==='ControlLeft'||e.code==='ControlRight') moveD=true;
  if(e.code==='KeyE' && gameState===STATES.PROMPT) enterGame();
  if(e.code==='Escape' && gameState===STATES.RESULT) exitGame();
});
document.addEventListener('keyup', e=>{
  if(e.code==='KeyW'||e.code==='ArrowUp')    moveF=false;
  if(e.code==='KeyS'||e.code==='ArrowDown')  moveB=false;
  if(e.code==='KeyA'||e.code==='ArrowLeft')  moveL=false;
  if(e.code==='KeyD'||e.code==='ArrowRight') moveR=false;
  if(e.code==='Space')   moveU=false;
  if(e.code==='ControlLeft'||e.code==='ControlRight') moveD=false;
});

canvas.addEventListener('click',()=>{
  if(gameState===STATES.EXPLORE||gameState===STATES.PROMPT) controls.lock();
});
controls.addEventListener('unlock',()=>{
  if(gameState===STATES.PLAYING) exitGame();
});

// ─────────────────────────────────────────────
//  HUD (HTML overlay)
// ─────────────────────────────────────────────
const hudEl    = document.getElementById('hud');
const scoreEl  = document.getElementById('hud-score');
const comboEl  = document.getElementById('hud-combo');
const judgeEl  = document.getElementById('hud-judge');
const promptEl = document.getElementById('hud-prompt');
const resultEl = document.getElementById('hud-result');

let judgeTimer = 0;

function showJudge(text, color) {
  judgeEl.textContent = text;
  judgeEl.style.color = color;
  judgeEl.style.opacity = '1';
  judgeEl.style.transform = 'translateX(-50%) scale(1.3)';
  judgeTimer = 0.6;
}

function updateHUD() {
  if(gameState===STATES.PLAYING) {
    scoreEl.textContent = `${score.toString().padStart(7,'0')}`;
    comboEl.textContent = combo>1 ? `${combo}x` : '';
  }
}

// ─────────────────────────────────────────────
//  Game Camera positions
// ─────────────────────────────────────────────
const GAME_CAM_POS = new THREE.Vector3(0, 2.2, 6);
const GAME_CAM_ROT = new THREE.Euler(-0.18, 0, 0);
let exploreCamPos  = new THREE.Vector3();
let exploreCamQuat = new THREE.Quaternion();

function enterGame() {
  if(gameState===STATES.PLAYING) return;
  // Save explore position/rotation
  exploreCamPos.copy(camera.position);
  exploreCamQuat.copy(camera.quaternion);

  controls.unlock();
  gameState = STATES.PLAYING;

  // Snap camera
  camera.position.copy(GAME_CAM_POS);
  camera.rotation.copy(GAME_CAM_ROT);

  // Reset score
  score=0;combo=0;maxCombo=0;perfects=0;goods=0;misses=0;totalNotes=0;noteIndex=0;

  // Init audio context
  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  songStartTime = audioCtx.currentTime;

  // Show game HUD
  hudEl.style.display='block';
  promptEl.style.display='none';
  resultEl.style.display='none';

  // Activate mode
  if(gameMode==='chart' && chart) {
    scheduleChart();
  } else {
    randomActive=true;
    beatTimer=0;
    beatInterval=60/bpm;
  }
}

function exitGame() {
  gameState=STATES.EXPLORE;
  randomActive=false;

  // Stop song if playing
  if(songSource) { try{songSource.stop();}catch(e){} songSource=null; }

  // Recycle all arrows
  [...activeArrows].forEach(a=>recycleArrow(a));

  // Restore camera
  camera.position.copy(exploreCamPos);
  camera.quaternion.copy(exploreCamQuat);

  hudEl.style.display='none';
  promptEl.style.display='none';
  resultEl.style.display='none';
}

function endGame() {
  gameState=STATES.RESULT;
  if(songSource) { try{songSource.stop();}catch(e){} songSource=null; }
  [...activeArrows].forEach(a=>recycleArrow(a));
  randomActive=false;

  // Show result
  resultEl.style.display='flex';
  document.getElementById('res-score-big').textContent = score.toString().padStart(7,'0');
  document.getElementById('res-combo').textContent  = maxCombo;
  document.getElementById('res-perfect').textContent= perfects;
  document.getElementById('res-good').textContent   = goods;
  document.getElementById('res-miss').textContent   = misses;
  let grade='F';
  const acc = totalNotes>0 ? (perfects+goods*0.5)/totalNotes : 0;
  if(acc>=0.95) grade='S'; else if(acc>=0.85) grade='A';
  else if(acc>=0.7) grade='B'; else if(acc>=0.5) grade='C'; else grade='D';
  document.getElementById('res-grade').textContent  = grade;
}

// ─────────────────────────────────────────────
//  Arrow spawning
// ─────────────────────────────────────────────
const SPAWN_Z   =  HIGHWAY_LEN;   // in game-camera-space, arrows start far
const TARGET_Z  = -8;             // world z of target zone
const CAM_Z     = GAME_CAM_POS.z;

function spawnArrow(lane) {
  const arrow = getPooledArrow(lane);
  if(!arrow) return;
  arrow.position.set(LANE_X[lane], 0.5, TARGET_Z - HIGHWAY_LEN);
  arrow.userData.spawnTime  = songTime();
  arrow.userData.targetTime = arrow.userData.spawnTime + TRAVEL_TIME;
  arrow.userData.hit    = false;
  arrow.userData.missed = false;
  arrow.userData.light.intensity = 1.2;
  activeArrows.push(arrow);
  totalNotes++;
}

function scheduleChart() {
  // Play audio
  if(songBuffer && audioCtx) {
    songSource = audioCtx.createBufferSource();
    songSource.buffer = songBuffer;
    songSource.connect(audioCtx.destination);
    songSource.start(0, chart.offset||0);
    songSource.onended = ()=>{ if(gameState===STATES.PLAYING) endGame(); };
    songStartTime = audioCtx.currentTime - (chart.offset||0);
  } else {
    // No audio — schedule by wall clock
    songStartTime = audioCtx ? audioCtx.currentTime : 0;
  }
}

// ─────────────────────────────────────────────
//  Hit detection
// ─────────────────────────────────────────────
const lanePressed = [false,false,false,false];

function handleHitInput(lane) {
  if(gameState!==STATES.PLAYING) return;
  const t = songTime();
  let best=null; let bestDelta=Infinity;

  for(let arrow of activeArrows) {
    if(arrow.userData.lane!==lane || arrow.userData.hit || arrow.userData.missed) continue;
    const delta = Math.abs(t - arrow.userData.targetTime);
    if(delta < bestDelta) { bestDelta=delta; best=arrow; }
  }

  if(!best || bestDelta > HIT_WINDOW) {
    // Ghost press
    flashTarget(lane, 0.3);
    return;
  }

  best.userData.hit=true;
  recycleArrow(best);
  combo++;
  if(combo>maxCombo) maxCombo=combo;

  if(bestDelta<=PERFECT_WIN) {
    score+=300+combo*10;
    perfects++;
    showJudge('PERFECT!','#ffdd00');
    flashTarget(lane, 1.5);
  } else {
    score+=100+combo*5;
    goods++;
    showJudge('GOOD','#00ffcc');
    flashTarget(lane, 0.8);
  }
  updateHUD();
}

function flashTarget(lane, intensity) {
  targetLights[lane].intensity = intensity * 4;
  targetZones[lane].material.emissiveIntensity = intensity * 2;
  setTimeout(()=>{
    targetLights[lane].intensity=0;
    targetZones[lane].material.emissiveIntensity=0.3;
  }, 150);
}

// Key handler for gameplay
document.addEventListener('keydown', e=>{
  if(gameState!==STATES.PLAYING) return;
  const k = e.key.toLowerCase();
  const laneMap = {'a':0,'s':1,'w':2,'d':3};
  if(laneMap[k]!==undefined && !lanePressed[laneMap[k]]) {
    lanePressed[laneMap[k]]=true;
    handleHitInput(laneMap[k]);
  }
  if(e.code==='Escape') { endGame(); }
});
document.addEventListener('keyup', e=>{
  const k=e.key.toLowerCase();
  const laneMap={'a':0,'s':1,'w':2,'d':3};
  if(laneMap[k]!==undefined) lanePressed[laneMap[k]]=false;
});

// ─────────────────────────────────────────────
//  Load a GLB model
// ─────────────────────────────────────────────
// Free model: Neon Cyber Car by Quaternius
// https://quaternius.com/packs/ultimatecars.html
// OR fallback: just place an obvious placeholder
function loadGLBModel() {
  // Try to load from models/model.glb — student places file there
  gltfLoader.load(
    'models/model.glb',
    (gltf)=>{
      const m = gltf.scene;
      m.scale.setScalar(1.5);
      m.position.set(12,0,5);
      m.rotation.y = -Math.PI/4;
      m.traverse(c=>{ if(c.isMesh){c.castShadow=true;c.receiveShadow=true;} });
      scene.add(m);
    },
    undefined,
    ()=>{
      // Fallback: simple futuristic car shape from primitives
      const carGroup = buildFallbackCar();
      carGroup.position.set(12,0,5);
      carGroup.rotation.y=-Math.PI/4;
      scene.add(carGroup);
    }
  );
}

function buildFallbackCar() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.5,0.7,1.5),
    new THREE.MeshStandardMaterial({color:0x110033,metalness:0.9,roughness:0.2,
      emissive:new THREE.Color(0x220044),emissiveIntensity:0.5})
  );
  body.position.y=0.5; g.add(body);
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(2,0.6,1.4),
    new THREE.MeshStandardMaterial({color:0x090018,metalness:0.9,roughness:0.1})
  );
  cab.position.set(-0.2,1.05,0); g.add(cab);
  // Wheels
  [[1.2,0,0.85],[1.2,0,-0.85],[-1.2,0,0.85],[-1.2,0,-0.85]].forEach(([wx,wy,wz])=>{
    const w=new THREE.Mesh(
      new THREE.CylinderGeometry(0.35,0.35,0.25,16),
      new THREE.MeshStandardMaterial({color:0x111111,metalness:0.5})
    );
    w.rotation.x=Math.PI/2; w.position.set(wx,0.35,wz); g.add(w);
  });
  // Neon underline
  const under=new THREE.Mesh(
    new THREE.BoxGeometry(3.6,0.04,1.6),
    new THREE.MeshStandardMaterial({color:0x00ffcc,emissive:new THREE.Color(0x00ffcc),emissiveIntensity:3})
  );
  under.position.y=0.15; g.add(under);
  const ul=new THREE.PointLight(0x00ffcc,2,6); ul.position.y=0.2; g.add(ul);
  return g;
}

// ─────────────────────────────────────────────
//  Additional world objects (reaching 20+ shapes)
// ─────────────────────────────────────────────
function buildWorldExtras() {
  // Floating torus rings above the dance floor
  for(let i=0;i<3;i++) {
    const ring=new THREE.Mesh(
      new THREE.TorusGeometry(1.5+i*0.5, 0.06, 8, 40),
      new THREE.MeshStandardMaterial({
        color:LANE_COLORS[i%4],
        emissive:new THREE.Color(LANE_COLORS[i%4]),
        emissiveIntensity:1.5
      })
    );
    ring.position.set(0, 6+i*1.2, -4);
    ring.rotation.x=Math.PI/2;
    floatingRings.push({mesh:ring, phase:i*Math.PI*0.66});
    scene.add(ring);
  }

  // Holographic octahedron centerpiece
  const octa=new THREE.Mesh(
    new THREE.OctahedronGeometry(0.8,0),
    new THREE.MeshStandardMaterial({
      color:0x00ffff,
      emissive:new THREE.Color(0x00ffff),
      emissiveIntensity:1,
      wireframe:true
    })
  );
  octa.position.set(0,3.5,-4);
  floatingRings.push({mesh:octa, phase:0, isOcta:true});
  scene.add(octa);

  // Ground accent cones
  for(let i=0;i<8;i++) {
    const ang=(i/8)*Math.PI*2;
    const r=8;
    const cone=new THREE.Mesh(
      new THREE.ConeGeometry(0.15,0.6,8),
      new THREE.MeshStandardMaterial({
        color:LANE_COLORS[i%4],
        emissive:new THREE.Color(LANE_COLORS[i%4]),
        emissiveIntensity:1
      })
    );
    cone.position.set(Math.cos(ang)*r,0.3,Math.sin(ang)*r-4);
    scene.add(cone);
  }

  // Speaker boxes flanking the stage
  [[-7,0,-2],[7,0,-2]].forEach(([sx,sy,sz])=>{
    const speaker=new THREE.Mesh(
      new THREE.BoxGeometry(1.5,2.5,1.2),
      new THREE.MeshStandardMaterial({color:0x111111,roughness:0.9})
    );
    speaker.position.set(sx,1.25,sz);
    speaker.castShadow=true;
    scene.add(speaker);
    // Woofer circle
    const woof=new THREE.Mesh(
      new THREE.CircleGeometry(0.5,16),
      new THREE.MeshStandardMaterial({color:0x222222,roughness:0.5,side:THREE.DoubleSide})
    );
    woof.position.set(sx, 1.5, sz+0.61);
    scene.add(woof);
    // Tweeter
    const tweet=new THREE.Mesh(
      new THREE.CircleGeometry(0.15,12),
      new THREE.MeshStandardMaterial({color:0x444444,roughness:0.5,side:THREE.DoubleSide})
    );
    tweet.position.set(sx, 2.4, sz+0.61);
    scene.add(tweet);
  });

  // Disco ball (IcosahedronGeometry)
  const disco=new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.6,1),
    new THREE.MeshStandardMaterial({color:0xcccccc,metalness:1,roughness:0,
      emissive:new THREE.Color(0x111111)})
  );
  disco.position.set(0,8,-8);
  discoRef.mesh=disco;
  scene.add(disco);
  const discoPL=new THREE.PointLight(0xffffff,2,12);
  discoPL.position.copy(disco.position);
  scene.add(discoPL);
  discoRef.light=discoPL;
}

const floatingRings=[];
const discoRef={mesh:null,light:null};

// ─────────────────────────────────────────────
//  Build everything
// ─────────────────────────────────────────────
buildDanceFloor();
buildTargetZones();
buildArrowPool();
buildWorldExtras();
loadGLBModel();

// ─────────────────────────────────────────────
//  Renderer resize handling
// ─────────────────────────────────────────────
function onResize() {
  const w=canvas.clientWidth, h=canvas.clientHeight;
  if(canvas.width!==w||canvas.height!==h) {
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }
}

// ─────────────────────────────────────────────
//  Main Loop
// ─────────────────────────────────────────────
let lastTime=0;
import { Timer } from 'three/addons/misc/Timer.js';
const clock = new Timer();

function animate(now) {
  requestAnimationFrame(animate);
  clock.update();
  const dt = Math.min(clock.getDelta(), 0.1);
  onResize();

  const t = clock.getElapsed();

  // ── Animate world ──────────────────────────
  // Floating orbs
  orbs.forEach((o,i)=>{
    const y = o.baseY + Math.sin(t*1.2+o.phase)*0.3;
    o.mesh.position.y=y;
    orbLights[i].position.copy(o.mesh.position);
  });

  // Floating rings
  floatingRings.forEach(r=>{
    if(r.isOcta) {
      r.mesh.rotation.x+=0.01; r.mesh.rotation.y+=0.007;
      r.mesh.position.y=3.5+Math.sin(t*0.8)*0.2;
    } else {
      r.mesh.rotation.z += 0.005;
      r.mesh.position.y=r.mesh.position.y; // static height
    }
  });

  // Disco ball
  if(discoRef.mesh) {
    discoRef.mesh.rotation.y+=0.01;
    if(gameState===STATES.PLAYING) {
      discoRef.light.intensity=2+Math.sin(t*8)*1.5;
      discoRef.light.color.setHSL((t*0.3)%1, 1, 0.5);
    } else {
      discoRef.light.intensity=1;
    }
  }

  // ── FPS movement (EXPLORE / PROMPT) ────────
  if(controls.isLocked && (gameState===STATES.EXPLORE||gameState===STATES.PROMPT)) {
    const speed=8;
    vel.x -= vel.x*8*dt;
    vel.z -= vel.z*8*dt;
    vel.y -= vel.y*8*dt;
    dir.set(
      (moveR?1:0)-(moveL?1:0),
      (moveU?1:0)-(moveD?1:0),
      (moveB?1:0)-(moveF?1:0)
    ).normalize();
    if(moveF||moveB) vel.z -= dir.z*speed*10*dt;
    if(moveL||moveR) vel.x -= dir.x*speed*10*dt;
    if(moveU||moveD) vel.y += dir.y*speed*6*dt;
    controls.moveRight(-vel.x*dt);
    controls.moveForward(-vel.z*dt);
    camera.position.y=Math.max(1.7, camera.position.y+vel.y*dt);

    // Proximity check
    const pos2D=new THREE.Vector2(camera.position.x, camera.position.z);
    const floor2D=new THREE.Vector2(FLOOR_POS.x, FLOOR_POS.z);
    const dist=pos2D.distanceTo(floor2D);
    if(dist<PROXIMITY_R) {
      gameState=STATES.PROMPT;
      promptEl.style.display='flex';
    } else {
      if(gameState===STATES.PROMPT) gameState=STATES.EXPLORE;
      promptEl.style.display='none';
    }
  }

  // ── Game logic ─────────────────────────────
  if(gameState===STATES.PLAYING) {
    const st=songTime();

    // Spawn arrows (random mode)
    if(randomActive) {
      beatTimer+=dt;
      if(beatTimer>=beatInterval) {
        beatTimer-=beatInterval;
        // Spawn 1–2 arrows per beat
        const count=Math.random()<0.3?2:1;
        const lanes=[];
        while(lanes.length<count) {
          const l=Math.floor(Math.random()*4);
          if(!lanes.includes(l)) lanes.push(l);
        }
        lanes.forEach(l=>spawnArrow(l));
      }
    }

    // Spawn arrows (chart mode)
    if(gameMode==='chart'&&chart) {
      while(noteIndex<chart.notes.length) {
        const note=chart.notes[noteIndex];
        if(note.time - TRAVEL_TIME <= st) {
          spawnArrow(note.lane);
          noteIndex++;
        } else break;
      }
      // Chart finished
      if(noteIndex>=chart.notes.length && activeArrows.length===0) {
        endGame();
      }
    }

    // Advance arrows
    for(let i=activeArrows.length-1;i>=0;i--) {
      const arrow=activeArrows[i];
      const elapsed=st - arrow.userData.spawnTime;
      const progress=elapsed/TRAVEL_TIME;
      arrow.position.z = (TARGET_Z-HIGHWAY_LEN) + progress*HIGHWAY_LEN;
      // Subtle float
      arrow.position.y=0.5+Math.sin(elapsed*3)*0.04;
      // Pulse light
      arrow.userData.light.intensity=0.8+Math.sin(elapsed*10)*0.4;

      // Missed?
      if(!arrow.userData.hit && arrow.position.z > TARGET_Z+1.5) {
        arrow.userData.missed=true;
        misses++;
        combo=0;
        showJudge('MISS','#ff4444');
        updateHUD();
        recycleArrow(arrow);
        i--;
      }
    }

    // Judge timer
    if(judgeTimer>0) {
      judgeTimer-=dt;
      if(judgeTimer<=0) {
        judgeEl.style.opacity='0';
        judgeEl.style.transform='translateX(-50%) scale(1)';
      }
    }

    updateHUD();
  }

  renderer.render(scene, camera);
}

animate();

// ─────────────────────────────────────────────
//  Expose API for HUD buttons
// ─────────────────────────────────────────────
window.NeonRhythm = {
  setMode(mode)  { gameMode=mode; },
  setBPM(val)    { bpm=val; beatInterval=60/bpm; },
  loadChart(c)   { chart=c; gameMode='chart'; },
  loadAudio(buf) { songBuffer=buf; },
  enterGame,
  exitGame,
  endGame,
  getState: ()=>gameState,
};

// Update numdot
setInterval(()=>{
  document.getElementById('numdot').textContent=
    `Active arrows: ${activeArrows.length} | Tris: ${renderer.info.render.triangles}`;
},500);