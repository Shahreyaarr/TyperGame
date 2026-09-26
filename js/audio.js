/**
 * TYPE//TANK - Procedural Retro Web Audio Engine
 * Zero audio assets. Pure browser-synthesized 80s/90s arcade & DOS sound effects.
 */

window.TypeTankAudio = (function () {
  'use strict';

  let audioCtx = null;
  let isMuted = false;

  // Initialize or resume AudioContext
  function getContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function setMuted(muted) {
    isMuted = !!muted;
  }

  function isAudioMuted() {
    return isMuted;
  }

  /**
   * 1. High-frequency snappy laser shot for normal keystroke firing
   * Sawtooth wave with rapid exponential pitch drop from 1200Hz to 160Hz and bandpass filter
   */
  function playLaserShot() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1100 + Math.random() * 200, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.Q.setValueAtTime(3, now);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.085);
  }

  /**
   * 2. Heavy metallic explosion / thump on word elimination
   * Combines low sub-bass kick drop with shaped white noise burst for armor shredding thump
   */
  function playExplosion() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Sub-bass thump
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.36);

    // Noise burst for mechanical debris
    const bufferSize = ctx.sampleRate * 0.25;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(180, now + 0.25);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.26);
  }

  /**
   * 3. High-pitched dual-tone chime on red bonus word spawn
   * Crisp ascending dual arpeggio alert
   */
  function playBonusSpawn() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const tones = [880, 1320, 1760]; // A5, E6, A6

    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const toneTime = now + idx * 0.06;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, toneTime);

      gain.gain.setValueAtTime(0.18, toneTime);
      gain.gain.exponentialRampToValueAtTime(0.001, toneTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(toneTime);
      osc.stop(toneTime + 0.13);
    });
  }

  /**
   * 4. Low crunch / screen shake buzz on damage impact (hull breach)
   * Distortion and abrasive saw buzz
   */
  function playDamage() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(45, now + 0.35);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    // Filter distortion effect
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  /**
   * 5. Multi-tone triumphant fanfare for new records
   * Classic retro 8-bit victory arpeggio: C5, E5, G5, C6, G5, C6 (extended flourish)
   */
  function playRecordFanfare() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, dur: 0.1 },  // C5
      { freq: 659.25, dur: 0.1 },  // E5
      { freq: 783.99, dur: 0.1 },  // G5
      { freq: 1046.50, dur: 0.2 }, // C6
      { freq: 783.99, dur: 0.1 },  // G5
      { freq: 1046.50, dur: 0.45 } // C6 sustained
    ];

    let offset = 0;
    notes.forEach(note => {
      const startTime = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, startTime);

      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + note.dur + 0.02);

      offset += note.dur * 0.85;
    });
  }

  /**
   * 6. Soft retro terminal click on UI buttons and menus
   */
  function playTerminalClick() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.025);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * 7. Low error reject beep for keystroke typos
   */
  function playTypingError() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(130, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.075);
  }

  return {
    getContext,
    setMuted,
    isAudioMuted,
    playLaserShot,
    playExplosion,
    playBonusSpawn,
    playDamage,
    playRecordFanfare,
    playTerminalClick,
    playTypingError
  };
})();
