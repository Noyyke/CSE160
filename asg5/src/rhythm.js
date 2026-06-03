// rhythm.js — arrow pool, hit detection, scoring, chart playback
import * as THREE from 'three';

export const LANE_COUNT  = 4;
export const LANE_COLORS = [0x00ffff, 0xff00aa, 0x00ff88, 0xffcc00];
export const LANE_LABELS = ['◄','▼','▲','►'];
export const LANE_X      = [-1.5, -0.5, 0.5, 1.5];
export const LANE_ROT_Z  = [Math.PI/2, Math.PI, 0, -Math.PI/2];

const HIGHWAY_LEN       = 40;
const TARGET_Z          = -8;
const HIT_WINDOW        = 0.18;
const PERFECT_WIN       = 0.07;
const APPROACH_BEATS    = 2.5;
const BPM_DEFAULT       = 128;
const HOLD_END_BONUS    = 150;
const HOLD_BODY_SCALE   = 0.58;
const HOLD_BODY_MIN_LEN = 0.55;
const WRONG_PRESS_CD    = 0.1;
const GHOST_TRAVEL      = 6;    // units past target before recycling missed notes

let arrowSpeed = 14;
let travelTime = HIGHWAY_LEN / arrowSpeed;

export function applyApproachTiming(bpm) {
  const b = bpm || BPM_DEFAULT;
  travelTime = (60 / b) * APPROACH_BEATS;
  arrowSpeed = HIGHWAY_LEN / travelTime;
}
applyApproachTiming(BPM_DEFAULT);

export const getTravelTime = () => travelTime;
export const getArrowSpeed = () => arrowSpeed;

// ── Shared arrow shape ────────────────────────────────────────────────────────
function makeArrowShape() {
  const s = new THREE.Shape();
  s.moveTo(0,.5); s.lineTo(.35,.05); s.lineTo(.15,.05);
  s.lineTo(.15,-.5); s.lineTo(-.15,-.5); s.lineTo(-.15,.05); s.lineTo(-.35,.05);
  s.closePath();
  return s;
}

// ── Pool builder ─────────────────────────────────────────────────────────────
const POOL_SIZE = 80;
const HOLD_POOL = 24;

function buildPools(scene) {
  const _arrowGeos=[], _arrowMats=[], _holdBodyGeos=[], _holdBodyMats=[];
  const arrowPool=[], holdBodyPool=[];

  const arrowExt={depth:.12,bevelEnabled:true,bevelThickness:.03,bevelSize:.03,bevelSegments:3};
  const holdExt ={depth:1,  bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:2,curveSegments:4};

  for(let lane=0;lane<LANE_COUNT;lane++){
    const ag=new THREE.ExtrudeGeometry(makeArrowShape(),arrowExt); ag.center(); _arrowGeos.push(ag);
    _arrowMats.push(new THREE.MeshStandardMaterial({
      color:LANE_COLORS[lane],emissive:new THREE.Color(LANE_COLORS[lane]),
      emissiveIntensity:1.5,roughness:.1,metalness:.6}));
    const hg=new THREE.ExtrudeGeometry(makeArrowShape(),holdExt); hg.center(); _holdBodyGeos.push(hg);
    _holdBodyMats.push(new THREE.MeshStandardMaterial({
      color:LANE_COLORS[lane],emissive:new THREE.Color(LANE_COLORS[lane]),emissiveIntensity:.95,
      roughness:.15,metalness:.5,transparent:true,opacity:.88}));
  }

  // Shared grayscale material for missed notes
  const _missedMat = new THREE.MeshStandardMaterial({
    color: 0x444444, emissive: new THREE.Color(0x222222),
    emissiveIntensity: 0.3, roughness: 0.6, metalness: 0.3,
    transparent: true, opacity: 0.5,
  });

  for(let i=0;i<POOL_SIZE;i++){
    const lane=i%LANE_COUNT;
    const m=new THREE.Mesh(_arrowGeos[lane],_arrowMats[lane]);
    m.rotation.z=LANE_ROT_Z[lane]; m.visible=false; m.castShadow=false; m.userData.lane=lane;
    scene.add(m); arrowPool.push(m);
  }
  for(let i=0;i<HOLD_POOL;i++){
    const lane=i%LANE_COUNT;
    const m=new THREE.Mesh(_holdBodyGeos[lane],_holdBodyMats[lane]);
    m.rotation.z=LANE_ROT_Z[lane]; m.visible=false; m.castShadow=false;
    scene.add(m); holdBodyPool.push(m);
  }

  return {arrowPool, holdBodyPool, _arrowMats, _holdBodyMats, _missedMat};
}

