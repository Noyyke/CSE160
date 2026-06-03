// ============================================================
//  asg5.js  —  Neon Rhythm  (Three.js r184)
//  Cyberpunk world + DDR/Beat-Saber style rhythm game
//
//  SETUP: Place your model.glb in a `models/` folder.
//  All textures are procedurally generated — no image files needed.
// ============================================================

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─────────────────────────────────────────────
//  ★ TUNING — tweak these values to taste
// ─────────────────────────────────────────────
const CFG = {
  // Camera / movement
  mouseSensitivity: 0.55,   // PointerLock speed (0.3 = slow, 1.0 = default)
  moveSpeed:        9,       // exploration walk speed (units / second)

  // World lighting  — multiply any value to brighten / dim that source
  ambientIntensity: 1.2,    // ambient fill light
  hemiIntensity:    0.9,    // sky/ground hemisphere
  moonIntensity:    0.7,    // directional "moonlight"
  floorSpotIntensity: 7,    // spotlight over the dance floor
  cityPointBase:    2.5,    // neon glow on building signs
  streetlampIntensity: 1.8, // street-lamp point lights
};

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const LANE_COUNT   = 4;
const LANE_KEYS    = ['a','s','w','d'];
const LANE_COLORS  = [0x00ffff, 0xff00aa, 0x00ff88, 0xffcc00];
const LANE_LABELS  = ['◄','▼','▲','►'];
const LANE_X       = [-1.5, -0.5, 0.5, 1.5];
const LANE_ROT_Z   = [Math.PI/2, Math.PI, 0, -Math.PI/2];
const HIGHWAY_LEN  = 40;
const TARGET_Z     = -8;
const HIT_Z        = 0;
const HIT_WINDOW   = 0.18;
const PERFECT_WIN  = 0.07;
const APPROACH_BEATS = 2.5;
const BPM_REF        = 128;
let arrowSpeed       = 14;
let travelTime       = HIGHWAY_LEN / arrowSpeed;
const HOLD_END_BONUS = 150;
const HOLD_BODY_SCALE = 0.58;
const HOLD_BODY_MIN_LEN = 0.55;
const WRONG_PRESS_COOLDOWN = 0.1;
let audioHitLatency = 0.05;
const BPM_DEFAULT  = 128;
const PROXIMITY_R  = 7;

function applyApproachTiming(bpmVal) {
  const b = bpmVal || BPM_DEFAULT;
  travelTime = (60 / b) * APPROACH_BEATS;
  arrowSpeed = HIGHWAY_LEN / travelTime;
}

applyApproachTiming(BPM_REF);

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
//  Texture / Asset helpers
// ─────────────────────────────────────────────
const texLoader  = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

const _texCache = new Map();
function makeColorTex(hex, w=2, h=2) {
  const key = `color_${hex}_${w}_${h}`;
  if (_texCache.has(key)) return _texCache.get(key);
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#' + hex.toString(16).padStart(6,'0');
  ctx.fillRect(0,0,w,h);
  const t = new THREE.CanvasTexture(c);
  _texCache.set(key, t);
  return t;
}

function makeGridTex(size=512, lines=16, bg=0x110022, line=0x00ffff) {
  const key = `grid_${size}_${lines}_${bg}_${line}`;
  if (_texCache.has(key)) return _texCache.get(key);
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
  _texCache.set(key, t);
  return t;
}

function makeNeonTex(text, fg='#ff00cc', bg='#110011', size=256) {
  const c = document.createElement('canvas'); c.width=size; c.height=Math.floor(size/3);
  const ctx  = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0,0,c.width,c.height);
  ctx.font = `bold ${Math.floor(c.height*0.7)}px monospace`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor=fg; ctx.shadowBlur=18;
  ctx.fillStyle=fg;
  ctx.fillText(text, c.width/2, c.height/2);
  return new THREE.CanvasTexture(c);
}

function makeArrowShape() {
  const s = new THREE.Shape();
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
//  Skybox  (procedural gradient + stars + nebula clouds)
// ─────────────────────────────────────────────
function buildSkybox() {
  const skyGeo = new THREE.SphereGeometry(300, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor:    { value: new THREE.Color(0x000d28) },
      bottomColor: { value: new THREE.Color(0x330055) },
      midColor:    { value: new THREE.Color(0x0d0050) },
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
        vec3 col = mix(bottomColor, midColor, smoothstep(0.0, 0.35, t));
        col = mix(col, topColor, smoothstep(0.35, 1.0, t));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  const STAR_COUNT = 4000;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(STAR_COUNT * 3);
  const starCol = new Float32Array(STAR_COUNT * 3);
  const palette = [
    [1.0, 1.0, 1.0],
    [0.6, 0.8, 1.0],
    [1.0, 0.85, 0.6],
    [0.9, 0.5, 1.0],
    [0.5, 1.0, 0.9],
  ];
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 280;
    starPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    starPos[i*3+1] = r * Math.abs(Math.cos(phi));
    starPos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    const c = palette[Math.floor(Math.random() * palette.length)];
    starCol[i*3]   = c[0];
    starCol[i*3+1] = c[1];
    starCol[i*3+2] = c[2];
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color',    new THREE.BufferAttribute(starCol, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    vertexColors: true,
    size: 1.6,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
  })));

  const nebulaData = [
    { color: '#ff00cc', yRot: 0.4,  xRot: 0.18, x:  60, y: 90, z: -180 },
    { color: '#00aaff', yRot: -0.5, xRot: 0.12, x: -80, y: 70, z: -160 },
    { color: '#8800ff', yRot: 1.1,  xRot: 0.08, x:  20, y: 110,z:  150 },
  ];
  nebulaData.forEach(n => {
    const cvs = document.createElement('canvas'); cvs.width=512; cvs.height=256;
    const ctx  = cvs.getContext('2d');
    const grad = ctx.createLinearGradient(0,0,512,256);
    grad.addColorStop(0,   'rgba(0,0,0,0)');
    grad.addColorStop(0.4, n.color + 'aa');
    grad.addColorStop(0.6, n.color + '88');
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,512,256);
    const tex = new THREE.CanvasTexture(cvs);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 100),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.28,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    mesh.position.set(n.x, n.y, n.z);
    mesh.rotation.y = n.yRot;
    mesh.rotation.x = n.xRot;
    scene.add(mesh);
  });
}

