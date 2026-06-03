// ============================================================
//  asg5.js  —  Neon Rhythm  (Three.js r184)
//  Orchestrator: imports from look.js, world.js, rhythm.js
// ============================================================

import * as THREE from 'three';
import { Look } from './look.js';
import {
  buildSkybox, buildLights, buildGround,
  buildCity, buildDanceFloor, buildWorldExtras, loadModel,
} from './world.js';
import { RhythmGame, applyApproachTiming, LANE_X, LANE_ROT_Z } from './rhythm.js';

// ─────────────────────────────────────────────
//  ★ TUNING
// ─────────────────────────────────────────────
const CFG = {
  mouseSensitivity:   0.0012,  // radians per pixel
  moveSpeed:          9,
  ambientIntensity:   1.2,
  hemiIntensity:      0.9,
  moonIntensity:      0.7,
  floorSpotIntensity: 7,
  cityPointBase:      2.5,
  streetlampIntensity:1.8,
};

// ─────────────────────────────────────────────
//  Renderer / Scene / Camera
// ─────────────────────────────────────────────
const canvas   = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(960, 540);
renderer.shadowMap.enabled      = true;
renderer.shadowMap.type         = THREE.PCFShadowMap;
renderer.toneMapping            = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure    = 0.9;

const scene  = new THREE.Scene();
scene.fog    = new THREE.FogExp2(0x080010, 0.018);

const camera = new THREE.PerspectiveCamera(70, 16/9, 0.1, 500);
camera.position.set(0, 1.7, 20);
// NOTE: do NOT add camera to scene — Look drives it directly via quaternion

// ─────────────────────────────────────────────
//  Build world
// ─────────────────────────────────────────────
buildSkybox(scene);
buildGround(scene);
const { moon: moonLight } = buildLights(scene, CFG);
const cityGroup = buildCity(scene, CFG);
const { floorSpot, orbs, orbLights } = buildDanceFloor(scene, CFG);
const { floatingRings, discoRef, holoCubeRef } = buildWorldExtras(scene);
loadModel(scene);

// ─────────────────────────────────────────────
//  Rhythm engine
// ─────────────────────────────────────────────
const rhythm = new RhythmGame(scene);
rhythm.onJudge = showJudge;
rhythm.onEnd   = endGame;

// ─────────────────────────────────────────────
//  Look controller  (fixes the snap bug)
// ─────────────────────────────────────────────
const look = new Look(camera, canvas, CFG.mouseSensitivity);

canvas.addEventListener('click', () => {
  if (gameState === STATES.EXPLORE || gameState === STATES.PROMPT) look.lock();
});

canvas.addEventListener('lock', () => { /* locked — nothing extra needed */ });
canvas.addEventListener('unlock', () => {
  vel.set(0,0,0);
  moveF=moveB=moveL=moveR=moveU=moveD=false;
  if (!_programmingUnlock && gameState === STATES.PLAYING) exitGame();
  _programmingUnlock = false;
});

// ─────────────────────────────────────────────
//  Movement
// ─────────────────────────────────────────────
const vel  = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _rgt = new THREE.Vector3();
let moveF=false, moveB=false, moveL=false, moveR=false, moveU=false, moveD=false;
let _programmingUnlock = false;

// ─────────────────────────────────────────────
//  Game state
// ─────────────────────────────────────────────
const STATES = { EXPLORE:'explore', PROMPT:'prompt', SONGSELECT:'songselect', PLAYING:'playing', RESULT:'result' };
let gameState = STATES.EXPLORE;

let activeSongId = 'random';
let _endGameTimer = null;

const FLOOR_POS    = new THREE.Vector2(0, 0);
const PROXIMITY_R  = 7;

const GAME_CAM_POS = new THREE.Vector3(0, 2.5, 2);
const GAME_CAM_ROT = new THREE.Euler(-0.18, 0, 0, 'YXZ');
let exploreCamPos  = new THREE.Vector3();
let exploreCamQuat = new THREE.Quaternion();
let _playPixelRatio= 1;

