export type AudioSessionKind = 'neuro-focus' | 'nsdr-calm';

const SAMPLE_RATE = 22050;

const writeAscii = (view: DataView, offset: number, text: string) => {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
};

/**
 * Synthesizes a 16-bit Stereo PCM RIFF WAVE Blob purely in TypeScript.
 * - neuro-focus: 180s (3 min) 40 Hz Gamma binaural (200 Hz L / 240 Hz R) + warm 100/300 Hz harmonic pad
 * - nsdr-calm: 240s (4 min) Alpha (10 Hz) -> Theta (6 Hz) sweep + 4-7-8 breathing swell cadence
 */
export const synthesizeStereoWavBlob = (kind: AudioSessionKind, durationSec?: number): Blob => {
  const duration = durationSec ?? (kind === 'neuro-focus' ? 180 : 240);
  const numChannels = 2;
  const bitsPerSample = 16;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const dataByteLength = totalSamples * numChannels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  // RIFF Header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
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
    const fadeIn = Math.min(1, t / 4);
    const fadeOut = Math.min(1, (duration - t) / 4);
    const masterEnv = fadeIn * fadeOut;

    const pseudoWhite = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    const white = (pseudoWhite - Math.floor(pseudoWhite)) * 2 - 1;
    noiseState = noiseState * 0.965 + white * 0.035;

    let left = 0;
    let right = 0;

    if (kind === 'neuro-focus') {
      const harmonicPad =
        0.11 * Math.sin(2 * Math.PI * 100 * t) +
        0.045 * Math.sin(2 * Math.PI * 150 * t) +
        0.035 * Math.sin(2 * Math.PI * 300 * t);
      const pulse = 0.86 + 0.14 * Math.sin(2 * Math.PI * 0.2 * t);
      left = (0.25 * Math.sin(2 * Math.PI * 200 * t) * pulse + harmonicPad + noiseState * 0.13) * masterEnv;
      right = (0.25 * Math.sin(2 * Math.PI * 240 * t) * pulse + harmonicPad + noiseState * 0.13) * masterEnv;
    } else {
      const progress = t / duration;
      const beatFreq = 10 - 4 * progress;
      const breathEnv = 0.72 + 0.28 * Math.sin(2 * Math.PI * (t / 19) - Math.PI / 2);
      const warmSub =
        0.14 * Math.sin(2 * Math.PI * 87 * t) +
        0.06 * Math.sin(2 * Math.PI * 130.5 * t) +
        0.045 * Math.sin(2 * Math.PI * 261 * t);
      const phaseL = 2 * Math.PI * 174 * t;
      const phaseR = 2 * Math.PI * (184 * t - (2 * t * t) / duration);

      left = (0.23 * Math.sin(phaseL) * breathEnv + warmSub + noiseState * 0.16) * masterEnv;
      right = (0.23 * Math.sin(phaseR + beatFreq * 0.001) * breathEnv + warmSub + noiseState * 0.16) * masterEnv;
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
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const downloadNeuroAudioWav = () => {
  const blob = synthesizeStereoWavBlob('neuro-focus', 180);
  triggerBlobDownload(blob, 'Audio-Binaural-40Hz-Enfoque-MiguelLopez.wav');
};

export const downloadNsdrAudioWav = () => {
  const blob = synthesizeStereoWavBlob('nsdr-calm', 240);
  triggerBlobDownload(blob, 'Audio-Calma-Examen-MiguelNeftali.wav');
};

/**
 * Real-time Web Audio API synthesizer for instant uninterrupted browser playback.
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
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
