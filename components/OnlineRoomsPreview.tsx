'use client';

import { useState } from 'react';
import { Check, Copy, Lock, Play, Users } from 'lucide-react';
import {
  generatePrototypeRoomCode,
  TIER_SPECS,
} from '@/lib/factor-grid-engine';
import type { AgeTier, StudentProfile } from '@/lib/types';

interface OnlineRoomsPreviewProps {
  ageTier: AgeTier;
  profile: StudentProfile;
  onOpenAccount: () => void;
  onLaunchLocalFactorGrid: () => void;
}

export default function OnlineRoomsPreview({
  ageTier,
  profile,
  onOpenAccount,
  onLaunchLocalFactorGrid,
}: OnlineRoomsPreviewProps) {
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [joinFeedback, setJoinFeedback] = useState<{
    kind: 'error' | 'info';
    text: string;
  } | null>(null);

  const spec = TIER_SPECS[ageTier];

  function handleCreateRoom() {
    setCreatedCode(generatePrototypeRoomCode());
    setCopied(false);
    setJoinFeedback(null);
  }

  function handleCopyCode() {
    if (!createdCode) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(createdCode).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = joinInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized.length !== 6) {
      setJoinFeedback({
        kind: 'error',
        text: 'Enter a valid 6-character room code (for example, K7M-4QP).',
      });
      return;
    }
    const formatted = `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
    setJoinFeedback({
      kind: 'info',
      text: `Room ${formatted} format verified. Live cross-device Firestore room sync activates once you approve the full Firebase build.`,
    });
  }

  return (
    <main className="mx-auto max-w-[1040px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-[#E5E0D5] pb-5">
        <p className="text-xs font-medium text-[#1D4ED8]">
          Multiplayer UI Model · Child-Safe Private Codes
        </p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold text-[#1C232B]">
          Online Room Codes
        </h1>
        <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-[#46515E]">
          Play mathematics and probability matches across separate devices using
          private 6-character codes. Rooms display only student nicknames—never
          email addresses or open free-text chat.
        </p>
      </div>

      {profile.sessionKind === 'guest' && (
        <div className="card-tactile mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Lock
              className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-[#1C232B]">
                Guest Mode Active — Optional Sign-In for Live Hosting
              </p>
              <p className="mt-0.5 text-xs text-[#5A6572]">
                In the full build, Google Sign-In verifies room ownership and
                protects turn security rules. You can still inspect the room UI
                flow below right now.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAccount}
            className="rounded-lg border border-[#D8D1C4] bg-[#FAF8F4] px-4 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
          >
            Preview Sign-In Flow
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Create Room Panel */}
        <section className="card-tactile flex flex-col justify-between rounded-2xl p-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#1C232B]">
              Host a Private Room
            </h2>
            <p className="mt-1.5 text-sm text-[#46515E]">
              Generate a shareable 6-character code for{' '}
              <strong className="font-semibold text-[#1C232B]">
                Factor Grid · 1–{spec.boardMax}
              </strong>{' '}
              ({spec.label}).
            </p>

            {createdCode ? (
              <div className="mt-5 rounded-lg border border-[#1D4ED8]/30 bg-[#FAF8F4] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#5A6572]">
                      Generated Prototype Room Code
                    </p>
                    <p
                      data-testid="generated-room-code"
                      className="mt-1 font-mono text-2xl font-semibold tracking-widest text-[#1D4ED8] tabular-nums"
                    >
                      {createdCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] transition-colors whitespace-nowrap"
                  >
                    {copied ? (
                      <>
                        <Check
                          className="h-3.5 w-3.5 text-[#047857]"
                          aria-hidden="true"
                        />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>

                <dl className="mt-4 space-y-2 border-t border-[#E5E0D5] pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-[#5A6572]">Seat 1 (Host)</dt>
                    <dd className="font-semibold text-[#1C232B]">
                      {profile.displayName} · Ready
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#5A6572]">Seat 2 (Guest)</dt>
                    <dd className="text-[#5A6572]">
                      Waiting for friend to enter code
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-[#D8D1C4] bg-[#FAF8F4] p-5 text-xs text-[#5A6572]">
                Click <strong className="text-[#1C232B]">Generate Room Code</strong>{' '}
                below to preview the live room lobby seating card.
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleCreateRoom}
              className="btn-cobalt inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              {createdCode ? 'Generate New Code' : 'Generate Room Code'}
            </button>

            <button
              type="button"
              onClick={onLaunchLocalFactorGrid}
              className="inline-flex items-center gap-2 rounded-lg border border-[#D8D1C4] bg-[#FAF8F4] px-4 py-2.5 text-sm font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Play Local Pass-and-Play Now
            </button>
          </div>
        </section>

        {/* Join Room Panel */}
        <section className="card-tactile flex flex-col justify-between rounded-2xl p-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#1C232B]">
              Join a Friend&apos;s Room
            </h2>
            <p className="mt-1.5 text-sm text-[#46515E]">
              Enter the 6-character code shared by your classmate or teacher to
              claim Seat 2 and sync the board.
            </p>

            <form onSubmit={handleJoinSubmit} className="mt-5 space-y-3">
              <div>
                <label
                  htmlFor="room-code-input"
                  className="block text-xs font-semibold text-[#1C232B]"
                >
                  6-Character Room Code
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="room-code-input"
                    type="text"
                    maxLength={7}
                    placeholder="K7M-4QP"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                    className="flex-1 rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2.5 font-mono text-base tracking-widest text-[#1C232B] uppercase focus:border-[#1D4ED8] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-[#1C232B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] transition-colors whitespace-nowrap"
                  >
                    Join Room
                  </button>
                </div>
              </div>

              {joinFeedback && (
                <p
                  className={`text-xs font-medium ${
                    joinFeedback.kind === 'error'
                      ? 'text-[#BE123C]'
                      : 'text-[#047857]'
                  }`}
                >
                  {joinFeedback.text}
                </p>
              )}
            </form>
          </div>

          <div className="mt-6 border-t border-[#ECE7DD] pt-4 text-xs leading-relaxed text-[#5A6572]">
            <strong className="font-semibold text-[#1C232B]">
              Full-Build Sync Architecture:
            </strong>{' '}
            Uses Firestore <span className="font-mono">/rooms/{'{code}'}</span>{' '}
            documents with real-time <span className="font-mono">onSnapshot</span>{' '}
            listeners and participant-only security rules so only the two seated
            players can submit validated moves.
          </div>
        </section>
      </div>
    </main>
  );
}