// ─────────────────────────────────────────────
//  HUD elements
// ─────────────────────────────────────────────
const hudEl    = document.getElementById('hud');
const scoreEl  = document.getElementById('hud-score');
const comboEl  = document.getElementById('hud-combo');
const judgeEl  = document.getElementById('hud-judge');
const promptEl = document.getElementById('hud-prompt');
const resultEl = document.getElementById('hud-result');
const songSelEl= document.getElementById('hud-songselect');

let judgeTimer = 0;
let _hudDirty  = true;

function showJudge(text, color) {
  judgeEl.textContent = text;
  judgeEl.style.color = color;
  judgeEl.style.opacity = '1';
  judgeEl.style.transform = 'translateX(-50%) scale(1.3)';
  judgeTimer = 0.6;
  pulseHoloCube(color);
}

function updateHUD() {
  if (!_hudDirty) return;
  _hudDirty = false;
  scoreEl.textContent = rhythm.score.toString().padStart(7,'0');
  comboEl.textContent = rhythm.combo > 1 ? `${rhythm.combo}x` : '';
}

// ─────────────────────────────────────────────
//  Holo-cube pulse
// ─────────────────────────────────────────────
const holoBaseColor    = new THREE.Color(0x00ffff);
const _holoPulseColor  = new THREE.Color();
const HOLO_PULSE_DUR   = 0.55;
let holoPulseTimer     = 0;

function pulseHoloCube(hexColor) {
  if (!holoCubeRef.mesh) return;
  _holoPulseColor.set(hexColor);
  holoPulseTimer = HOLO_PULSE_DUR;
}

function updateHoloCube(dt, t) {
  const mesh = holoCubeRef.mesh; if(!mesh) return;
  mesh.rotation.x += 0.01; mesh.rotation.y += 0.007;
  mesh.position.y = 3.5 + Math.sin(t * 0.8) * 0.2;
  const mat = mesh.material;
  if (holoPulseTimer > 0) {
    holoPulseTimer -= dt;
    const blend = Math.min(1, holoPulseTimer / HOLO_PULSE_DUR);
    mat.emissive.copy(_holoPulseColor); mat.color.copy(_holoPulseColor);
    mat.emissiveIntensity = 1 + blend * 2.5;
  } else {
    mat.emissive.lerp(holoBaseColor, 0.1); mat.color.lerp(holoBaseColor, 0.1);
    mat.emissiveIntensity += (1 - mat.emissiveIntensity) * 0.1;
  }
}

// ─────────────────────────────────────────────
//  Game flow
// ─────────────────────────────────────────────
function enterGame() {
  if (gameState === STATES.PLAYING) return;
  songSelEl.style.display = 'none';

  exploreCamPos.copy(camera.position);
  exploreCamQuat.copy(camera.quaternion);

  _programmingUnlock = true;
  look.unlock();

  gameState = STATES.PLAYING;
  camera.position.copy(GAME_CAM_POS);
  camera.quaternion.setFromEuler(GAME_CAM_ROT);

  rhythm.resetStats();
  _hudDirty = true;
  if (_endGameTimer) { clearTimeout(_endGameTimer); _endGameTimer = null; }

  renderer.shadowMap.enabled = false;
  cityGroup.visible = false;
  moonLight.castShadow = false;
  if (floorSpot) floorSpot.intensity = 0;
  _playPixelRatio = renderer.getPixelRatio();
  renderer.setPixelRatio(1);

  hudEl.style.display   = 'block';
  promptEl.style.display= 'none';
  resultEl.style.display= 'none';

  if (!rhythm.audioCtx) rhythm.audioCtx = new (window.AudioContext||window.webkitAudioContext)();

  if (gameMode === 'chart' && rhythm.chart) {
    rhythm.startChart(rhythm.chart, songBuffer);
  } else {
    rhythm.startRandom(rhythm.bpm);
  }
}

