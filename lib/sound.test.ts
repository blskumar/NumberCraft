import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getArithmeticSoundCue,
  playArithmeticFeedbackSound,
  playSoundPreviewChime,
  playTileClaimSound,
  playVictoryChord,
} from './sound';

describe('Global Audio Feedback (lib/sound.ts)', () => {
  it('selects wrong cue whenever answer is incorrect regardless of prior state', () => {
    assert.equal(
      getArithmeticSoundCue({ isCorrect: false, nextStreak: 0, leveledUp: false }),
      'wrong'
    );
    assert.equal(
      getArithmeticSoundCue({ isCorrect: false, nextStreak: 5, leveledUp: true }),
      'wrong'
    );
  });

  it('prioritizes stage-up cue on adaptive level-up or multiplication stage climb', () => {
    assert.equal(
      getArithmeticSoundCue({ isCorrect: true, nextStreak: 1, leveledUp: true }),
      'stage-up'
    );
    assert.equal(
      getArithmeticSoundCue({ isCorrect: true, nextStreak: 4, leveledUp: true }),
      'stage-up'
    );
  });

  it('distinguishes normal correct answers from 3+ streak combos', () => {
    assert.equal(
      getArithmeticSoundCue({ isCorrect: true, nextStreak: 1, leveledUp: false }),
      'correct'
    );
    assert.equal(
      getArithmeticSoundCue({ isCorrect: true, nextStreak: 2, leveledUp: false }),
      'correct'
    );
    assert.equal(
      getArithmeticSoundCue({ isCorrect: true, nextStreak: 3, leveledUp: false }),
      'streak'
    );
  });

  it('safely no-ops when global sound is muted or executed outside browser', () => {
    assert.doesNotThrow(() => {
      playArithmeticFeedbackSound(false, 'correct');
      playArithmeticFeedbackSound(false, 'streak');
      playArithmeticFeedbackSound(false, 'stage-up');
      playArithmeticFeedbackSound(false, 'wrong');
      playArithmeticFeedbackSound(true, 'correct');
      playSoundPreviewChime(false);
      playSoundPreviewChime(true);
      playTileClaimSound(false, true);
      playVictoryChord(false);
    });
  });
});
