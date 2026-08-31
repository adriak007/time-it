/**
 * Sound engine.
 *
 * Effects are synthesised with the Web Audio API so the game ships with zero
 * audio assets and still feels alive. The public API is asset-agnostic: to move
 * to real files, give a cue a `src` in SOUND_SOURCES and playCue() will prefer
 * the buffer over the synth. See README "Replacing the sounds".
 *
 * NOTE: nothing here may ever fire on a repeating schedule while a timer is
 * running — an audible pulse would let the player count the interval.
 */

export type SoundCue =
  | 'tap'
  | 'start'
  | 'stop'
  | 'countdown'
  | 'go'
  | 'reveal'
  | 'perfect'
  | 'good'
  | 'bad'
  | 'roundWinner'
  | 'gameWinner'
  | 'menuClick';

/** Drop file URLs here to override a synthesised cue with a real asset. */
export const SOUND_SOURCES: Partial<Record<SoundCue, string>> = {};

type ToneSpec = {
  freq: number;
  /** Ratio applied to freq at the end of the tone; 1 = flat. */
  glide?: number;
  durationMs: number;
  type?: OscillatorType;
  gain?: number;
  delayMs?: number;
};

/** Each cue is one or more short tones. Kept deliberately soft and clean. */
const CUES: Record<SoundCue, ToneSpec[]> = {
  tap: [{ freq: 660, durationMs: 45, type: 'triangle', gain: 0.16 }],
  menuClick: [{ freq: 520, durationMs: 40, type: 'triangle', gain: 0.12 }],
  start: [{ freq: 520, glide: 1.5, durationMs: 130, type: 'sine', gain: 0.22 }],
  stop: [{ freq: 700, glide: 0.62, durationMs: 150, type: 'sine', gain: 0.22 }],
  countdown: [{ freq: 440, durationMs: 90, type: 'sine', gain: 0.18 }],
  go: [{ freq: 780, glide: 1.35, durationMs: 200, type: 'sine', gain: 0.26 }],
  reveal: [
    { freq: 420, durationMs: 120, type: 'sine', gain: 0.14 },
    { freq: 560, durationMs: 160, type: 'sine', gain: 0.14, delayMs: 90 },
  ],
  perfect: [
    { freq: 660, durationMs: 140, type: 'sine', gain: 0.24 },
    { freq: 880, durationMs: 150, type: 'sine', gain: 0.24, delayMs: 110 },
    { freq: 1320, glide: 1.02, durationMs: 420, type: 'sine', gain: 0.22, delayMs: 220 },
  ],
  good: [
    { freq: 590, durationMs: 120, type: 'sine', gain: 0.2 },
    { freq: 790, durationMs: 200, type: 'sine', gain: 0.18, delayMs: 90 },
  ],
  bad: [
    { freq: 300, durationMs: 180, type: 'triangle', gain: 0.16 },
    { freq: 220, durationMs: 240, type: 'triangle', gain: 0.14, delayMs: 110 },
  ],
  roundWinner: [
    { freq: 660, durationMs: 120, type: 'sine', gain: 0.2 },
    { freq: 880, durationMs: 140, type: 'sine', gain: 0.2, delayMs: 110 },
    { freq: 1100, durationMs: 260, type: 'sine', gain: 0.18, delayMs: 230 },
  ],
  gameWinner: [
    { freq: 523, durationMs: 150, type: 'sine', gain: 0.22 },
    { freq: 659, durationMs: 150, type: 'sine', gain: 0.22, delayMs: 140 },
    { freq: 784, durationMs: 170, type: 'sine', gain: 0.22, delayMs: 280 },
    { freq: 1047, glide: 1.01, durationMs: 520, type: 'sine', gain: 0.2, delayMs: 440 },
  ],
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SoundCue, AudioBuffer>();
  private enabled = true;
  private unlocked = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Must run inside a user gesture — browsers start AudioContext suspended.
   * Safe to call repeatedly.
   */
  unlock(): void {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        void this.preload();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      this.unlocked = true;
    } catch {
      this.ctx = null;
    }
  }

  private async preload(): Promise<void> {
    const entries = Object.entries(SOUND_SOURCES) as [SoundCue, string][];
    await Promise.all(
      entries.map(async ([cue, url]) => {
        try {
          const res = await fetch(url);
          const data = await res.arrayBuffer();
          const buffer = await this.ctx!.decodeAudioData(data);
          this.buffers.set(cue, buffer);
        } catch {
          /* fall back to the synthesised cue */
        }
      }),
    );
  }

  play(cue: SoundCue): void {
    if (!this.enabled || !this.unlocked || !this.ctx || !this.master) return;
    try {
      const buffer = this.buffers.get(cue);
      if (buffer) {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.master);
        source.start();
        return;
      }
      CUES[cue]?.forEach((spec) => this.playTone(spec));
    } catch {
      /* audio is never critical */
    }
  }

  private playTone(spec: ToneSpec): void {
    const ctx = this.ctx!;
    const startAt = ctx.currentTime + (spec.delayMs ?? 0) / 1000;
    const duration = spec.durationMs / 1000;
    const peak = spec.gain ?? 0.2;

    const osc = ctx.createOscillator();
    osc.type = spec.type ?? 'sine';
    osc.frequency.setValueAtTime(spec.freq, startAt);
    if (spec.glide && spec.glide !== 1) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, spec.freq * spec.glide),
        startAt + duration,
      );
    }

    // Short attack + exponential decay keeps cues crisp, never clicky.
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, startAt);
    env.gain.exponentialRampToValueAtTime(peak, startAt + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(env);
    env.connect(this.master!);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
  }
}

export const audio = new AudioEngine();