function restoreExplore() {
  cityGroup.visible = true;
  moonLight.castShadow = true;
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(_playPixelRatio);
  if (floorSpot) floorSpot.intensity = CFG.floorSpotIntensity;
}

function exitGame() {
  if (_endGameTimer) { clearTimeout(_endGameTimer); _endGameTimer = null; }
  gameState = STATES.EXPLORE;
  rhythm.stopAll();
  restoreExplore();
  camera.position.copy(exploreCamPos);
  camera.quaternion.copy(exploreCamQuat);
  vel.set(0,0,0); moveF=moveB=moveL=moveR=moveU=moveD=false;
  hudEl.style.display   = 'none';
  promptEl.style.display= 'none';
  resultEl.style.display= 'none';
  songSelEl.style.display='none';
}

function endGame() {
  if (_endGameTimer) { clearTimeout(_endGameTimer); _endGameTimer = null; }
  gameState = STATES.RESULT;
  rhythm.stopAll();
  restoreExplore();

  const acc = rhythm.totalNotes > 0
    ? (rhythm.perfects + rhythm.goods * 0.5) / rhythm.totalNotes : 0;
  let grade = 'F';
  if (acc>=0.95) grade='S'; else if (acc>=0.85) grade='A';
  else if (acc>=0.7) grade='B'; else if (acc>=0.5) grade='C'; else grade='D';

  const sd = { score:rhythm.score, grade, maxCombo:rhythm.maxCombo,
               perfects:rhythm.perfects, goods:rhythm.goods, misses:rhythm.misses };
  if (window.nrSaveHiScore) window.nrSaveHiScore(activeSongId, sd);

  resultEl.style.display='flex';
  document.getElementById('res-score-big').textContent = rhythm.score.toString().padStart(7,'0');
  document.getElementById('res-combo').textContent   = rhythm.maxCombo;
  document.getElementById('res-perfect').textContent = rhythm.perfects;
  document.getElementById('res-good').textContent    = rhythm.goods;
  document.getElementById('res-miss').textContent    = rhythm.misses;
  document.getElementById('res-grade').textContent   = grade;
}

function exitToExplore() {
  gameState = STATES.EXPLORE;
  if (window.closeSongSelect) window.closeSongSelect();
  hudEl.style.display   = 'none';
  promptEl.style.display= 'none';
  resultEl.style.display= 'none';
  songSelEl.style.display='none';
}

// ─────────────────────────────────────────────
//  Song select screen
// ─────────────────────────────────────────────
let songManifest = [];

function openSongSelectScreen() {
  gameState = STATES.SONGSELECT;
  _programmingUnlock = true;
  look.unlock();
  hudEl.style.display   = 'none';
  promptEl.style.display= 'none';
  resultEl.style.display= 'none';
  if (window.ssSetManifest) window.ssSetManifest(songManifest);
  if (window.openSongSelect) window.openSongSelect();
}

// ─────────────────────────────────────────────
//  Keyboard handlers
// ─────────────────────────────────────────────
let gameMode = 'random';
let songBuffer = null;  // decoded AudioBuffer for chart mode

document.addEventListener('keydown', e => {
  // Explore / prompt movement
  if (gameState === STATES.EXPLORE || gameState === STATES.PROMPT) {
    if (e.code==='KeyW'||e.code==='ArrowUp')    moveF=true;
    if (e.code==='KeyS'||e.code==='ArrowDown')  moveB=true;
    if (e.code==='KeyA'||e.code==='ArrowLeft')  moveL=true;
    if (e.code==='KeyD'||e.code==='ArrowRight') moveR=true;
    if (e.code==='Space')   { moveU=true; e.preventDefault(); }
    if (e.code==='ControlLeft'||e.code==='ControlRight') moveD=true;
    if (e.code==='KeyE' && gameState===STATES.PROMPT) openSongSelectScreen();
  }

  // Song select keyboard nav is handled entirely in asg5.html

  // Game input
  if (gameState === STATES.PLAYING) {
    const lane = _laneFromEvent(e);
    if (lane !== undefined) { rhythm.pressLane(lane); _hudDirty=true; }
    if (e.code==='Escape') exitGame();
  }

  if (e.code==='Escape' && gameState===STATES.RESULT) exitGame();
});

