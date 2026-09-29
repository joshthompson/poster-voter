// A tiny techno loop and vote sound effect, synthesised live with the Web Audio API.
//
// Browsers only allow audio after a user gesture, so nothing plays until `unlock()` runs
// from the first click or key press. Muting suspends the whole AudioContext (music + effects),
// and the choice is remembered in localStorage.

const BPM = 128;
const STEP = 60 / BPM / 4; // one 16th note, in seconds
const LOOKAHEAD = 0.12; // how far ahead to schedule, in seconds
const MUTE_KEY = 'postervote:muted';

// A minor. Bass roots for each bar of a 4-bar loop, and the stab chord above them.
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const BASS_ROOTS = [33, 33, 36, 31]; // A1 A1 C2 G1
const STAB = [57, 60, 64]; // A3 C4 E4
const BASS_STEPS = [2, 3, 6, 7, 10, 11, 14, 15]; // rolling bass, off the kick
const BASS_OCTAVE_UP = new Set([3, 11]);
// The vote effect plays this chord shape (A minor, an octave up) on whatever bar the loop is on,
// shifted with the bass exactly like the stabs, so it always matches the track: Am Am Cm Gm.
const VOTE_CHORD = [69, 72, 76, 81];
/** Semitones to shift the A-rooted chord shapes by for a given bar. */
const barShift = (bar: number) => BASS_ROOTS[bar] - BASS_ROOTS[0];

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) !== '0';
  } catch {
    return true;
  }
}

class Sound {
  muted = $state(readMuted());
  /** True once `unlock()` has run, i.e. the visitor has clicked or pressed a key. */
  unlocked = $state(false);

  private ctx: AudioContext | null = null;
  private music!: GainNode;
  private sfx!: GainNode;
  private echo!: GainNode;
  private noise!: AudioBuffer;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | undefined;

  /** Create the audio graph and start the loop. Call from a user gesture. */
  unlock() {
    this.unlocked = true;
    if (this.ctx) {
      if (!this.muted && document.visibilityState === 'visible') this.ctx.resume();
      return;
    }
    if (typeof AudioContext === 'undefined') return;
    const ctx = (this.ctx = new AudioContext());

    const master = ctx.createDynamicsCompressor();
    master.threshold.value = -14;
    master.ratio.value = 4;
    master.connect(ctx.destination);

    this.music = ctx.createGain();
    this.music.gain.value = 0.45;
    this.music.connect(master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.7;
    this.sfx.connect(master);

    // Dotted-8th feedback echo, shared by the stabs and the vote effect.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = STEP * 3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2500;
    this.echo = ctx.createGain();
    this.echo.connect(delay).connect(tone).connect(feedback).connect(delay);
    tone.connect(master);

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.nextTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
    // Background tabs throttle timers, which would leave gaps in the loop; pause instead.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') ctx.suspend();
      else if (!this.muted) ctx.resume();
    });
    if (this.muted) ctx.suspend();
  }

  toggle() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      // Not remembered; fine.
    }
    if (this.muted) this.ctx?.suspend();
    else this.unlock();
  }

  /** Laser zap up into a stab chord, matching the chord the loop is playing right now. */
  vote() {
    this.unlock(); // a keyboard vote can arrive before the layout's gesture listener runs
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const chord = VOTE_CHORD.map((n) => n + barShift(this.barAt(t)));
    const root = chord[0];

    const zap = ctx.createOscillator();
    zap.type = 'square';
    zap.frequency.setValueAtTime(midi(root - 12), t);
    zap.frequency.exponentialRampToValueAtTime(midi(root + 24), t + 0.14);
    const zapFilter = ctx.createBiquadFilter();
    zapFilter.type = 'bandpass';
    zapFilter.frequency.setValueAtTime(800, t);
    zapFilter.frequency.exponentialRampToValueAtTime(6000, t + 0.14);
    zapFilter.Q.value = 3;
    const zapGain = this.envelope(t, 0.005, 0.18, 0.35);
    zap.connect(zapFilter).connect(zapGain);
    zapGain.connect(this.sfx);
    zap.start(t);
    zap.stop(t + 0.2);

    this.stab(t + 0.12, chord, this.sfx, 0.3, 0.5);
    this.hat(t + 0.12, 0.25, 0.3, this.sfx);
  }

  private schedule() {
    const ctx = this.ctx!;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step = (this.step + 1) % 64;
    }
  }

  /** The loop's bar at time `t`, counting back from the steps already scheduled ahead of it. */
  private barAt(t: number) {
    const ahead = Math.max(0, Math.ceil((this.nextTime - t) / STEP));
    return Math.floor((((this.step - ahead) % 64) + 64) % 64 / 16);
  }

  private playStep(step: number, t: number) {
    const s = step % 16;
    const bar = Math.floor(step / 16);

    if (s % 4 === 0) this.kick(t);
    if (s % 4 === 2) this.hat(t, 0.16, 0.14);
    else this.hat(t, 0.03, 0.05);
    if (s === 4 || s === 12) this.clap(t);
    if (BASS_STEPS.includes(s)) {
      const note = BASS_ROOTS[bar] + (BASS_OCTAVE_UP.has(s) ? 12 : 0);
      this.bass(t, midi(note), step);
    }
    if (s === 3 || (s === 10 && bar % 2 === 1)) {
      this.stab(t, STAB.map((n) => n + barShift(bar)), this.music, 0.12, 0.25);
    }
  }

  private envelope(t: number, attack: number, decay: number, peak: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = this.envelope(t, 0.002, 0.4, 1);
    osc.connect(g).connect(this.music);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  private hat(t: number, decay: number, peak: number, out = this.music) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = this.envelope(t, 0.001, decay, peak);
    src.connect(hp).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.02);
  }

  private clap(t: number) {
    const ctx = this.ctx!;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 0.8;
    bp.connect(this.music);
    // Three quick bursts and a tail make it read as hands rather than a snare.
    [0, 0.012, 0.024].forEach((offset, i) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const g = this.envelope(t + offset, 0.001, i === 2 ? 0.18 : 0.01, 0.5);
      src.connect(g).connect(bp);
      src.start(t + offset, Math.random() * 0.5);
      src.stop(t + offset + 0.22);
    });
  }

  private bass(t: number, freq: number, step: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    // The filter opens and closes over the 4-bar loop for a bit of movement.
    const sweep = 0.5 - 0.5 * Math.cos((step / 64) * Math.PI * 2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 8;
    lp.frequency.setValueAtTime(300 + sweep * 1400, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 0.12);
    const g = this.envelope(t, 0.003, 0.14, 0.3);
    osc.connect(lp).connect(g).connect(this.music);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  private stab(t: number, notes: number[], out: GainNode, peak: number, decay: number) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3500, t);
    lp.frequency.exponentialRampToValueAtTime(400, t + decay);
    const g = this.envelope(t, 0.004, decay, peak);
    lp.connect(g);
    g.connect(out);
    g.connect(this.echo);
    for (const n of notes) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = midi(n);
      osc.detune.value = (Math.random() - 0.5) * 14;
      osc.connect(lp);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    }
  }
}

export const sound = new Sound();
