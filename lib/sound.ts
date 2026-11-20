export type ArithmeticSoundCue = 'correct' | 'streak' | 'stage-up' | 'wrong';

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Pure cue selector for Core Arithmetic games (Addition Attack,
 * Subtraction Sprint, and Multiplication Mastery).
 */
export function getArithmeticSoundCue(params: {
  isCorrect: boolean;
  nextStreak: number;
  leveledUp: boolean;
}): ArithmeticSoundCue {
  if (!params.isCorrect) return 'wrong';
  if (params.leveledUp) return 'stage-up';
  if (params.nextStreak >= 3) return 'streak';
  return 'correct';
}

export function playTileClaimSound(enabled: boolean, isPrimeClaim: boolean): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isPrimeClaim ? 523.25 : 392.0, now);
    osc.frequency.exponentialRampToValueAtTime(
      isPrimeClaim ? 659.25 : 440.0,
      now + 0.09
    );

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    // Audio playback safely ignored in restricted environments
  }
}

export function playArithmeticFeedbackSound(
  enabled: boolean,
  cue: ArithmeticSoundCue
): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (cue === 'wrong') {
      // Soft, non-punitive warm wooden tap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(175, now + 0.1);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
      return;
    }

    if (cue === 'stage-up') {
      // Encouraging ascending triad for adaptive level-up or table stage climb
      const notes = [587.33, 739.99, 880.0];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.055);
        gain.gain.setValueAtTime(0.065, now + idx * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.055);
        osc.stop(now + idx * 0.055 + 0.24);
      });
      return;
    }

    if (cue === 'streak') {
      // Bright harmonic two-note chime for 3+ answer streaks
      const notes = [523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.075, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.18);
      });
      return;
    }

    // Standard crisp correct chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440.0, now);
    osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.08);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch {
    // Audio playback safely ignored in restricted environments
  }
}

export function playSoundPreviewChime(enabled: boolean): void {
  if (!enabled) return;
  playArithmeticFeedbackSound(true, 'streak');
}

export function playVictoryChord(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.06, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.34);
    });
  } catch {
    // Audio playback safely ignored
  }
}