// ─────────────────────────────────────────────
//  Lights
// ─────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x110033, CFG.ambientIntensity);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x1a0040, 0x330055, CFG.hemiIntensity);
scene.add(hemiLight);

const moonLight = new THREE.DirectionalLight(0xaabbff, CFG.moonIntensity);
moonLight.position.set(30, 80, 20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048,2048);
moonLight.shadow.camera.near = 1;
moonLight.shadow.camera.far  = 300;
moonLight.shadow.camera.left = moonLight.shadow.camera.bottom = -80;
moonLight.shadow.camera.right= moonLight.shadow.camera.top    =  80;
scene.add(moonLight);

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

        const col = LANE_COLORS[Math.floor(rng()*4)];
        const pl = new THREE.PointLight(col, CFG.cityPointBase + rng()*2, 20);
        pl.position.set(x, h+1, z);
        cityGroup.add(pl);
      }

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

  for(let i=-5;i<=5;i++) {
    const sl = makeStreetlight(i*12, 0, -15);
    cityGroup.add(sl);
    const sr = makeStreetlight(i*12, 0, 15);
    cityGroup.add(sr);
  }
}

function makeStreetlight(x,y,z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08,0.12,5,8),
    new THREE.MeshStandardMaterial({color:0x223333,metalness:0.7})
  );
  pole.position.set(x,2.5,z);
  pole.castShadow=true;
  g.add(pole);
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04,0.04,1.5,6),
    new THREE.MeshStandardMaterial({color:0x223333,metalness:0.7})
  );
  arm.rotation.z=Math.PI/2;
  arm.position.set(x+0.75,5,z);
  g.add(arm);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.18,8,8),
    new THREE.MeshStandardMaterial({color:0xffffff,emissive:new THREE.Color(0xaaddff),emissiveIntensity:4})
  );
  lamp.position.set(x+1.5,5,z);
  g.add(lamp);
  const pl = new THREE.PointLight(0xaaddff, CFG.streetlampIntensity, 22);
  pl.position.set(x+1.5,4.8,z);
  g.add(pl);
  return g;
}

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

  const tBase = new THREE.Mesh(
    new THREE.BoxGeometry(8,0.1,3),
    new THREE.MeshStandardMaterial({color:0x110033, roughness:0.3, metalness:0.5})
  );
  tBase.position.set(0,0.25,-8);
  scene.add(tBase);

  floorSpot = new THREE.SpotLight(0xffffff, CFG.floorSpotIntensity, 55, Math.PI/5, 0.3, 1);
  floorSpot.position.set(0,20,0);
  floorSpot.target.position.set(0,0,-8);
  floorSpot.castShadow=true;
  scene.add(floorSpot);
  scene.add(floorSpot.target);

  const spot2 = new THREE.SpotLight(0xff00cc, 3, 35, Math.PI/6, 0.5, 1);
  spot2.position.set(-8,15,-5);
  spot2.target.position.set(0,0,-8);
  scene.add(spot2); scene.add(spot2.target);

  const spot3 = new THREE.SpotLight(0x00ffcc, 3, 35, Math.PI/6, 0.5, 1);
  spot3.position.set(8,15,-5);
  spot3.target.position.set(0,0,-8);
  scene.add(spot3); scene.add(spot3.target);

  [[-5,-10],[5,-10],[-5,8],[5,8]].forEach(([px,pz])=>{
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2,0.25,6,12),
      new THREE.MeshStandardMaterial({color:0x112233,metalness:0.8,roughness:0.2})
    );
    pillar.position.set(px,3,pz);
    pillar.castShadow=true;
    scene.add(pillar);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.4,0.06,8,20),
      new THREE.MeshStandardMaterial({color:0x00ffff,emissive:new THREE.Color(0x00ffff),emissiveIntensity:2})
    );
    ring.position.set(px,5.5,pz);
    scene.add(ring);
  });

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
//  Target Zones
// ─────────────────────────────────────────────
const targetZones=[];
const targetLights=[];

function buildTargetZones() {
  const shape = makeArrowShape();
  const extSettings = { depth:0.08, bevelEnabled:true, bevelThickness:0.02, bevelSize:0.02, bevelSegments:3 };

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
    mesh.rotation.z = LANE_ROT_Z[i];
    mesh.position.set(LANE_X[i], 0.7, -8);
    scene.add(mesh);

    const pl = new THREE.PointLight(LANE_COLORS[i], 0, 4);
    pl.position.set(LANE_X[i], 1.1, -8);
    scene.add(pl);

    targetZones.push(mesh);
    targetLights.push(pl);
  }
}

// ─────────────────────────────────────────────
//  Arrow Pool
// ─────────────────────────────────────────────
const POOL_SIZE = 80;
const arrowPool = [];
const activeArrows = [];
const _arrowGeos = [];
const _arrowMats = [];

function buildArrowPool() {
  const shape = makeArrowShape();
  const ext   = { depth:0.12, bevelEnabled:true, bevelThickness:0.03, bevelSize:0.03, bevelSegments:3 };
  for(let lane=0;lane<LANE_COUNT;lane++) {
    const geo = new THREE.ExtrudeGeometry(shape, ext);
    geo.center();
    _arrowGeos.push(geo);
    _arrowMats.push(new THREE.MeshStandardMaterial({
      color:    LANE_COLORS[lane],
      emissive: new THREE.Color(LANE_COLORS[lane]),
      emissiveIntensity: 1.5,
      roughness:0.1, metalness:0.6,
    }));
  }

  for(let i=0;i<POOL_SIZE;i++) {
    const lane = i % LANE_COUNT;
    const mesh = new THREE.Mesh(_arrowGeos[lane], _arrowMats[lane]);
    mesh.rotation.z = LANE_ROT_Z[lane];
    mesh.visible = false;
    mesh.castShadow = false;
    mesh.userData.lane = lane;
    scene.add(mesh);
    arrowPool.push(mesh);
  }
}

