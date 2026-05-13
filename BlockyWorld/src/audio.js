// audio.js 

const Audio = {
    ctx: null,
    sounds: {},
    ambientSource: null,
    walkInterval: null,
    isWalking: false,
    isRunning: false,
  
    // Call this once
    init() {
      if (this.ctx) return;
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._loadAll();
    },
  
    _loadAll() {
      const files = {
        page:       '../sounds/page_collect.mp3',
        walk:       '../sounds/footstep.mp3',
        run:        '../sounds/footstep_run.mp3',
        jumpscare:  '../sounds/jumpscare.mp3',
        ambient:    '../sounds/ambient.mp3',
        flashlight: '../sounds/flashlight.mp3',
      };
      for (var key in files) {
        this._load(key, files[key]);
      }
    },
  
    _load(name, url) {
      var self = this;
      fetch(url)
        .then(r => r.arrayBuffer())
        .then(buf => self.ctx.decodeAudioData(buf))
        .then(decoded => { self.sounds[name] = decoded; })
        .catch(e => console.warn('Audio load failed:', url, e));
    },
  
    // Play sound once at volume (0-1)
    play(name, volume = 1.0, loop = false) {
      if (!this.ctx || !this.sounds[name]) return null;
      var gain = this.ctx.createGain();
      gain.gain.value = volume;
      gain.connect(this.ctx.destination);
  
      var src = this.ctx.createBufferSource();
      src.buffer = this.sounds[name];
      src.loop = loop;
      src.connect(gain);
      src.start(0);
      return src;
    },
  
    // ── Ambient music ────
    startAmbient(volume = 0.3) {
      if (!this.ctx || !this.sounds['ambient']) {
        // Retry once loaded
        setTimeout(() => this.startAmbient(volume), 1000);
        return;
      }
      if (this.ambientSource) return; 
  
      var gain = this.ctx.createGain();
      gain.gain.value = volume;
      gain.connect(this.ctx.destination);
  
      this.ambientSource = this.ctx.createBufferSource();
      this.ambientSource.buffer = this.sounds['ambient'];
      this.ambientSource.loop = true;
      this.ambientSource.connect(gain);
      this.ambientSource.start(0);
      this._ambientGain = gain;
    },
  
    stopAmbient() {
      if (this.ambientSource) {
        this.ambientSource.stop();
        this.ambientSource = null;
      }
    },
  
    // Fade ambient volume
    setAmbientVolume(vol, fadeTimeSecs = 0.5) {
      if (!this._ambientGain) return;
      this._ambientGain.gain.linearRampToValueAtTime(
        vol,
        this.ctx.currentTime + fadeTimeSecs
      );
    },
  
// ── Footsteps ──────────────────────────────────────────────
_footstepPlaying: false,
_footstepTimeout: null,

updateFootsteps(walking, running) {
  this.isWalking = walking;
  this.isRunning = running;

  if (!walking && !running) {
    this._footstepPlaying = false;
    if (this._footstepTimeout) {
      clearTimeout(this._footstepTimeout);
      this._footstepTimeout = null;
    }
    return;
  }

  // start a new chain if nothing is playing
  if (this._footstepPlaying) return;
  this._playNextFootstep();
},

    _playNextFootstep() {
    if (!this.isWalking && !this.isRunning) {
        this._footstepPlaying = false;
        return;
    }
    if (!this.ctx) { this._footstepPlaying = false; return; }

    var sound    = this.isRunning ? 'run'  : 'walk';
    var vol      = this.isRunning ? 0.5    : 0.25;
    var interval = this.isRunning ? 320    : 520;   // ms gap between steps

    var buf = this.sounds[sound];
    if (!buf) { this._footstepPlaying = false; return; }

    this._footstepPlaying = true;

    var gain = this.ctx.createGain();
    gain.gain.value = vol;
    gain.connect(this.ctx.destination);

    var src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain);

    var self = this;
    // Wait for sound to finish, then next step after the gap
    src.onended = function() {
        if (!self.isWalking && !self.isRunning) {
        self._footstepPlaying = false;
        return;
        }
        // Gap between steps 
        var clipDur  = buf.duration * 1000;
        var gapMs    = Math.max(0, interval - clipDur);
        self._footstepTimeout = setTimeout(function() {
        self._playNextFootstep();
        }, gapMs);
    };

    src.start(0);
    },

    stopFootsteps() {
    this.isWalking = false;
    this.isRunning = false;
    this._footstepPlaying = false;
    if (this._footstepTimeout) {
        clearTimeout(this._footstepTimeout);
        this._footstepTimeout = null;
    }
    },
  
    // ── Jumpscare audio ────────────────────────────────────────
    playJumpscare() {
      this.setAmbientVolume(0.05, 0.1); // duck ambient fast
      this.play('jumpscare', 1.0);
      var self = this;
      setTimeout(function() {
        self.setAmbientVolume(0.3, 2.0); // fade ambient back in after scare
      }, 5000);
    },


    // Flashlight audio
    playFlashlight() {
      this.play('flashlight', 0.3);
    },
  };