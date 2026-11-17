export type AudioSessionKind = 'neuro-focus' | 'nsdr-calm';

const SAMPLE_RATE = 22050;

const writeAscii = (view: DataView, offset: number, text: string) => {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
};

/**
 * Generates a real 16-bit Stereo PCM RIFF WAVE Blob purely in TypeScript.
 * Guaranteed zero external CDN dependencies and instant offline playback.
 */
export const synthesizeStereoWavBlob = (kind: AudioSessionKind, durationSec = 90): Blob => {
  const numChannels = 2;
  const bitsPerSample = 16;
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const dataByteLength = totalSamples * numChannels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  // RIFF Header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  let noiseState = 0;
  let offset = 44;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Smooth 3-second fade in/out envelope
    const fadeIn = Math.min(1, t / 3);
    const fadeOut = Math.min(1, (durationSec - t) / 3);
    const masterEnv = fadeIn * fadeOut;

    // Gentle deterministic pink/brown noise bed
    const pseudoWhite = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    const white = (pseudoWhite - Math.floor(pseudoWhite)) * 2 - 1;
    noiseState = noiseState * 0.96 + white * 0.04;

    let left = 0;
    let right = 0;

    if (kind === 'neuro-focus') {
      // 40 Hz Gamma Focus Binaural Beat: 200 Hz (L) & 240 Hz (R) + warm 100 Hz harmonic drone
      const harmonicPad = 0.11 * Math.sin(2 * Math.PI * 100 * t) + 0.05 * Math.sin(2 * Math.PI * 300 * t);
      const pulse = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.25 * t);
      left = (0.26 * Math.sin(2 * Math.PI * 200 * t) * pulse + harmonicPad + noiseState * 0.12) * masterEnv;
      right = (0.26 * Math.sin(2 * Math.PI * 240 * t) * pulse + harmonicPad + noiseState * 0.12) * masterEnv;
    } else {
      // NSDR Alpha (10 Hz) -> Theta (6 Hz) Relaxation Sweep + slow 4-7-8 breathing swell (~19s cycle)
      const progress = t / durationSec;
      const beatFreq = 10 - 4 * progress; // smoothly glides from 10 Hz down to 6 Hz
      const breathEnv = 0.72 + 0.28 * Math.sin(2 * Math.PI * (t / 19) - Math.PI / 2);
      const warmSub = 0.14 * Math.sin(2 * Math.PI * 87 * t) + 0.06 * Math.sin(2 * Math.PI * 261 * t);
      const phaseL = 2 * Math.PI * 174 * t;
      // Integral of (174 + 10 - 4*(t/D)) = 184*t - 2*(t^2/D)
      const phaseR = 2 * Math.PI * (184 * t - (2 * t * t) / durationSec);

      left = (0.24 * Math.sin(phaseL) * breathEnv + warmSub + noiseState * 0.16) * masterEnv;
      right = (0.24 * Math.sin(phaseR + beatFreq * 0.001) * breathEnv + warmSub + noiseState * 0.16) * masterEnv;
    }

    const clampedL = Math.max(-0.98, Math.min(0.98, left));
    const clampedR = Math.max(-0.98, Math.min(0.98, right));

    view.setInt16(offset, Math.round(clampedL * 32767), true);
    view.setInt16(offset + 2, Math.round(clampedR * 32767), true);
    offset += 4;
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export const downloadNeuroAudioWav = () => {
  const blob = synthesizeStereoWavBlob('neuro-focus', 90);
  triggerBlobDownload(blob, 'Audio-Binaural-40Hz-Enfoque-MiguelLopez.wav');
};

export const downloadNsdrAudioWav = () => {
  const blob = synthesizeStereoWavBlob('nsdr-calm', 90);
  triggerBlobDownload(blob, 'Protocolo-NSDR-AntiAnsiedad-MiguelLopez.wav');
};

/**
 * Lightweight real-time Web Audio synthesizer for instant in-browser playback
 * (supports unlimited or preview durations without memory overhead).
 */
export class LiveBinauralPlayer {
  private ctx: AudioContext | null = null;
  private oscL: OscillatorNode | null = null;
  private oscR: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private masterGain: GainNode | null = null;
  private active = false;

  start(kind: AudioSessionKind, volume = 0.25) {
    this.stop();
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(Math.max(0.02, volume), ctx.currentTime + 1.2);
    masterGain.connect(ctx.destination);

    const pannerL = ctx.createStereoPanner();
    pannerL.pan.value = -0.85;
    pannerL.connect(masterGain);

    const pannerR = ctx.createStereoPanner();
    pannerR.pan.value = 0.85;
    pannerR.connect(masterGain);

    const oscL = ctx.createOscillator();
    const oscR = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subGain.gain.value = 0.35;

    oscL.type = 'sine';
    oscR.type = 'sine';
    subOsc.type = 'sine';

    if (kind === 'neuro-focus') {
      oscL.frequency.setValueAtTime(200, ctx.currentTime);
      oscR.frequency.setValueAtTime(240, ctx.currentTime);
      subOsc.frequency.setValueAtTime(100, ctx.currentTime);
    } else {
      oscL.frequency.setValueAtTime(174, ctx.currentTime);
      oscR.frequency.setValueAtTime(184, ctx.currentTime);
      // Gradually sweep R from 184 Hz (10 Hz Alpha) to 180 Hz (6 Hz Theta) over 10 minutes
      oscR.frequency.linearRampToValueAtTime(180, ctx.currentTime + 600);
      subOsc.frequency.setValueAtTime(87, ctx.currentTime);
    }

    oscL.connect(pannerL);
    oscR.connect(pannerR);
    subOsc.connect(subGain);
    subGain.connect(masterGain);

    oscL.start();
    oscR.start();
    subOsc.start();

    this.ctx = ctx;
    this.oscL = oscL;
    this.oscR = oscR;
    this.subOsc = subOsc;
    this.masterGain = masterGain;
    this.active = true;
  }

  stop() {
    this.active = false;
    try {
      this.oscL?.stop();
      this.oscR?.stop();
      this.subOsc?.stop();
      this.oscL?.disconnect();
      this.oscR?.disconnect();
      this.subOsc?.disconnect();
      this.masterGain?.disconnect();
      if (this.ctx && this.ctx.state !== 'closed') {
        void this.ctx.close();
      }
    } catch {
      // Ignore Web Audio cleanup errors
    } finally {
      this.ctx = null;
      this.oscL = null;
      this.oscR = null;
      this.subOsc = null;
      this.masterGain = null;
    }
  }

  isPlaying() {
    return this.active;
  }
}