function getPooledArrow(lane) {
  for(let a of arrowPool) {
    if(!a.visible && a.userData.lane===lane) { a.visible=true; return a; }
  }
  for(let a of arrowPool) {
    if(!a.visible) {
      a.userData.lane = lane;
      a.material = _arrowMats[lane];
      a.rotation.z = LANE_ROT_Z[lane];
      a.visible=true; return a;
    }
  }
  return null;
}

function releaseHoldBody(arrow) {
  const body = arrow.userData.holdBody;
  if(!body) return;
  body.visible = false;
  body.scale.set(1, 1, 1);
  arrow.userData.holdBody = null;
}

function recycleArrow(arrow) {
  releaseHoldBody(arrow);
  arrow.userData._bodyHeadZ = undefined;
  arrow.userData._bodyLen   = undefined;
  arrow.visible=false;
  arrow.userData.holdStarted=false;
  const idx=activeArrows.indexOf(arrow);
  if(idx>=0) activeArrows.splice(idx,1);
}

// ─────────────────────────────────────────────
//  Hold body pool
// ─────────────────────────────────────────────
const HOLD_BODY_POOL_SIZE = 24;
const holdBodyPool        = [];
const _holdBodyGeos       = [];
const _holdBodyMats       = [];

function buildHoldBodyPool() {
  const shape = makeArrowShape();
  const ext = {
    depth: 1,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 4,
  };
  for(let lane=0; lane<LANE_COUNT; lane++) {
    const geo = new THREE.ExtrudeGeometry(shape, ext);
    geo.center();
    _holdBodyGeos.push(geo);
    _holdBodyMats.push(new THREE.MeshStandardMaterial({
      color:    LANE_COLORS[lane],
      emissive: new THREE.Color(LANE_COLORS[lane]),
      emissiveIntensity: 0.95,
      roughness: 0.15,
      metalness: 0.5,
      transparent: true,
      opacity: 0.88,
    }));
  }
  for(let i=0; i<HOLD_BODY_POOL_SIZE; i++) {
    const lane = i % LANE_COUNT;
    const mesh = new THREE.Mesh(_holdBodyGeos[lane], _holdBodyMats[lane]);
    mesh.rotation.z = LANE_ROT_Z[lane];
    mesh.visible = false;
    mesh.castShadow = false;
    scene.add(mesh);
    holdBodyPool.push(mesh);
  }
}

function getPooledHoldBody(lane) {
  for(const b of holdBodyPool) {
    if(!b.visible && b.userData.bodyLane === lane) {
      b.material = _holdBodyMats[lane];
      return b;
    }
  }
  for(const b of holdBodyPool) {
    if(!b.visible) {
      b.userData.bodyLane = lane;
      b.material = _holdBodyMats[lane];
      b.rotation.z = LANE_ROT_Z[lane];
      return b;
    }
  }
  return null;
}

function updateHoldBodyVisual(arrow) {
  if(!arrow.userData.isHold) return;
  const headZ = arrow.position.z;
  const lane  = arrow.userData.lane;
  const len   = Math.max(arrow.userData.duration * arrowSpeed, HOLD_BODY_MIN_LEN);
  // Only skip update if both Z and len haven't changed
  const lenChanged = arrow.userData._bodyLen !== len;
  if(!lenChanged && arrow.userData._bodyHeadZ === headZ) return;
  arrow.userData._bodyHeadZ = headZ;
  arrow.userData._bodyLen   = len;
  let body = arrow.userData.holdBody;
  if(!body) {
    body = getPooledHoldBody(lane);
    if(!body) return;
    arrow.userData.holdBody = body;
  }
  body.material = _holdBodyMats[lane];
  body.rotation.z = LANE_ROT_Z[lane];
  body.scale.set(HOLD_BODY_SCALE, HOLD_BODY_SCALE, len);
  body.position.set(LANE_X[lane], 0.82, headZ - len * 0.5);
  body.visible = true;
}

function arrowZAtSongTime(st, spawnTime) {
  return (TARGET_Z - HIGHWAY_LEN) + (st - spawnTime) * arrowSpeed;
}

// ─────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────
const STATES = { EXPLORE:'explore', PROMPT:'prompt', SONGSELECT:'songselect', PLAYING:'playing', RESULT:'result' };
let gameState  = STATES.EXPLORE;

// Track the active song id so we can save hi-scores correctly
let activeSongId = 'random';
// Grace-period timer before endGame fires after last note clears
let _endGameTimer = null;

let score      = 0;
let combo      = 0;
let maxCombo   = 0;
let perfects   = 0;
let goods      = 0;
let misses     = 0;
let totalNotes = 0;

// ─────────────────────────────────────────────
//  Song time clock
// ─────────────────────────────────────────────
let songStartWall = 0;
let useAudioClock = false;
let songAudioStartCtx = 0;

function songTime() {
  if(gameState !== STATES.PLAYING) return 0;
  let t = 0;
  if(useAudioClock && audioCtx) {
    t = audioCtx.currentTime - songAudioStartCtx;
  } else if(songStartWall !== 0) {
    t = (performance.now() - songStartWall) / 1000;
  }
  return Math.max(0, t - audioHitLatency);
}

let audioCtx   = null;
let songBuffer = null;
let songSource = null;

// Chart data
let chart       = null;
let noteIndex   = 0;
let gameMode    = 'random';
let bpm         = BPM_DEFAULT;
let beatTimer   = 0;
let beatInterval= 60/bpm;
let randomActive= false;

const keysDown = {};
window.addEventListener('keydown',e=>{ keysDown[e.key.toLowerCase()]=true; });
window.addEventListener('keyup',  e=>{ keysDown[e.key.toLowerCase()]=false; });