document.addEventListener('keyup', e => {
  if (e.code==='KeyW'||e.code==='ArrowUp')    moveF=false;
  if (e.code==='KeyS'||e.code==='ArrowDown')  moveB=false;
  if (e.code==='KeyA'||e.code==='ArrowLeft')  moveL=false;
  if (e.code==='KeyD'||e.code==='ArrowRight') moveR=false;
  if (e.code==='Space')   moveU=false;
  if (e.code==='ControlLeft'||e.code==='ControlRight') moveD=false;

  const lane = _laneFromEvent(e);
  if (lane !== undefined) rhythm.releaseLane(lane);
});

function _laneFromEvent(e) {
  const k = e.key.toLowerCase();
  const keyLane  = {a:0,s:1,w:2,d:3};
  const codeLane = {ArrowLeft:0,ArrowDown:1,ArrowUp:2,ArrowRight:3};
  if (keyLane[k]  !== undefined) return keyLane[k];
  return codeLane[e.code];
}

// ─────────────────────────────────────────────
//  First-person movement helpers
// ─────────────────────────────────────────────
function _moveCamera(dt) {
  const spd = CFG.moveSpeed * dt;
  // forward vector (horizontal only)
  camera.getWorldDirection(_fwd); _fwd.y=0; _fwd.normalize();
  // right vector
  _rgt.crossVectors(_fwd, new THREE.Vector3(0,1,0)).normalize();
  if (moveF) camera.position.addScaledVector(_fwd,  spd);
  if (moveB) camera.position.addScaledVector(_fwd, -spd);
  if (moveL) camera.position.addScaledVector(_rgt, -spd);
  if (moveR) camera.position.addScaledVector(_rgt,  spd);
  if (moveU) camera.position.y += spd * 0.7;
  if (moveD) camera.position.y -= spd * 0.7;
  camera.position.y = Math.max(1.7, camera.position.y);
}

// ─────────────────────────────────────────────
//  Renderer resize
// ─────────────────────────────────────────────
function onResize() {
  const w=canvas.clientWidth, h=canvas.clientHeight;
  if (canvas.width!==w||canvas.height!==h) {
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }
}

// ─────────────────────────────────────────────
//  Debug HUD
// ─────────────────────────────────────────────
const _numdot = document.getElementById('numdot');
let _debugFrame = 0;
function _debugUpdate() {
  if (!_numdot) return;
  if (gameState === STATES.PLAYING) {
    _numdot.textContent = `Notes: ${rhythm.activeArrows.length}`;
  } else if (++_debugFrame % 120 === 0) {
    _numdot.textContent = `Explore · ${renderer.info.render.triangles} tris`;
  }
}

// ─────────────────────────────────────────────
//  Main loop
// ─────────────────────────────────────────────
const _pos2D = new THREE.Vector2();
let _prevTime = performance.now();
let _elapsed  = 0;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt  = Math.min((now - _prevTime) / 1000, 0.1);
  _prevTime = now;
  _elapsed += dt;

  onResize();
  updateHoloCube(dt, _elapsed);

  if (gameState !== STATES.PLAYING) {
    orbs.forEach((o,i) => {
      const y = o.baseY + Math.sin(_elapsed*1.2+o.phase)*0.3;
      o.mesh.position.y = y; orbLights[i].position.y = y;
    });
    floatingRings.forEach(r => { r.mesh.rotation.z += 0.005; });
    if (discoRef.mesh) { discoRef.mesh.rotation.y += 0.01; discoRef.light.intensity = 1; }
  }

  if (look.isLocked && (gameState===STATES.EXPLORE || gameState===STATES.PROMPT)) {
    _moveCamera(dt);
    _pos2D.set(camera.position.x, camera.position.z);
    const dist = _pos2D.distanceTo(FLOOR_POS);
    if (dist < PROXIMITY_R) {
      gameState = STATES.PROMPT;
      promptEl.style.display = 'flex';
    } else {
      if (gameState === STATES.PROMPT) gameState = STATES.EXPLORE;
      promptEl.style.display = 'none';
    }
  }

  if (gameState === STATES.PLAYING) {
    rhythm.update(dt);
    _hudDirty = true;

    if (judgeTimer > 0) {
      judgeTimer -= dt;
      if (judgeTimer <= 0) {
        judgeEl.style.opacity = '0';
        judgeEl.style.transform = 'translateX(-50%) scale(1)';
      }
    }
    updateHUD();
  }

  _debugUpdate();
  renderer.render(scene, camera);
}

