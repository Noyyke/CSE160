// world.js — static environment: skybox, ground, city, dance floor, decorations
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const LANE_COLORS = [0x00ffff, 0xff00aa, 0x00ff88, 0xffcc00];

// ── Texture helpers ──────────────────────────────────────────────────────────
const _texCache = new Map();

export function makeGridTex(size=512, lines=16, bg=0x110022, line=0x00ffff) {
  const key = `grid_${size}_${lines}_${bg}_${line}`;
  if (_texCache.has(key)) return _texCache.get(key);
  const c = document.createElement('canvas'); c.width=size; c.height=size;
  const ctx = c.getContext('2d');
  ctx.fillStyle='#'+bg.toString(16).padStart(6,'0'); ctx.fillRect(0,0,size,size);
  ctx.strokeStyle='#'+line.toString(16).padStart(6,'0'); ctx.lineWidth=1.5;
  const step=size/lines;
  for(let i=0;i<=lines;i++){
    ctx.beginPath();ctx.moveTo(i*step,0);ctx.lineTo(i*step,size);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,i*step);ctx.lineTo(size,i*step);ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(4,4);
  _texCache.set(key,t); return t;
}

function makeNeonTex(text, fg='#ff00cc', bg='#110011', size=256) {
  const c=document.createElement('canvas'); c.width=size; c.height=Math.floor(size/3);
  const ctx=c.getContext('2d');
  ctx.fillStyle=bg; ctx.fillRect(0,0,c.width,c.height);
  ctx.font=`bold ${Math.floor(c.height*0.7)}px monospace`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor=fg; ctx.shadowBlur=18; ctx.fillStyle=fg;
  ctx.fillText(text,c.width/2,c.height/2);
  return new THREE.CanvasTexture(c);
}