// ── Target zones ─────────────────────────────────────────────────────────────
export function buildTargetZones(scene) {
  const targetZones=[], targetLights=[];
  const ext={depth:.08,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:3};
  for(let i=0;i<LANE_COUNT;i++){
    const geo=new THREE.ExtrudeGeometry(makeArrowShape(),ext); geo.center();
    const mat=new THREE.MeshStandardMaterial({
      color:LANE_COLORS[i],emissive:new THREE.Color(LANE_COLORS[i]),emissiveIntensity:.3,
      roughness:.2,metalness:.5,transparent:true,opacity:.6});
    const mesh=new THREE.Mesh(geo,mat);
    mesh.rotation.z=LANE_ROT_Z[i]; mesh.position.set(LANE_X[i],.7,TARGET_Z);
    scene.add(mesh); targetZones.push(mesh);
    const pl=new THREE.PointLight(LANE_COLORS[i],0,4);
    pl.position.set(LANE_X[i],1.1,TARGET_Z);
    scene.add(pl); targetLights.push(pl);
  }
  return {targetZones, targetLights};
}

// ── Arrow position math ───────────────────────────────────────────────────────
function arrowZAt(st, spawnTime) {
  return (TARGET_Z - HIGHWAY_LEN) + (st - spawnTime) * arrowSpeed;
}

function getPooledArrow(pool, mats, lane) {
  for(const a of pool) if(!a.visible && a.userData.lane===lane){a.visible=true;return a;}
  for(const a of pool) if(!a.visible){
    a.userData.lane=lane; a.material=mats[lane]; a.rotation.z=LANE_ROT_Z[lane]; a.visible=true; return a;
  }
  return null;
}

function getPooledHoldBody(pool, mats, lane) {
  for(const b of pool) if(!b.visible && b.userData.bodyLane===lane){b.material=mats[lane];return b;}
  for(const b of pool) if(!b.visible){
    b.userData.bodyLane=lane; b.material=mats[lane]; b.rotation.z=LANE_ROT_Z[lane]; return b;
  }
  return null;
}

function updateHoldBodyVisual(arrow, holdPool, holdMats) {
  if(!arrow.userData.isHold) return;
  const headZ=arrow.position.z, lane=arrow.userData.lane;
  const len=Math.max(arrow.userData.duration*arrowSpeed, HOLD_BODY_MIN_LEN);
  if(arrow.userData._bodyLen===len && arrow.userData._bodyHeadZ===headZ) return;
  arrow.userData._bodyHeadZ=headZ; arrow.userData._bodyLen=len;
  let body=arrow.userData.holdBody;
  if(!body){
    body=getPooledHoldBody(holdPool,holdMats,lane);
    if(!body) return;
    arrow.userData.holdBody=body;
  }
  body.material=holdMats[lane]; body.rotation.z=LANE_ROT_Z[lane];
  body.scale.set(HOLD_BODY_SCALE,HOLD_BODY_SCALE,len);
  body.position.set(LANE_X[lane],.82,headZ-len*.5);
  body.visible=true;
}

function releaseHoldBody(arrow) {
  const body=arrow.userData.holdBody; if(!body) return;
  body.visible=false; body.scale.set(1,1,1); arrow.userData.holdBody=null;
}

