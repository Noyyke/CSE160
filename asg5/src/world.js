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
  const skyGeo = new THREE.SphereGeometry(300,32,16);
  const skyMat = new THREE.ShaderMaterial({
    side:THREE.BackSide,
    uniforms:{
      topColor:   {value:new THREE.Color(0x000d28)},
      bottomColor:{value:new THREE.Color(0x330055)},
      midColor:   {value:new THREE.Color(0x0d0050)},
    },
    vertexShader:`varying vec3 vWorldPos;
      void main(){vWorldPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform vec3 topColor,bottomColor,midColor;varying vec3 vWorldPos;
      void main(){float t=clamp((vWorldPos.y+100.0)/200.0,0.0,1.0);
        vec3 col=mix(bottomColor,midColor,smoothstep(0.0,0.35,t));
        col=mix(col,topColor,smoothstep(0.35,1.0,t));gl_FragColor=vec4(col,1.0);}`,
  });
  scene.add(new THREE.Mesh(skyGeo,skyMat));

  const N=4000, pos=new Float32Array(N*3), col=new Float32Array(N*3);
  const pal=[[1,1,1],[.6,.8,1],[1,.85,.6],[.9,.5,1],[.5,1,.9]];
  for(let i=0;i<N;i++){
    const th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1), r=280;
    pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=r*Math.abs(Math.cos(ph)); pos[i*3+2]=r*Math.sin(ph)*Math.sin(th);
    const c=pal[Math.floor(Math.random()*pal.length)];
    col[i*3]=c[0]; col[i*3+1]=c[1]; col[i*3+2]=c[2];
  }
  const sg=new THREE.BufferGeometry();
  sg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  sg.setAttribute('color',new THREE.BufferAttribute(col,3));
  scene.add(new THREE.Points(sg,new THREE.PointsMaterial({
    vertexColors:true,size:1.6,sizeAttenuation:true,transparent:true,opacity:.92
  })));

  const nebulas=[
    {color:'#ff00cc',yRot:.4, xRot:.18,x: 60,y: 90,z:-180},
    {color:'#00aaff',yRot:-.5,xRot:.12,x:-80,y: 70,z:-160},
    {color:'#8800ff',yRot:1.1,xRot:.08,x: 20,y:110,z: 150},
  ];
  nebulas.forEach(n=>{
    const cv=document.createElement('canvas'); cv.width=512; cv.height=256;
    const ctx=cv.getContext('2d');
    const g=ctx.createLinearGradient(0,0,512,256);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.4,n.color+'aa');
    g.addColorStop(.6,n.color+'88');   g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,512,256);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(200,100),
      new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,opacity:.28,
        side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
    mesh.position.set(n.x,n.y,n.z); mesh.rotation.y=n.yRot; mesh.rotation.x=n.xRot;
    scene.add(mesh);
  });
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