function mulberry32(seed) {
  return function(){
    seed|=0; seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
}

// ── Skybox ───────────────────────────────────────────────────────────────────
export function buildSkybox(scene) {
    // Large sphere, inside-out so the camera is always inside it
    const geo = new THREE.SphereGeometry(450, 64, 32);
    geo.scale(-1, 1, 1); // flip normals inward
   
    const mat = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      depthWrite: false,
   
      uniforms: {
        uTime: { value: 0 },
      },
   
      vertexShader: /* glsl */`
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
   
      fragmentShader: /* glsl */`
        varying vec3 vWorldPos;
        uniform float uTime;
   
        // ── Palette (tweak these to taste) ──
        // zenith  → deep indigo/violet
        const vec3 COL_ZENITH  = vec3(0.04, 0.01, 0.18);
        // mid sky → magenta-pink
        const vec3 COL_MID     = vec3(0.55, 0.05, 0.38);
        // horizon → amber-orange smog glow
        const vec3 COL_HORIZON = vec3(0.95, 0.28, 0.05);
        // low haze → deep rust / city glow
        const vec3 COL_LOW     = vec3(0.30, 0.07, 0.02);
   
        // ── Helpers ──
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
   
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h   = dir.y;           // -1 (down) … +1 (up)
          float hN  = h * 0.5 + 0.5;  // 0 (ground) … 1 (zenith)
   
          // ── Sky gradient ──
          vec3 sky;
          if (hN > 0.55) {
            sky = mix(COL_MID,     COL_ZENITH,  smoothstep(0.55, 1.0,  hN));
          } else if (hN > 0.25) {
            sky = mix(COL_HORIZON, COL_MID,     smoothstep(0.25, 0.55, hN));
          } else {
            sky = mix(COL_LOW,     COL_HORIZON, smoothstep(0.0,  0.25, hN));
          }
   
          // ── Sun / horizon smog bloom ──
          // The "sun" sits just below the horizon, casting an orange glow up
          vec3 sunDir = normalize(vec3(0.6, -0.08, -0.8));
          float sunDot = dot(dir, sunDir);
          float sunGlow = pow(max(0.0, sunDot), 6.0) * 1.2;
          sky += vec3(1.0, 0.45, 0.05) * sunGlow;
   
          // Wider halo
          float halo = pow(max(0.0, sunDot), 2.5) * 0.35;
          sky += vec3(0.8, 0.2, 0.0) * halo;
   
          // Horizon band — extra smog warmth
          float horizBand = exp(-abs(h) * 4.5) * 0.6;
          sky += vec3(0.7, 0.18, 0.0) * horizBand;
   
          // ── Moon ──
          // A crisp disc high in the sky, cool blue-white with a halo
          vec3 moonDir = normalize(vec3(-0.45, 0.72, -0.53));
          float moonDot = dot(dir, moonDir);
          float moonDisc = smoothstep(0.9985, 0.9990, moonDot);       // disc edge
          float moonHalo = pow(max(0.0, moonDot), 90.0) * 0.4;        // soft halo
          vec3 moonCol = vec3(0.75, 0.88, 1.0);
          sky += moonCol * moonDisc * 3.5;
          sky += moonCol * moonHalo;
   
          // ── God rays / sunburst ──
          // Several thin radial streaks from the sun position
          float angle = atan(dir.x - sunDir.x, dir.z - sunDir.z);
          float rays = abs(sin(angle * 7.0)) * pow(max(0.0, sunDot), 4.0) * 0.18;
          sky += vec3(1.0, 0.5, 0.1) * rays;
   
          // ── Stars ──
          // Only visible above the horizon, fading near the glow
          if (h > 0.05) {
            // Tile space to get point-like stars
            vec2 starUV = floor(dir.xz / (dir.y + 0.001) * 18.0);
            float star = step(0.985, hash(starUV));
            float twinkle = 0.7 + 0.3 * sin(uTime * 2.3 + hash(starUV + 0.1) * 6.28);
            float starMask = smoothstep(0.05, 0.35, h); // fade near horizon
            sky += vec3(0.9, 0.95, 1.0) * star * twinkle * starMask * 0.9;
          }
   
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    });
   
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -1000;
    // Attach an update hook so asg5.js can tick uTime if desired
    // (totally optional — stars twinkle even without it if you call it once)
    mesh.userData.update = (dt) => { mat.uniforms.uTime.value += dt; };
    scene.add(mesh);
   
    // Also push the fog color to match the horizon smog
    scene.fog.color.setRGB(0.18, 0.04, 0.08);
   
    return mesh;
  }




  //-----Signs------------------------------------------------------
  export function buildNeonSigns(scene) {
    // ── Sign data — position, rotation, text lines, color ──
    // Positions are world-space; adjust to taste for your city layout.
    const SIGN_DEFS = [
      // Tall vertical kanji column, right side of street
      {
        pos:   [14, 7, -18],
        rotY:  -0.3,
        lines: ['電', '光', '街', '道'],
        color: '#ff2288',
        vertical: true,
        flicker: true,
        scale: 1.0,
      },
      // Horizontal marquee — left side
      {
        pos:   [-16, 6, -22],
        rotY:  0.25,
        lines: ['ネオン', '東京ナイト'],
        color: '#00eeff',
        vertical: false,
        flicker: false,
        scale: 1.1,
      },
      // Small shop sign — close to player start, angled
      {
        pos:   [8, 4.5, -9],
        rotY:  -1.1,
        lines: ['ラーメン', '24時間'],
        color: '#ffaa00',
        vertical: false,
        flicker: true,
        scale: 0.75,
      },
      // Big backdrop sign — deep in the scene
      {
        pos:   [-6, 10, -38],
        rotY:  0.0,
        lines: ['未来', 'FUTURE'],
        color: '#cc00ff',
        vertical: false,
        flicker: false,
        scale: 1.4,
      },
      // Vertical column on left
      {
        pos:   [-20, 8, -14],
        rotY:  0.5,
        lines: ['酒', '屋', '今', '夜'],
        color: '#00ff88',
        vertical: true,
        flicker: true,
        scale: 0.9,
      },
      // Low sign near dance floor
      {
        pos:   [5, 3.5, 6],
        rotY:  -0.8,
        lines: ['DANCE', 'FLOOR'],
        color: '#ff6600',
        vertical: false,
        flicker: false,
        scale: 0.8,
      },
      // Distant high sign
      {
        pos:   [22, 12, -30],
        rotY:  -0.6,
        lines: ['サイバー', '都市'],
        color: '#ff0066',
        vertical: false,
        flicker: true,
        scale: 1.2,
      },
    ];
   
    const signs = [];
   
    SIGN_DEFS.forEach(def => {
      const sign = _buildOneSign(scene, def);
      signs.push(sign);
    });
   
    // Return an update-able array
    return {
      signs,
      update(dt) {
        const t = performance.now() * 0.001;
        signs.forEach(s => s.update(dt, t));
      },
    };
  }
   
  // ── Internal sign builder ──
  function _buildOneSign(scene, def) {
    const { pos, rotY, lines, color, vertical, flicker, scale } = def;
    const col = new THREE.Color(color);
   
    // ── Canvas texture ──
    const CHAR_PX   = 64;
    const PAD       = 10;
    const lineCount = lines.length;
    const maxLen    = Math.max(...lines.map(l => l.length));
   
    let cvW, cvH;
    if (vertical) {
      // Each character stacked
      cvW = CHAR_PX + PAD * 2;
      cvH = CHAR_PX * lineCount + PAD * 2;
    } else {
      cvW = CHAR_PX * maxLen + PAD * 2;
      cvH = CHAR_PX * lineCount + PAD * 2;
    }
   
    const canvas = document.createElement('canvas');
    canvas.width  = cvW;
    canvas.height = cvH;
    const ctx = canvas.getContext('2d');
   
    // Background — very dark, almost transparent so emissive glow dominates
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, cvW, cvH);
   
    // Neon text glow pass (blurred, thicker)
    ctx.font      = `bold ${CHAR_PX - 8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = '#ffffff';
   
    if (vertical) {
      // Each line is one character (or short string), stacked vertically
      lines.forEach((line, i) => {
        const y = PAD + CHAR_PX * i + CHAR_PX / 2;
        ctx.fillText(line, cvW / 2, y);
      });
    } else {
      lines.forEach((line, i) => {
        const y = PAD + CHAR_PX * i + CHAR_PX / 2;
        ctx.fillText(line, cvW / 2, y);
      });
    }
   
    const tex = new THREE.CanvasTexture(canvas);
   
    // ── Board geometry ──
    const aspect = cvW / cvH;
    const boardH = vertical ? 3.0 * scale : 1.5 * scale;
    const boardW = boardH * aspect;
    const boardD = 0.12;
   
    const boardGeo = new THREE.BoxGeometry(boardW, boardH, boardD);
    const boardMat = new THREE.MeshStandardMaterial({
      color:             new THREE.Color(0x0a0a0a),
      emissive:          col,
      emissiveIntensity: 1.2,
      emissiveMap:       tex,
      roughness:         0.9,
      metalness:         0.2,
    });
   
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(...pos);
    board.rotation.y = rotY;
    board.castShadow = false;
    scene.add(board);
   
    // ── Border trim — thin outline box in the sign color ──
    const trimGeo = new THREE.BoxGeometry(boardW + 0.1, boardH + 0.1, boardD * 0.5);
    const trimMat = new THREE.MeshStandardMaterial({
      color:             col,
      emissive:          col,
      emissiveIntensity: 2.0,
      roughness:         0.5,
      metalness:         0.8,
      wireframe:         true,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(...pos);
    trim.rotation.y = rotY;
    scene.add(trim);
   
    // ── Support pole (for freestanding signs) ──
    if (pos[1] > 5) {
      const poleH   = pos[1] - 0.5;
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, poleH, 6);
      const poleMat = new THREE.MeshStandardMaterial({
        color: 0x222222, roughness: 0.8, metalness: 0.6,
      });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(pos[0], poleH / 2, pos[2]);
      scene.add(pole);
    }
   
    // ── Point light ──
    const light = new THREE.PointLight(col, 1.8, 18, 2.0);
    light.position.set(pos[0], pos[1], pos[2] + 1.5);
    scene.add(light);
   
    // ── Flicker state ──
    let flickerTimer  = 0;
    let flickerActive = false;
    let flickerDelay  = 2 + Math.random() * 6;
    const BASE_INTENSITY = boardMat.emissiveIntensity;
   
    // ── Per-frame update ──
    function update(dt, t) {
      if (!flicker) return;
   
      flickerTimer += dt;
      if (flickerTimer > flickerDelay) {
        flickerTimer  = 0;
        flickerDelay  = 3 + Math.random() * 8;
        flickerActive = true;
      }
   
      if (flickerActive) {
        // Quick strobe — a few fast on/off bursts then back to normal
        const phase = (t * 18) % 1;
        const on    = phase > 0.4;
        const intens = on ? BASE_INTENSITY : 0.0;
        boardMat.emissiveIntensity = intens;
        light.intensity = on ? 1.8 : 0.0;
   
        // Finish flicker after ~0.35 s
        if (flickerTimer > 0.35) {
          flickerActive = false;
          boardMat.emissiveIntensity = BASE_INTENSITY;
          light.intensity = 1.8;
        }
      }
    }
   
    return { board, trim, light, update };
  }





// ── Lights ───────────────────────────────────────────────────────────────────
export function buildLights(scene, CFG) {
  const ambient = new THREE.AmbientLight(0x110033, CFG.ambientIntensity);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x1a0040, 0x330055, CFG.hemiIntensity);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0xaabbff, CFG.moonIntensity);
  moon.position.set(30,80,20);
  moon.castShadow=true;
  moon.shadow.mapSize.set(2048,2048);
  moon.shadow.camera.near=1; moon.shadow.camera.far=300;
  moon.shadow.camera.left=moon.shadow.camera.bottom=-80;
  moon.shadow.camera.right=moon.shadow.camera.top=80;
  scene.add(moon);

  return { ambient, hemi, moon };
}

// ── Ground ───────────────────────────────────────────────────────────────────
export function buildGround(scene) {
  const mesh=new THREE.Mesh(
    new THREE.PlaneGeometry(400,400),
    new THREE.MeshStandardMaterial({map:makeGridTex(512,32,0x050010,0x220044),roughness:.85,metalness:.1})
  );
  mesh.rotation.x=-Math.PI/2; mesh.receiveShadow=true;
  scene.add(mesh);
}

// ── City ─────────────────────────────────────────────────────────────────────
export function buildCity(scene, CFG) {
  const group=new THREE.Group(); scene.add(group);

  function makeWindowTex(){
    const c=document.createElement('canvas'); c.width=128; c.height=256;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#05050f'; ctx.fillRect(0,0,128,256);
    const cols=['#00eeff','#ff00cc','#ffcc00','#00ff88','#ffffff'];
    for(let row=0;row<16;row++) for(let col=0;col<4;col++){
      if(Math.random()>.35){
        ctx.fillStyle=cols[Math.floor(Math.random()*cols.length)];
        ctx.globalAlpha=.4+Math.random()*.6;
        ctx.fillRect(col*32+4,row*16+3,24,10);
      }
    }
    ctx.globalAlpha=1;
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
  }

  const rng=mulberry32(42);
  const rings=[
    {count:12,minR:30, maxR:50, hMin:8, hMax:30},
    {count:20,minR:50, maxR:90, hMin:15,hMax:60},
    {count:18,minR:90, maxR:140,hMin:5, hMax:20},
  ];
  rings.forEach(ring=>{
    for(let i=0;i<ring.count;i++){
      const angle=(i/ring.count)*Math.PI*2+rng()*.4;
      const dist=ring.minR+rng()*(ring.maxR-ring.minR);
      const x=Math.cos(angle)*dist, z=Math.sin(angle)*dist;
      const w=3+rng()*8, d=3+rng()*8, h=ring.hMin+rng()*(ring.hMax-ring.hMin);
      const winT=makeWindowTex(); winT.repeat.set(Math.ceil(w/4),Math.ceil(h/4));
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
        new THREE.MeshStandardMaterial({map:winT,roughness:.7,metalness:.4,
          emissiveMap:winT,emissive:new THREE.Color(0x111122),emissiveIntensity:.3}));
      mesh.position.set(x,h/2,z); mesh.castShadow=mesh.receiveShadow=true; group.add(mesh);
      if(rng()>.5){
        const signs=['NEON','CYBER','SYNTH','WAVE','GRID','PULSE','BASS','RAVE'];
        const signTex=makeNeonTex(signs[Math.floor(rng()*signs.length)]);
        const sw=3+rng()*2, sh=.8+rng()*.5;
        const sign=new THREE.Mesh(new THREE.PlaneGeometry(sw,sh),
          new THREE.MeshStandardMaterial({map:signTex,emissiveMap:signTex,
            emissive:new THREE.Color(0xffffff),emissiveIntensity:1.5,transparent:true}));
        sign.position.set(x,h+.5+sh/2,z); sign.rotation.y=angle; group.add(sign);
        const pl=new THREE.PointLight(LANE_COLORS[Math.floor(rng()*4)],CFG.cityPointBase+rng()*2,20);
        pl.position.set(x,h+1,z); group.add(pl);
      }
      if(rng()>.65){
        const ant=new THREE.Mesh(new THREE.CylinderGeometry(.05,.1,3+rng()*4,8),
          new THREE.MeshStandardMaterial({color:0x333344,metalness:.8}));
        ant.position.set(x+rng()*w*.3,h+2,z+rng()*d*.3); group.add(ant);
      }
    }
  });

  for(let i=-5;i<=5;i++){
    group.add(_makeStreetlight(i*12,0,-15,CFG));
    group.add(_makeStreetlight(i*12,0, 15,CFG));
  }
  return group;
}

function _makeStreetlight(x,y,z,CFG){
  const g=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,5,8),
    new THREE.MeshStandardMaterial({color:0x223333,metalness:.7}));
  pole.position.set(x,2.5,z); pole.castShadow=true; g.add(pole);
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.5,6),
    new THREE.MeshStandardMaterial({color:0x223333,metalness:.7}));
  arm.rotation.z=Math.PI/2; arm.position.set(x+.75,5,z); g.add(arm);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.18,8,8),
    new THREE.MeshStandardMaterial({color:0xffffff,emissive:new THREE.Color(0xaaddff),emissiveIntensity:4}));
  lamp.position.set(x+1.5,5,z); g.add(lamp);
  const pl=new THREE.PointLight(0xaaddff,CFG.streetlampIntensity,22);
  pl.position.set(x+1.5,4.8,z); g.add(pl);
  return g;
}

// ── Dance floor ──────────────────────────────────────────────────────────────
export function buildDanceFloor(scene, CFG) {
  const orbs=[], orbLights=[];

  const floorTex = makeGridTex(512,8,0x0a0020,0x00ffff);
  const base=new THREE.Mesh(new THREE.BoxGeometry(12,.3,20),
    new THREE.MeshStandardMaterial({map:floorTex,roughness:.2,metalness:.6,
      emissiveMap:floorTex,emissive:new THREE.Color(0x002233),emissiveIntensity:.4}));
  base.position.set(0,.15,0); base.receiveShadow=true; scene.add(base);

  [-6,6].forEach(xOff=>{
    const trim=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,20,12),
      new THREE.MeshStandardMaterial({color:0x00ffff,emissive:new THREE.Color(0x00ffff),emissiveIntensity:2}));
    trim.rotation.x=Math.PI/2; trim.position.set(xOff,.3,0); scene.add(trim);
    const el=new THREE.PointLight(0x00ffff,1.5,10); el.position.set(xOff,1,0); scene.add(el);
  });

  const tBase=new THREE.Mesh(new THREE.BoxGeometry(8,.1,3),
    new THREE.MeshStandardMaterial({color:0x110033,roughness:.3,metalness:.5}));
  tBase.position.set(0,.25,-8); scene.add(tBase);

  const floorSpot=new THREE.SpotLight(0xffffff,CFG.floorSpotIntensity,55,Math.PI/5,.3,1);
  floorSpot.position.set(0,20,0); floorSpot.target.position.set(0,0,-8);
  floorSpot.castShadow=true; scene.add(floorSpot); scene.add(floorSpot.target);

  const spot2=new THREE.SpotLight(0xff00cc,3,35,Math.PI/6,.5,1);
  spot2.position.set(-8,15,-5); spot2.target.position.set(0,0,-8);
  scene.add(spot2); scene.add(spot2.target);

  const spot3=new THREE.SpotLight(0x00ffcc,3,35,Math.PI/6,.5,1);
  spot3.position.set(8,15,-5); spot3.target.position.set(0,0,-8);
  scene.add(spot3); scene.add(spot3.target);

  [[-5,-10],[5,-10],[-5,8],[5,8]].forEach(([px,pz])=>{
    const p=new THREE.Mesh(new THREE.CylinderGeometry(.2,.25,6,12),
      new THREE.MeshStandardMaterial({color:0x112233,metalness:.8,roughness:.2}));
    p.position.set(px,3,pz); p.castShadow=true; scene.add(p);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.4,.06,8,20),
      new THREE.MeshStandardMaterial({color:0x00ffff,emissive:new THREE.Color(0x00ffff),emissiveIntensity:2}));
    ring.position.set(px,5.5,pz); scene.add(ring);
  });

  [[-4,4],[-4,-12],[4,4],[4,-12]].forEach(([px,pz],i)=>{
    const orb=new THREE.Mesh(new THREE.SphereGeometry(.25,16,16),
      new THREE.MeshStandardMaterial({color:LANE_COLORS[i],emissive:new THREE.Color(LANE_COLORS[i]),
        emissiveIntensity:2,roughness:.1,metalness:.5}));
    orb.position.set(px,3,pz); scene.add(orb);
    orbs.push({mesh:orb,baseY:3,phase:i*Math.PI/2});
    const ol=new THREE.PointLight(LANE_COLORS[i],1,8); ol.position.copy(orb.position);
    orbLights.push(ol); scene.add(ol);
  });

  return {floorSpot, orbs, orbLights};
}

// ── World extras (rings, holo-cube, speakers, disco ball) ────────────────────
export function buildWorldExtras(scene) {
  const floatingRings=[], discoRef={mesh:null,light:null}, holoCubeRef={mesh:null};

  for(let i=0;i<3;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.5+i*.5,.06,8,40),
      new THREE.MeshStandardMaterial({color:LANE_COLORS[i%4],emissive:new THREE.Color(LANE_COLORS[i%4]),emissiveIntensity:1.5}));
    ring.position.set(0,6+i*1.2,-4); ring.rotation.x=Math.PI/2;
    floatingRings.push({mesh:ring,phase:i*Math.PI*.66}); scene.add(ring);
  }

  const octa=new THREE.Mesh(new THREE.OctahedronGeometry(.8,0),
    new THREE.MeshStandardMaterial({color:0x00ffff,emissive:new THREE.Color(0x00ffff),emissiveIntensity:1,wireframe:true}));
  octa.position.set(0,3.5,-4); holoCubeRef.mesh=octa; scene.add(octa);

  for(let i=0;i<8;i++){
    const ang=(i/8)*Math.PI*2, r=8;
    const cone=new THREE.Mesh(new THREE.ConeGeometry(.15,.6,8),
      new THREE.MeshStandardMaterial({color:LANE_COLORS[i%4],emissive:new THREE.Color(LANE_COLORS[i%4]),emissiveIntensity:1}));
    cone.position.set(Math.cos(ang)*r,.3,Math.sin(ang)*r-4); scene.add(cone);
  }

  [[-7,0,-2],[7,0,-2]].forEach(([sx,,sz])=>{
    const spk=new THREE.Mesh(new THREE.BoxGeometry(1.5,2.5,1.2),
      new THREE.MeshStandardMaterial({color:0x111111,roughness:.9}));
    spk.position.set(sx,1.25,sz); spk.castShadow=true; scene.add(spk);
    const woof=new THREE.Mesh(new THREE.CircleGeometry(.5,16),
      new THREE.MeshStandardMaterial({color:0x222222,roughness:.5,side:THREE.DoubleSide}));
    woof.position.set(sx,1.5,sz+.61); scene.add(woof);
    const tweet=new THREE.Mesh(new THREE.CircleGeometry(.15,12),
      new THREE.MeshStandardMaterial({color:0x444444,roughness:.5,side:THREE.DoubleSide}));
    tweet.position.set(sx,2.4,sz+.61); scene.add(tweet);
  });

  const disco=new THREE.Mesh(new THREE.IcosahedronGeometry(.6,1),
    new THREE.MeshStandardMaterial({color:0xcccccc,metalness:1,roughness:0,emissive:new THREE.Color(0x111111)}));
  disco.position.set(0,8,-8); discoRef.mesh=disco; scene.add(disco);
  const discoPL=new THREE.PointLight(0xffffff,2,12); discoPL.position.copy(disco.position);
  scene.add(discoPL); discoRef.light=discoPL;

  return {floatingRings, discoRef, holoCubeRef};
}

// ── GLB / fallback car ───────────────────────────────────────────────────────
export function loadModel(scene) {
  const loader=new GLTFLoader();
  loader.load('models/model.glb',
    gltf=>{
      const m=gltf.scene; m.scale.setScalar(4.5); m.position.set(12,1.3,5); m.rotation.y=-Math.PI/4;
      m.traverse(c=>{if(c.isMesh){c.castShadow=c.receiveShadow=true;}});
      scene.add(m);
    },
    undefined,
    ()=>{
      const g=new THREE.Group();
      const body=new THREE.Mesh(new THREE.BoxGeometry(3.5,.7,1.5),
        new THREE.MeshStandardMaterial({color:0x110033,metalness:.9,roughness:.2,
          emissive:new THREE.Color(0x220044),emissiveIntensity:.5}));
      body.position.y=.5; g.add(body);
      const cab=new THREE.Mesh(new THREE.BoxGeometry(2,.6,1.4),
        new THREE.MeshStandardMaterial({color:0x090018,metalness:.9,roughness:.1}));
      cab.position.set(-.2,1.05,0); g.add(cab);
      [[1.2,0,.85],[1.2,0,-.85],[-1.2,0,.85],[-1.2,0,-.85]].forEach(([wx,,wz])=>{
        const w=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.25,16),
          new THREE.MeshStandardMaterial({color:0x111111,metalness:.5}));
        w.rotation.x=Math.PI/2; w.position.set(wx,.35,wz); g.add(w);
      });
      const under=new THREE.Mesh(new THREE.BoxGeometry(3.6,.04,1.6),
        new THREE.MeshStandardMaterial({color:0x00ffcc,emissive:new THREE.Color(0x00ffcc),emissiveIntensity:3}));
      under.position.y=.15; g.add(under);
      const ul=new THREE.PointLight(0x00ffcc,2,6); ul.position.y=.2; g.add(ul);
      g.position.set(12,0,5); g.rotation.y=-Math.PI/4; scene.add(g);
    }
  );
}