// ── RhythmGame ────────────────────────────────────────────────────────────────
export class RhythmGame {
  constructor(scene) {
    this.scene=scene;
    const {arrowPool,holdBodyPool,_arrowMats,_holdBodyMats,_missedMat}=buildPools(scene);
    this._arrowPool=arrowPool; this._holdBodyPool=holdBodyPool;
    this._arrowMats=_arrowMats; this._holdBodyMats=_holdBodyMats;
    this._missedMat=_missedMat;
    const {targetZones,targetLights}=buildTargetZones(scene);
    this.targetZones=targetZones; this.targetLights=targetLights;

    this.activeArrows=[];
    this.score=0; this.combo=0; this.maxCombo=0;
    this.perfects=0; this.goods=0; this.misses=0; this.totalNotes=0;
    this.lanePressed=[false,false,false,false];
    this._lastWrongPress=-1;

    /** @type {(text:string, color:string)=>void} */
    this.onJudge=null;
    /** @type {()=>void} */
    this.onEnd=null;

    this.audioCtx=null; this.audioDestination=null; this.songBuffer=null; this.songSource=null;
    this.songAudioStartCtx=0; this.useAudioClock=false; this.songStartWall=0;
    this.audioHitLatency=0.05;

    this.chart=null; this.noteIndex=0;
    this.randomActive=false; this.beatTimer=0; this.bpm=BPM_DEFAULT;
    this.beatInterval=60/BPM_DEFAULT;
    this._endGameTimer=null;
  }

  // ── Time ────────────────────────────────────────────────────────────────────
  songTime() {
    let t=0;
    if(this.useAudioClock && this.audioCtx)
      t=this.audioCtx.currentTime-this.songAudioStartCtx;
    else if(this.songStartWall)
      t=(performance.now()-this.songStartWall)/1000;
    return Math.max(0, t-this.audioHitLatency);
  }

  // ── Session control ─────────────────────────────────────────────────────────
  resetStats() {
    this.score=0; this.combo=0; this.maxCombo=0;
    this.perfects=0; this.goods=0; this.misses=0; this.totalNotes=0;
    this.noteIndex=0; this._lastWrongPress=-1;
    if(this._endGameTimer){clearTimeout(this._endGameTimer);this._endGameTimer=null;}
  }

  startRandom(bpm) {
    this.bpm=bpm||BPM_DEFAULT; this.beatInterval=60/this.bpm;
    applyApproachTiming(this.bpm);
    this.randomActive=true; this.beatTimer=0;
    this.songStartWall=performance.now();
  }

  startChart(chart, songBuffer) {
    this.chart=chart; this.noteIndex=0;
    if(chart.bpm){this.bpm=chart.bpm; this.beatInterval=60/this.bpm;}
    applyApproachTiming(this.bpm);
    this.randomActive=false;
    if(songBuffer && this.audioCtx){
      this._startAudio(songBuffer);
    } else {
      this.songStartWall=performance.now();
    }
  }

  _startAudio(buf) {
    this.stopAudio();
    const go=()=>{
      this.songSource=this.audioCtx.createBufferSource();
      this.songSource.buffer=buf;
      const dest = this.audioDestination || this.audioCtx.destination;
      this.songSource.connect(dest);
      this.songAudioStartCtx=this.audioCtx.currentTime;
      this.useAudioClock=true;
      this.songSource.start(0,0);
      this.songSource.onended=()=>{
        if(this.noteIndex>=(this.chart?.notes.length||0) && this.activeArrows.length===0)
          this._scheduleEnd();
      };
    };
    if(this.audioCtx.state==='suspended') this.audioCtx.resume().then(go); else go();
  }

  stopAudio() {
    if(this.songSource){try{this.songSource.stop();this.songSource.disconnect();}catch(e){}}
    this.songSource=null; this.useAudioClock=false;
  }

  stopAll() {
    this.stopAudio();
    this.randomActive=false; this.songStartWall=0;
    if(this._endGameTimer){clearTimeout(this._endGameTimer);this._endGameTimer=null;}
    [...this.activeArrows].forEach(a=>this._recycle(a));
  }

  _scheduleEnd() {
    if(this._endGameTimer) return;
    this._endGameTimer=setTimeout(()=>{if(this.onEnd) this.onEnd();},800);
  }