animate();

// ─────────────────────────────────────────────
//  loadSong
// ─────────────────────────────────────────────
const SONGS_BASE = new URL('../songs/', import.meta.url).href;

async function loadSong(chartUrl, audioUrl) {
  const chartRes = await fetch(chartUrl);
  if (!chartRes.ok) throw new Error(`Chart not found (${chartRes.status})`);
  const c = await chartRes.json();
  if (!c.notes || !Array.isArray(c.notes)) throw new Error('Chart missing notes array');

  rhythm.chart = c; gameMode = 'chart'; rhythm.noteIndex = 0;
  if (c.bpm) { rhythm.bpm = c.bpm; rhythm.beatInterval = 60/c.bpm; }

  if (audioUrl) {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Audio not found (${audioRes.status})`);
    if (!rhythm.audioCtx) rhythm.audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const arr = await audioRes.arrayBuffer();
    songBuffer = await rhythm.audioCtx.decodeAudioData(arr.slice(0));
  }

  const holds = c.notes.filter(n=>(n.duration||0)>0).length;
  return {
    title:     c.title||'Untitled',
    artist:    c.artist||'',
    bpm:       c.bpm,
    noteCount: c.notes.length,
    holds,
    duration:  songBuffer ? songBuffer.duration : null,
  };
}

// ─────────────────────────────────────────────
//  Load manifest
// ─────────────────────────────────────────────
async function loadManifest() {
  try {
    const res = await fetch(new URL('manifest.json', SONGS_BASE));
    if (!res.ok) return;
    const data = await res.json();
    const songs = data.songs || [];
    for (const song of songs) {
      try {
        const chartUrl = new URL(song.chart, SONGS_BASE).href;
        const r2 = await fetch(chartUrl);
        if (r2.ok) song._chartData = await r2.json();
        song.audio = song.audio ? new URL(song.audio, SONGS_BASE).href : null;
        song.chart = chartUrl;
      } catch(e) { /* ignore */ }
    }
    songManifest = songs;
    if (window.ssSetManifest) window.ssSetManifest(songs);
  } catch(e) { /* no manifest */ }
}

loadManifest();

// ─────────────────────────────────────────────
//  Public API  (consumed by asg5.html)
// ─────────────────────────────────────────────
window.NeonRhythm = {
  setMode(mode) {
    gameMode = mode;
    if (mode === 'random') rhythm.chart = null;
  },
  setBPM(val) {
    rhythm.bpm = val; rhythm.beatInterval = 60/val;
    applyApproachTiming(val);
  },
  loadChart(c) {
    rhythm.chart = c; gameMode = 'chart'; rhythm.noteIndex = 0;
    if (c.bpm) { rhythm.bpm = c.bpm; rhythm.beatInterval = 60/c.bpm; }
  },
  loadAudio(buf) { songBuffer = buf; },
  loadSong,
  getChart: () => rhythm.chart,
  getManifest: () => songManifest,
  setTimingLatency(sec) { rhythm.audioHitLatency = Number(sec)||0; },
  getTimingLatency: () => rhythm.audioHitLatency,
  setActiveSongId(id) { activeSongId = id||'random'; },
  openSongSelect: openSongSelectScreen,
  enterGame,
  exitGame,
  exitToExplore,
  endGame,
  getState: () => gameState,
};