import * as Tone from 'tone';

// Stage 7.4b: mobile speakers run softer than laptop speakers, so the master
// Tone.Volume is boosted +6 dB on mobile UAs. Only the master node is
// touched — individual synth voice volumes keep their existing relative mix.
const isMobile = typeof navigator !== 'undefined'
  && /Android|iPhone|iPad|iPod|Mobile|IEMobile/i.test(navigator.userAgent);

let sampler = null;
let membraneSynth = null;
let metalSynth = null;
let noiseSynth = null;
let reverb = null;
let masterVol = null;

let muted = localStorage.getItem('quiz_daily_mute') === '1';
let initialized = false;
let loading = false;
let loaded = false;

const COMBO_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];

async function setupGraph() {
  if (initialized) return;
  initialized = true;

  masterVol = new Tone.Volume(isMobile ? 2 : -4).toDestination();
  if (muted) masterVol.mute = true;

  try {
    reverb = new Tone.Reverb({ decay: 2.2, wet: 0.22, preDelay: 0.03 });
    await reverb.generate();
    reverb.connect(masterVol);
  } catch (e) {
    console.warn('Reverb failed, using direct output', e);
    reverb = null;
  }

  const reverbOrMaster = reverb || masterVol;

  sampler = new Tone.Sampler({
    urls: { 'C4': 'C4.mp3', 'A4': 'A4.mp3', 'C5': 'C5.mp3', 'A5': 'A5.mp3' },
    release: 1.2,
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
    onload: () => { loaded = true; loading = false; }
  }).connect(reverbOrMaster);

  membraneSynth = new Tone.MembraneSynth({
    pitchDecay: 0.12,
    octaves: 8,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.5, sustain: 0.01, release: 0.4 },
    volume: -2
  }).connect(reverbOrMaster);

  metalSynth = new Tone.MetalSynth({
    frequency: 250,
    envelope: { attack: 0.001, decay: 0.05, release: 0.02 },
    harmonicity: 5.1,
    modulationIndex: 12,
    resonance: 2000,
    octaves: 0.5,
    volume: -28
  }).connect(masterVol);

  noiseSynth = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.05, decay: 0.2, sustain: 0, release: 0.1 },
    volume: -24
  }).connect(reverbOrMaster);

  loading = true;
}

export function initAudio() {
  const unlock = async () => {
    try {
      await Tone.start();
      await setupGraph();
    } catch (e) { console.warn('Audio init failed', e); }
    document.body.removeEventListener('touchstart', unlock);
    document.body.removeEventListener('click', unlock);
    document.body.removeEventListener('keydown', unlock);
  };
  document.body.addEventListener('touchstart', unlock, { once: true });
  document.body.addEventListener('click', unlock, { once: true });
  document.body.addEventListener('keydown', unlock, { once: true });
}

function safePlay(fn) {
  if (muted || !initialized) return;
  try { fn(); } catch (e) { console.warn('[sound] play error', e); }
}

export function playClick() {
  safePlay(() => {
    if (!metalSynth) return;
    metalSynth.triggerAttackRelease('C7', '64n', undefined, 0.4);
  });
}

export function playCorrect(comboIndex = 0) {
  safePlay(() => {
    const now = Tone.now();
    const idx = Math.min(COMBO_NOTES.length - 1, Math.max(0, comboIndex));
    const note = COMBO_NOTES[idx];
    if (membraneSynth) {
      const bassNote = ['C2','D2','E2','G2','A2','C3'][Math.min(5, idx)];
      membraneSynth.triggerAttackRelease(bassNote, '8n', now, 0.75);
    }
    if (loaded && sampler) {
      const velocity = 0.55 + (idx * 0.035);
      const brightNote = note.replace(/(\d)/, (_, d) => String(parseInt(d) + 1));
      sampler.triggerAttackRelease(brightNote, '4n', now + 0.02, Math.min(0.9, velocity));
      if (idx >= 2) {
        const fifthMap = { 'E5':'B5','F5':'C6','G5':'D6','A5':'E6','B5':'F6','C6':'G6','D6':'A6','E6':'B6','D5':'A5' };
        const fifth = fifthMap[brightNote];
        if (fifth) sampler.triggerAttackRelease(fifth, '4n', now + 0.04, 0.4);
      }
    }
  });
}