  // ── Per-frame update ────────────────────────────────────────────────────────
  update(dt) {
    const st=this.songTime();

    if(this.randomActive){
      this.beatTimer+=dt;
      if(this.beatTimer>=this.beatInterval){
        this.beatTimer-=this.beatInterval;
        const count=Math.random()<.3?2:1, lanes=[];
        while(lanes.length<count){const l=Math.floor(Math.random()*4);if(!lanes.includes(l))lanes.push(l);}
        lanes.forEach(l=>this._spawnNote({lane:l,time:st+travelTime,duration:0}));
      }
    }

    if(this.chart && !this.randomActive){
      while(this.noteIndex<this.chart.notes.length){
        const note=this.chart.notes[this.noteIndex];
        if(note.time-travelTime<=st){
          if(this._spawnNote({lane:note.lane,time:note.time,duration:note.duration||0}))
            this.noteIndex++;
          else break;
        } else break;
      }
      if(this.noteIndex>=this.chart.notes.length && this.activeArrows.length===0 && !this._endGameTimer)
        this._scheduleEnd();
    }

    this._updateHoldStates(st);

    // How far past the target line before a note is considered missed
    const missThreshold = TARGET_Z + HIT_WINDOW * arrowSpeed + 0.05;

    for(let i=this.activeArrows.length-1;i>=0;i--){
      const arrow=this.activeArrows[i];
      const elapsed=st-arrow.userData.spawnTime;
      arrow.position.z=arrowZAt(st,arrow.userData.spawnTime);
      arrow.position.y=.84+Math.sin(elapsed*3)*.04;

      if(arrow.userData.isHold){
        if(!arrow.userData.missed){
          updateHoldBodyVisual(arrow,this._holdBodyPool,this._holdBodyMats);
        }
        // Miss trigger — hold was never started
        if(!arrow.userData.holdStarted && !arrow.userData.missed && arrow.position.z>missThreshold){
          this._failHold(arrow,false);
        }
        // Ghost drift then recycle
        if(arrow.userData.missed && arrow.position.z>TARGET_Z+GHOST_TRAVEL){
          this._recycle(arrow); i--;
        }
        continue;
      }

      // Tap note — mark missed once past the late window
      if(!arrow.userData.hit && !arrow.userData.missed && arrow.position.z>missThreshold){
        arrow.userData.missed=true; this.misses++; this.combo=0;
        this._judge('MISS','#ff4444');
        arrow.material=this._missedMat;  // go gray
        releaseHoldBody(arrow);
      }
      // Keep drifting, recycle once off-screen
      if(arrow.userData.missed && arrow.position.z>TARGET_Z+GHOST_TRAVEL){
        this._recycle(arrow); i--;
      }
    }
  }

  // ── Spawning ────────────────────────────────────────────────────────────────
  _spawnNote({lane,time,duration=0}){
    const arrow=getPooledArrow(this._arrowPool,this._arrowMats,lane);
    if(!arrow) return false;
    const st=this.songTime(), spawnTime=time-travelTime;
    arrow.position.set(LANE_X[lane],.84,arrowZAt(st,spawnTime));
    Object.assign(arrow.userData,{
      spawnTime,targetTime:time,endTime:time+duration,duration,
      isHold:duration>0,holdStarted:false,holdDone:false,
      hit:false,missed:false,holdBody:null
    });
    if(duration>0) updateHoldBodyVisual(arrow,this._holdBodyPool,this._holdBodyMats);
    this.activeArrows.push(arrow); this.totalNotes++; return true;
  }

  _recycle(arrow){
    releaseHoldBody(arrow);
    // Restore lane color so the mesh can be reused from the pool
    arrow.material=this._arrowMats[arrow.userData.lane];
    arrow.userData._bodyHeadZ=undefined; arrow.userData._bodyLen=undefined;
    arrow.visible=false; arrow.userData.holdStarted=false;
    const idx=this.activeArrows.indexOf(arrow);
    if(idx>=0) this.activeArrows.splice(idx,1);
  }