// ─────────────────────────────────────────────
//  Pointer Lock / FPS Controls
// ─────────────────────────────────────────────
const controls = new PointerLockControls(camera, renderer.domElement);
controls.pointerSpeed = CFG.mouseSensitivity;
scene.add(camera);

const _LOOK_SMOOTH = 0.22;
let _rawYaw = 0, _rawPitch = 0;

const initialEuler = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(camera.quaternion, 'YXZ');
_rawYaw = initialEuler.y;
_rawPitch = initialEuler.x;

renderer.domElement.addEventListener('mousemove', e => {
  if(!controls.isLocked) return;
  _rawYaw   -= e.movementX * CFG.mouseSensitivity * 0.002;
  _rawPitch -= e.movementY * CFG.mouseSensitivity * 0.002;
  _rawPitch  = Math.max(-Math.PI/2, Math.min(Math.PI/2, _rawPitch));
}, false);

if(controls._onMouseMove) {
  renderer.domElement.removeEventListener('mousemove', controls._onMouseMove);
}

function applySmoothLook() {
  if(!controls.isLocked && gameState !== STATES.PLAYING) return;
  const currentEuler = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(camera.quaternion, 'YXZ');
  let targetYaw   = currentEuler.y + (_rawYaw   - currentEuler.y) * (1 - _LOOK_SMOOTH);
  let targetPitch = currentEuler.x + (_rawPitch - currentEuler.x) * (1 - _LOOK_SMOOTH);
  targetPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, targetPitch));
  camera.quaternion.setFromEuler(new THREE.Euler(targetPitch, targetYaw, 0, 'YXZ'));
}

const vel   = new THREE.Vector3();
const dir   = new THREE.Vector3();
let moveF=false,moveB=false,moveL=false,moveR=false,moveU=false,moveD=false;