export function playWrong() {
  safePlay(() => {
    const now = Tone.now();
    if (loaded && sampler) {
      sampler.triggerAttackRelease('D4', '8n', now, 0.55);
      sampler.triggerAttackRelease('B3', '8n', now + 0.10, 0.50);
      sampler.triggerAttackRelease('Gb3', '4n', now + 0.20, 0.45);
    }
    if (membraneSynth) {
      membraneSynth.triggerAttackRelease('A1', '8n', now, 0.35);
    }
  });
}

export function playTick() {
  safePlay(() => {
    if (!metalSynth) return;
    metalSynth.triggerAttackRelease('G6', '64n', undefined, 0.25);
  });
}

export function playFanfare() {
  try {
    console.log('[fanfare] invoked, loaded=', loaded, 'muted=', muted, 'toneState=',
      (Tone && Tone.context && Tone.context.state) ? Tone.context.state : 'unknown');
  } catch (e) { /* never let logging break playback */ }
  safePlay(() => {
    if (!loaded) { console.warn('[sound] fanfare skipped — samples not loaded'); return; }
    const now = Tone.now();

    const melody = [
      { note: 'C4', time: 0.00, vel: 0.55, dur: '4n' },
      { note: 'E4', time: 0.18, vel: 0.60, dur: '4n' },
      { note: 'G4', time: 0.36, vel: 0.65, dur: '4n' },
      { note: 'C5', time: 0.56, vel: 0.75, dur: '4n' },
      { note: 'E5', time: 0.80, vel: 0.82, dur: '4n' },
      { note: 'G5', time: 1.05, vel: 0.88, dur: '2n' }
    ];
    melody.forEach(n => sampler.triggerAttackRelease(n.note, n.dur, now + n.time, n.vel));

    const chordTime = now + 1.8;
    const chord = [
      { n: 'C2', v: 0.55 },
      { n: 'G2', v: 0.55 },
      { n: 'C3', v: 0.65 },
      { n: 'E3', v: 0.60 },
      { n: 'G3', v: 0.65 },
      { n: 'C4', v: 0.70 },
      { n: 'E4', v: 0.70 },
      { n: 'G4', v: 0.75 },
      { n: 'C5', v: 0.80 },
      { n: 'E5', v: 0.85 },
      { n: 'G5', v: 0.90 },
      { n: 'C6', v: 0.90 }
    ];
    chord.forEach(c => sampler.triggerAttackRelease(c.n, '1n', chordTime, c.v));

    if (membraneSynth) {
      membraneSynth.triggerAttackRelease('C2', '2n', chordTime, 0.7);
      membraneSynth.triggerAttackRelease('C1', '1n', chordTime + 0.05, 0.4);
    }

    sampler.triggerAttackRelease('G6', '8n', chordTime + 0.3, 0.7);
    sampler.triggerAttackRelease('C7', '8n', chordTime + 0.5, 0.65);
  });
}

export function playNewBest() {
  safePlay(() => {
    if (!loaded) return;
    const now = Tone.now();
    [['G4',0,0.65],['B4',0.06,0.70],['D5',0.12,0.75],['G5',0.20,0.80],['B5',0.30,0.85],['D6',0.42,0.90]]
      .forEach(([n,t,v]) => sampler.triggerAttackRelease(n, '8n', now + t, v));
    const climax = now + 0.55;
    ['G3','D4','G4','B4','D5','G5'].forEach(n => sampler.triggerAttackRelease(n, '2n', climax, 0.75));
    if (membraneSynth) membraneSynth.triggerAttackRelease('G2', '4n', climax, 0.4);
  });
}

export function playStreakMilestone() {
  safePlay(() => {
    if (!loaded) return;
    const now = Tone.now();
    [['C4',0,0.60],['G4',0.12,0.65],['C5',0.24,0.75],['G5',0.36,0.85]]
      .forEach(([n,t,v]) => sampler.triggerAttackRelease(n, '4n', now + t, v));
    const landing = now + 0.52;
    ['C3','G3','C4','E4','G4','C5','E5','G5','C6']
      .forEach(n => sampler.triggerAttackRelease(n, '1n', landing, 0.8));
    if (membraneSynth) membraneSynth.triggerAttackRelease('C2', '2n', landing, 0.55);
  });
}

export function playWhoosh() {
  safePlay(() => {
    if (!noiseSynth) return;
    noiseSynth.triggerAttackRelease('0.25');
  });
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem('quiz_daily_mute', muted ? '1' : '0');
  if (masterVol) masterVol.mute = muted;
  return muted;
}

export function isMuted() { return muted; }