  // ── Hit detection ────────────────────────────────────────────────────────────
  pressLane(lane){
    if(this.lanePressed[lane]) return;
    this.lanePressed[lane]=true;
    const t=this.songTime();
    const hittable=this.activeArrows.filter(a=>{
      if(a.userData.missed) return false;
      if(a.userData.isHold && a.userData.holdStarted) return false;
      if(!a.userData.isHold && a.userData.hit) return false;
      return Math.abs(t-a.userData.targetTime)<=HIT_WINDOW;
    });
    const onLane=hittable.filter(a=>a.userData.lane===lane);
    if(!onLane.length){
      if(hittable.length){
        this._punish();
      } else {
        const nearMiss=this.activeArrows.some(a=>{
          if(a.userData.lane!==lane||a.userData.missed) return false;
          const d=Math.abs(t-a.userData.targetTime);
          return d>HIT_WINDOW && d<=HIT_WINDOW*1.4;
        });
        if(nearMiss) this._judge('EARLY','#ff8844');
        this._flashTarget(lane,.2);
      }
      return;
    }
    let best=null, bestD=Infinity;
    for(const a of onLane){const d=Math.abs(t-a.userData.targetTime);if(d<bestD){bestD=d;best=a;}}
    if(best.userData.isHold){
      best.userData.holdStarted=best.userData.hit=true;
      this._scoreHit(bestD); this._flashTarget(lane,1.5);
    } else {
      best.userData.hit=true;
      const f=this._scoreHit(bestD); this._flashTarget(lane,f); this._recycle(best);
    }
  }

  releaseLane(lane){ this.lanePressed[lane]=false; }

  _scoreHit(delta){
    this.combo++; if(this.combo>this.maxCombo) this.maxCombo=this.combo;
    if(delta<=PERFECT_WIN){
      this.score+=300+this.combo*10; this.perfects++;
      this._judge('PERFECT!','#ffdd00'); return 1.5;
    }
    this.score+=100+this.combo*5; this.goods++;
    this._judge('GOOD','#00ffcc'); return .8;
  }

  _punish(){
    const t=this.songTime();
    if(t-this._lastWrongPress<WRONG_PRESS_CD) return;
    this._lastWrongPress=t; this.combo=0; this._judge('WRONG','#ff4444');
  }

  _updateHoldStates(st){
    for(let i=this.activeArrows.length-1;i>=0;i--){
      const a=this.activeArrows[i];
      if(!a.userData.isHold||a.userData.missed) continue;
      const lane=a.userData.lane;
      if(!a.userData.holdStarted) continue;
      if(!this.lanePressed[lane]){this._failHold(a,true);i--;continue;}
      if(st>=a.userData.endTime){
        a.userData.holdDone=true; this.combo++;
        if(this.combo>this.maxCombo) this.maxCombo=this.combo;
        this.score+=HOLD_END_BONUS+this.combo*5;
        this._judge('HOLD!','#88ff00'); this._flashTarget(lane,1.2); this._recycle(a); i--;
      } else {
        this.targetLights[lane].intensity=1.2+Math.sin(st*12)*.4;
        this.targetZones[lane].material.emissiveIntensity=1.0;
      }
    }
  }

  _failHold(arrow,earlyRelease){
    if(arrow.userData.missed) return;
    arrow.userData.missed=true; this.misses++; this.combo=0;
    this._judge(earlyRelease?'HOLD BREAK':'MISS','#ff4444');
    this.targetLights[arrow.userData.lane].intensity=0;
    this.targetZones[arrow.userData.lane].material.emissiveIntensity=.3;
    arrow.material=this._missedMat;  // go gray instead of instant recycle
    releaseHoldBody(arrow);          // hide the hold tail
  }

  _flashTarget(lane,intensity){
    this.targetLights[lane].intensity=intensity*4;
    this.targetZones[lane].material.emissiveIntensity=intensity*2;
    setTimeout(()=>{
      this.targetLights[lane].intensity=0;
      this.targetZones[lane].material.emissiveIntensity=.3;
    },150);
  }

  _judge(text,color){
    if(this.onJudge) this.onJudge(text,color);
  }
}