document.addEventListener('keydown', e=>{
  if(gameState===STATES.PLAYING) return;
  if(gameState===STATES.SONGSELECT) return;
  if(e.code==='KeyW'||e.code==='ArrowUp')    moveF=true;
  if(e.code==='KeyS'||e.code==='ArrowDown')  moveB=true;
  if(e.code==='KeyA'||e.code==='ArrowLeft')  moveL=true;
  if(e.code==='KeyD'||e.code==='ArrowRight') moveR=true;
  if(e.code==='Space')   { moveU=true; e.preventDefault(); }
  if(e.code==='ControlLeft'||e.code==='ControlRight') moveD=true;
  if(e.code==='KeyE' && gameState===STATES.PROMPT) openSongSelectScreen();
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

let _programmingUnlock = false;
controls.addEventListener('unlock',()=>{
  // Always zero velocity and clear move flags on unlock to prevent
  // stale velocity snapping when pointer lock re-acquires.
  vel.set(0, 0, 0);
  moveF=moveB=moveL=moveR=moveU=moveD=false;
  if(_programmingUnlock) { _programmingUnlock=false; return; }
  if(gameState===STATES.PLAYING) exitGame();
});

// ─────────────────────────────────────────────
//  HUD
// ─────────────────────────────────────────────
const hudEl    = document.getElementById('hud');
const scoreEl  = document.getElementById('hud-score');
const comboEl  = document.getElementById('hud-combo');
const judgeEl  = document.getElementById('hud-judge');
const promptEl = document.getElementById('hud-prompt');
const resultEl = document.getElementById('hud-result');
const songSelEl= document.getElementById('hud-songselect');

let judgeTimer = 0;

function showJudge(text, color) {
  judgeEl.textContent = text;
  judgeEl.style.color = color;
  judgeEl.style.opacity = '1';
  judgeEl.style.transform = 'translateX(-50%) scale(1.3)';
  judgeTimer = 0.6;
  if(gameState===STATES.PLAYING) pulseHoloCube(color);
}

let _hudDirty = true;
function markHudDirty() { _hudDirty = true; }

function updateHUD() {
  if(gameState!==STATES.PLAYING || !_hudDirty) return;
  _hudDirty = false;
  scoreEl.textContent = `${score.toString().padStart(7,'0')}`;
  comboEl.textContent = combo>1 ? `${combo}x` : '';
}

// ─────────────────────────────────────────────
//  Song Select Screen
// ─────────────────────────────────────────────

let songManifest = [];

function openSongSelectScreen() {
  gameState = STATES.SONGSELECT;
  if(controls.isLocked) {
    _programmingUnlock = true;
    controls.unlock();
  }
  hudEl.style.display = 'none';
  promptEl.style.display = 'none';
  resultEl.style.display = 'none';

  if(window.ssSetManifest) window.ssSetManifest(songManifest);
  if(window.openSongSelect) window.openSongSelect();
}

function exitToExplore() {
  gameState = STATES.EXPLORE;
  if(window.closeSongSelect) window.closeSongSelect();
  hudEl.style.display = 'none';
  promptEl.style.display = 'none';
  resultEl.style.display = 'none';
  songSelEl.style.display = 'none';
}

// ─────────────────────────────────────────────
//  Game Camera positions
// ─────────────────────────────────────────────
const GAME_CAM_POS = new THREE.Vector3(0, 2.5, 2);
const GAME_CAM_ROT = new THREE.Euler(-0.18, 0, 0);
let exploreCamPos  = new THREE.Vector3();
let exploreCamQuat = new THREE.Quaternion();
let _playPixelRatio = 1;

function enterGame() {
  if(gameState===STATES.PLAYING) return;

  songSelEl.style.display = 'none';

  exploreCamPos.copy(camera.position);
  exploreCamQuat.copy(camera.quaternion);

  _programmingUnlock = true;
  if(controls.isLocked) controls.unlock();

  gameState = STATES.PLAYING;
  camera.position.copy(GAME_CAM_POS);
  camera.rotation.copy(GAME_CAM_ROT);

  score=0;combo=0;maxCombo=0;perfects=0;goods=0;misses=0;totalNotes=0;noteIndex=0;
  lastWrongPressTime=-1;
  // Clear any pending end-game timer from a previous session
  if(_endGameTimer){ clearTimeout(_endGameTimer); _endGameTimer=null; }

  songStartWall = 0;
  useAudioClock = false;
  _hudDirty = true;
  renderer.shadowMap.enabled = false;
  cityGroup.visible = false;
  moonLight.castShadow = false;
  if(floorSpot) floorSpot.intensity = 0;
  _playPixelRatio = renderer.getPixelRatio();
  renderer.setPixelRatio(1);

  applyApproachTiming(chart?.bpm || bpm);

  hudEl.style.display='block';
  promptEl.style.display='none';
  resultEl.style.display='none';

  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();

  if(gameMode==='chart' && chart) {
    if(songBuffer && audioCtx) {
      scheduleChart();
    } else {
      songStartWall = performance.now();
    }
  } else {
    songStartWall = performance.now();
    randomActive = true;
    beatTimer    = 0;
    beatInterval = 60 / bpm;
  }
}

function stopSongAudio() {
  if(songSource) {
    try { songSource.stop(); songSource.disconnect(); } catch(e) {}
    songSource = null;
  }
  useAudioClock = false;
}

function restoreExploreRendering() {
  cityGroup.visible = true;
  moonLight.castShadow = true;
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(_playPixelRatio);
  if(floorSpot) floorSpot.intensity = CFG.floorSpotIntensity;
}

function exitGame() {
  if(_endGameTimer){ clearTimeout(_endGameTimer); _endGameTimer=null; }
  gameState=STATES.EXPLORE;
  randomActive=false;
  songStartWall=0;
  stopSongAudio();
  restoreExploreRendering();
  [...activeArrows].forEach(a=>recycleArrow(a));
  // Restore saved explore camera position
  camera.position.copy(exploreCamPos);
  camera.quaternion.copy(exploreCamQuat);
  // Sync raw look values to restored quaternion so smooth look doesn't snap
  const euler = new THREE.Euler(0,0,0,'YXZ');
  euler.setFromQuaternion(exploreCamQuat,'YXZ');
  _rawYaw = euler.y; _rawPitch = euler.x;
  // Zero velocity so there's no snap from stale values
  vel.set(0, 0, 0);
  moveF=moveB=moveL=moveR=moveU=moveD=false;
  hudEl.style.display='none';
  promptEl.style.display='none';
  resultEl.style.display='none';
  songSelEl.style.display='none';
}

function endGame() {
  if(_endGameTimer){ clearTimeout(_endGameTimer); _endGameTimer=null; }
  gameState=STATES.RESULT;
  randomActive=false;
  songStartWall=0;
  stopSongAudio();
  restoreExploreRendering();
  [...activeArrows].forEach(a=>recycleArrow(a));

  const acc = totalNotes>0 ? (perfects+goods*0.5)/totalNotes : 0;
  let grade='F';
  if(acc>=0.95) grade='S'; else if(acc>=0.85) grade='A';
  else if(acc>=0.7) grade='B'; else if(acc>=0.5) grade='C'; else grade='D';

  const scoreData = { score, grade, maxCombo, perfects, goods, misses };
  if(window.nrSaveHiScore) window.nrSaveHiScore(activeSongId, scoreData);

  resultEl.style.display='flex';
  document.getElementById('res-score-big').textContent = score.toString().padStart(7,'0');
  document.getElementById('res-combo').textContent  = maxCombo;
  document.getElementById('res-perfect').textContent= perfects;
  document.getElementById('res-good').textContent   = goods;
  document.getElementById('res-miss').textContent   = misses;
  document.getElementById('res-grade').textContent  = grade;
}

// ─────────────────────────────────────────────
//  Note spawning
// ─────────────────────────────────────────────
function spawnNote({ lane, time, duration = 0 }) {
  const arrow = getPooledArrow(lane);
  if(!arrow) return false;
  const st         = songTime();
  const spawnTime  = time - travelTime;
  const isHold     = duration > 0;
  arrow.position.set(LANE_X[lane], 0.84, arrowZAtSongTime(st, spawnTime));
  arrow.userData.spawnTime   = spawnTime;
  arrow.userData.targetTime  = time;
  arrow.userData.endTime     = time + duration;
  arrow.userData.duration    = duration;
  arrow.userData.isHold      = isHold;
  arrow.userData.holdStarted = false;
  arrow.userData.holdDone    = false;
  arrow.userData.hit         = false;
  arrow.userData.missed      = false;
  arrow.userData.holdBody    = null;
  if(isHold) updateHoldBodyVisual(arrow);
  activeArrows.push(arrow);
  totalNotes++;
  return true;
}

function spawnTap(lane) {
  spawnNote({ lane, time: songTime() + travelTime, duration: 0 });
}

function scheduleChart() {
  if(!songBuffer || !audioCtx) return;
  const startAudio = () => {
    stopSongAudio();
    songSource = audioCtx.createBufferSource();
    songSource.buffer = songBuffer;
    songSource.connect(audioCtx.destination);
    songAudioStartCtx = audioCtx.currentTime;
    useAudioClock = true;
    songSource.start(0, 0);
    songSource.onended = ()=>{
      // Audio ended — only trigger endGame if chart notes are also exhausted
      if(gameState===STATES.PLAYING && noteIndex>=chart.notes.length && activeArrows.length===0) {
        endGame();
      }
    };
  };
  if(audioCtx.state === 'suspended') {
    audioCtx.resume().then(startAudio);
  } else {
    startAudio();
  }
}

// ─────────────────────────────────────────────
//  Hit detection
// ─────────────────────────────────────────────
const lanePressed = [false,false,false,false];
let lastWrongPressTime = -1;

function getHittableNotes(t) {
  return activeArrows.filter(a=>{
    if(a.userData.missed) return false;
    if(a.userData.isHold && a.userData.holdStarted) return false;
    if(!a.userData.isHold && a.userData.hit) return false;
    return Math.abs(t - a.userData.targetTime) <= HIT_WINDOW;
  });
}

function hasNearMissOnLane(lane, t) {
  return activeArrows.some(a=>{
    if(a.userData.lane!==lane || a.userData.missed) return false;
    if(a.userData.isHold && a.userData.holdStarted) return false;
    if(!a.userData.isHold && a.userData.hit) return false;
    const d = Math.abs(t - a.userData.targetTime);
    // Tightened: only flag as near-miss if just slightly outside the window
    return d > HIT_WINDOW && d <= HIT_WINDOW * 1.4;
  });
}

function punishWrongInput() {
  const t = songTime();
  if(t - lastWrongPressTime < WRONG_PRESS_COOLDOWN) return;
  lastWrongPressTime = t;
  // Break combo but don't add a miss — pressing the wrong lane during a
  // multi-note window is already punishing enough via the lost combo.
  combo = 0;
  markHudDirty();
  showJudge('WRONG','#ff4444');
}

function scoreHeadHit(delta) {
  combo++;
  if(combo>maxCombo) maxCombo=combo;
  markHudDirty();
  if(delta<=PERFECT_WIN) {
    score+=300+combo*10;
    perfects++;
    showJudge('PERFECT!','#ffdd00');
    return 1.5;
  }
  score+=100+combo*5;
  goods++;
  showJudge('GOOD','#00ffcc');
  return 0.8;
}

function startHoldHead(arrow, delta) {
  arrow.userData.holdStarted = true;
  arrow.userData.hit         = true;
  const flash = scoreHeadHit(delta);
  flashTarget(arrow.userData.lane, flash);
  markHudDirty();
}

function resetTargetGlow(lane) {
  targetLights[lane].intensity = 0;
  targetZones[lane].material.emissiveIntensity = 0.3;
}

function completeHold(arrow) {
  if(arrow.userData.holdDone || arrow.userData.missed) return;
  arrow.userData.holdDone = true;
  const lane = arrow.userData.lane;
  combo++;
  if(combo>maxCombo) maxCombo=combo;
  score += HOLD_END_BONUS + combo * 5;
  showJudge('HOLD!','#88ff00');
  flashTarget(lane, 1.2);
  markHudDirty();
  recycleArrow(arrow);
}

function failHold(arrow, earlyRelease) {
  if(arrow.userData.missed) return;
  arrow.userData.missed = true;
  const lane = arrow.userData.lane;
  misses++;
  combo = 0;
  markHudDirty();
  showJudge(earlyRelease ? 'HOLD BREAK' : 'MISS', '#ff4444');
  resetTargetGlow(lane);
  recycleArrow(arrow);
}

function handleHitInput(lane) {
  if(gameState!==STATES.PLAYING) return;
  const t = songTime();
  const hittable = getHittableNotes(t);
  const onLane   = hittable.filter(a=>a.userData.lane===lane);
  if(onLane.length === 0) {
    // Only punish if there's a note on a different lane right now (wrong lane press).
    // Never punish completely empty taps.
    if(hittable.length > 0) {
      punishWrongInput();
    } else if(hasNearMissOnLane(lane, t)) {
      // Note is close but not quite in window — soft feedback only, no penalty
      showJudge('EARLY','#ff8844');
      flashTarget(lane, 0.2);
    } else {
      flashTarget(lane, 0.3);
    }
    return;
  }
  let best=null, bestDelta=Infinity;
  for(const arrow of onLane) {
    const delta = Math.abs(t - arrow.userData.targetTime);
    if(delta < bestDelta) { bestDelta=delta; best=arrow; }
  }
  if(best.userData.isHold) {
    startHoldHead(best, bestDelta);
    return;
  }
  best.userData.hit = true;
  const flash = scoreHeadHit(bestDelta);
  flashTarget(lane, flash);
  markHudDirty();
  recycleArrow(best);
}

function updateHoldStates(st) {
  for(let i=activeArrows.length-1; i>=0; i--) {
    const arrow = activeArrows[i];
    if(!arrow.userData.isHold || arrow.userData.missed) continue;
    const lane = arrow.userData.lane;
    if(arrow.userData.holdStarted) {
      if(!lanePressed[lane]) {
        failHold(arrow, true); i--; continue;
      }
      if(st >= arrow.userData.endTime) {
        completeHold(arrow); i--;
      } else {
        targetLights[lane].intensity = 1.2 + Math.sin(st * 12) * 0.4;
        targetZones[lane].material.emissiveIntensity = 1.0;
      }
    }
  }
}

function flashTarget(lane, intensity) {
  targetLights[lane].intensity = intensity * 4;
  targetZones[lane].material.emissiveIntensity = intensity * 2;
  setTimeout(()=>{
    targetLights[lane].intensity=0;
    targetZones[lane].material.emissiveIntensity=0.3;
  }, 150);
}

function laneFromEvent(e) {
  const k = e.key.toLowerCase();
  const keyLane = { a:0, s:1, w:2, d:3 };
  if(keyLane[k] !== undefined) return keyLane[k];
  const codeLane = { ArrowLeft:0, ArrowDown:1, ArrowUp:2, ArrowRight:3 };
  return codeLane[e.code];
}

document.addEventListener('keydown', e=>{
  if(gameState!==STATES.PLAYING) return;
  const lane = laneFromEvent(e);
  if(lane !== undefined && !lanePressed[lane]) {
    lanePressed[lane]=true;
    handleHitInput(lane);
  }
  if(e.code==='Escape') { exitGame(); }
});
document.addEventListener('keyup', e=>{
  const lane = laneFromEvent(e);
  if(lane !== undefined) lanePressed[lane]=false;
});

// ─────────────────────────────────────────────
//  GLB model
// ─────────────────────────────────────────────
function loadGLBModel() {
  gltfLoader.load(
    'models/model.glb',
    (gltf)=>{
      const m = gltf.scene;
      m.scale.setScalar(4.5);
      m.position.set(12,1.3,5);
      m.rotation.y = -Math.PI/4;
      m.traverse(c=>{ if(c.isMesh){c.castShadow=true;c.receiveShadow=true;} });
      scene.add(m);
    },
    undefined,
    ()=>{
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
  [[1.2,0,0.85],[1.2,0,-0.85],[-1.2,0,0.85],[-1.2,0,-0.85]].forEach(([wx,wy,wz])=>{
    const w=new THREE.Mesh(
      new THREE.CylinderGeometry(0.35,0.35,0.25,16),
      new THREE.MeshStandardMaterial({color:0x111111,metalness:0.5})
    );
    w.rotation.x=Math.PI/2; w.position.set(wx,0.35,wz); g.add(w);
  });
  const under=new THREE.Mesh(
    new THREE.BoxGeometry(3.6,0.04,1.6),
    new THREE.MeshStandardMaterial({color:0x00ffcc,emissive:new THREE.Color(0x00ffcc),emissiveIntensity:3})
  );
  under.position.y=0.15; g.add(under);
  const ul=new THREE.PointLight(0x00ffcc,2,6); ul.position.y=0.2; g.add(ul);
  return g;
}

// ─────────────────────────────────────────────
//  World extras
// ─────────────────────────────────────────────
function buildWorldExtras() {
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
  holoCubeRef.mesh = octa;
  scene.add(octa);

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

  [[-7,0,-2],[7,0,-2]].forEach(([sx,sy,sz])=>{
    const speaker=new THREE.Mesh(
      new THREE.BoxGeometry(1.5,2.5,1.2),
      new THREE.MeshStandardMaterial({color:0x111111,roughness:0.9})
    );
    speaker.position.set(sx,1.25,sz);
    speaker.castShadow=true;
    scene.add(speaker);
    const woof=new THREE.Mesh(
      new THREE.CircleGeometry(0.5,16),
      new THREE.MeshStandardMaterial({color:0x222222,roughness:0.5,side:THREE.DoubleSide})
    );
    woof.position.set(sx, 1.5, sz+0.61);
    scene.add(woof);
    const tweet=new THREE.Mesh(
      new THREE.CircleGeometry(0.15,12),
      new THREE.MeshStandardMaterial({color:0x444444,roughness:0.5,side:THREE.DoubleSide})
    );
    tweet.position.set(sx, 2.4, sz+0.61);
    scene.add(tweet);
  });

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
const holoCubeRef={mesh:null};
const holoBaseColor=new THREE.Color(0x00ffff);
let holoPulseTimer=0;
const HOLO_PULSE_DURATION=0.55;
const _holoPulseColor=new THREE.Color();

function pulseHoloCube(hexColor) {
  if(!holoCubeRef.mesh) return;
  _holoPulseColor.set(hexColor);
  holoPulseTimer=HOLO_PULSE_DURATION;
}

function updateHoloCube(dt, t) {
  const mesh=holoCubeRef.mesh;
  if(!mesh) return;
  mesh.rotation.x+=0.01;
  mesh.rotation.y+=0.007;
  mesh.position.y=3.5+Math.sin(t*0.8)*0.2;
  const mat=mesh.material;
  if(holoPulseTimer>0) {
    holoPulseTimer-=dt;
    const blend=Math.min(1, holoPulseTimer/HOLO_PULSE_DURATION);
    mat.emissive.copy(_holoPulseColor);
    mat.color.copy(_holoPulseColor);
    mat.emissiveIntensity=1+blend*2.5;
  } else {
    mat.emissive.lerp(holoBaseColor, 0.1);
    mat.color.lerp(holoBaseColor, 0.1);
    mat.emissiveIntensity+=(1-mat.emissiveIntensity)*0.1;
  }
}

// ─────────────────────────────────────────────
//  Build everything
// ─────────────────────────────────────────────
buildSkybox();
buildDanceFloor();
buildTargetZones();
buildArrowPool();
buildHoldBodyPool();
buildWorldExtras();
loadGLBModel();

// ─────────────────────────────────────────────
//  Renderer resize
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
const clock = (() => {
  let _start = performance.now(), _prev = _start;
  return {
    getDelta()       { const now = performance.now(); const d = (now - _prev) / 1000; _prev = now; return d; },
    getElapsedTime() { return (performance.now() - _start) / 1000; },
  };
})();
const _pos2D   = new THREE.Vector2();
const _floor2D = new THREE.Vector2(FLOOR_POS.x, FLOOR_POS.z);

let _debugFrame = 0;
function updateDebugHud() {
  const el = document.getElementById('numdot');
  if(!el) return;
  if(gameState === STATES.PLAYING) {
    el.textContent = `Notes: ${activeArrows.length} · ${Math.round(arrowSpeed)} u/s`;
  } else if(++_debugFrame % 120 === 0) {
    el.textContent = `Explore · ${renderer.info.render.triangles} tris`;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  onResize();
  const t = clock.getElapsedTime();

  updateHoloCube(dt, t);

  if(gameState !== STATES.PLAYING) {
    orbs.forEach((o,i)=>{
      const y = o.baseY + Math.sin(t*1.2+o.phase)*0.3;
      o.mesh.position.y=y;
      orbLights[i].position.y=y;
    });
    floatingRings.forEach(r=>{ r.mesh.rotation.z += 0.005; });
    if(discoRef.mesh) {
      discoRef.mesh.rotation.y+=0.01;
      discoRef.light.intensity=1;
    }
  }

  if(controls.isLocked && (gameState===STATES.EXPLORE||gameState===STATES.PROMPT)) {
    applySmoothLook();
    const spd = CFG.moveSpeed * dt;
    if(moveF) controls.moveForward( spd);
    if(moveB) controls.moveForward(-spd);
    if(moveL) controls.moveRight(-spd);
    if(moveR) controls.moveRight( spd);
    if(moveU) camera.position.y += spd * 0.7;
    if(moveD) camera.position.y -= spd * 0.7;
    camera.position.y = Math.max(1.7, camera.position.y);

    _pos2D.set(camera.position.x, camera.position.z);
    const dist=_pos2D.distanceTo(_floor2D);
    if(dist<PROXIMITY_R) {
      gameState=STATES.PROMPT;
      promptEl.style.display='flex';
    } else {
      if(gameState===STATES.PROMPT) gameState=STATES.EXPLORE;
      promptEl.style.display='none';
    }
  }

  if(gameState===STATES.PLAYING) {
    const st = songTime();

    if(randomActive) {
      beatTimer+=dt;
      if(beatTimer>=beatInterval) {
        beatTimer-=beatInterval;
        const count=Math.random()<0.3?2:1;
        const lanes=[];
        while(lanes.length<count) {
          const l=Math.floor(Math.random()*4);
          if(!lanes.includes(l)) lanes.push(l);
        }
        lanes.forEach(l=>spawnTap(l));
      }
    }

    if(gameMode==='chart' && chart) {
      while(noteIndex<chart.notes.length) {
        const note=chart.notes[noteIndex];
        if(note.time - travelTime <= st) {
          if(spawnNote({
            lane:     note.lane,
            time:     note.time,
            duration: note.duration || 0,
          })) noteIndex++;
          else break;
        } else break;
      }
      // Schedule end-game after a grace period once all notes are gone
      if(noteIndex>=chart.notes.length && activeArrows.length===0 && !_endGameTimer) {
        _endGameTimer = setTimeout(endGame, 800);
      }
    }

    updateHoldStates(st);

    for(let i=activeArrows.length-1;i>=0;i--) {
      const arrow=activeArrows[i];
      const elapsed=st - arrow.userData.spawnTime;
      arrow.position.z = arrowZAtSongTime(st, arrow.userData.spawnTime);
      arrow.position.y=0.84+Math.sin(elapsed*3)*0.04;

      if(arrow.userData.isHold) {
        updateHoldBodyVisual(arrow);
        if(!arrow.userData.holdStarted && !arrow.userData.missed
            && arrow.position.z > TARGET_Z+1.5) {
          failHold(arrow, false); i--;
        }
        continue;
      }

      if(!arrow.userData.hit && arrow.position.z > TARGET_Z+1.5) {
        arrow.userData.missed=true;
        misses++;
        combo=0;
        showJudge('MISS','#ff4444');
        markHudDirty();
        recycleArrow(arrow);
        i--;
      }
    }

    if(judgeTimer>0) {
      judgeTimer-=dt;
      if(judgeTimer<=0) {
        judgeEl.style.opacity='0';
        judgeEl.style.transform='translateX(-50%) scale(1)';
      }
    }

    updateHUD();
  }

  updateDebugHud();
  renderer.render(scene, camera);
}

animate();

// ─────────────────────────────────────────────
//  loadSong
// ─────────────────────────────────────────────
const SONGS_BASE_JS = new URL('../songs/', import.meta.url).href;

async function loadSong(chartUrl, audioUrl) {
  const chartRes = await fetch(chartUrl);
  if(!chartRes.ok) throw new Error(`Chart not found (${chartRes.status})`);
  const c = await chartRes.json();
  if(!c.notes || !Array.isArray(c.notes)) throw new Error('Chart missing notes array');

  chart = c;
  gameMode = 'chart';
  noteIndex = 0;
  if(c.bpm) { bpm = c.bpm; beatInterval = 60 / bpm; }
  applyApproachTiming(c.bpm || bpm);

  if(audioUrl) {
    const audioRes = await fetch(audioUrl);
    if(!audioRes.ok) throw new Error(`Audio not found (${audioRes.status})`);
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const arr = await audioRes.arrayBuffer();
    songBuffer = await audioCtx.decodeAudioData(arr.slice(0));
  }

  const holds = c.notes.filter(n=>(n.duration||0)>0).length;
  return {
    title:     c.title || 'Untitled',
    artist:    c.artist || '',
    bpm:       c.bpm,
    noteCount: c.notes.length,
    holds,
    duration:  songBuffer ? songBuffer.duration : null,
  };
}

// ─────────────────────────────────────────────
//  Load song library manifest
// ─────────────────────────────────────────────
async function loadManifest() {
  try {
    const res = await fetch(new URL('manifest.json', SONGS_BASE_JS));
    if(!res.ok) return;
    const data = await res.json();
    const songs = data.songs || [];

    for(const song of songs) {
      try {
        const chartUrl = new URL(song.chart, SONGS_BASE_JS).href;
        const res2 = await fetch(chartUrl);
        if(res2.ok) song._chartData = await res2.json();
        song.audio = song.audio ? new URL(song.audio, SONGS_BASE_JS).href : null;
        song.chart = chartUrl;
      } catch(e) { /* ignore */ }
    }

    songManifest = songs;
    if(window.ssSetManifest) window.ssSetManifest(songs);
  } catch(e) { /* no manifest */ }
}

loadManifest();

// ─────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────
window.NeonRhythm = {
  setMode(mode)  { gameMode=mode; },
  setBPM(val)    { bpm=val; beatInterval=60/bpm; applyApproachTiming(bpm); },
  loadChart(c)   {
    chart=c; gameMode='chart'; noteIndex=0;
    if(c.bpm){ bpm=c.bpm; beatInterval=60/bpm; }
    applyApproachTiming(c.bpm || bpm);
  },
  loadAudio(buf) { songBuffer=buf; },
  loadSong,
  getChart: ()=>chart,
  getManifest: ()=>songManifest,
  setTimingLatency(sec) { audioHitLatency = Number(sec) || 0; },
  getTimingLatency: ()=>audioHitLatency,

  setActiveSongId(id) { activeSongId = id || 'random'; },

  openSongSelect: openSongSelectScreen,
  enterGame,
  exitGame,
  exitToExplore,
  endGame,
  getState: ()=>gameState,
};