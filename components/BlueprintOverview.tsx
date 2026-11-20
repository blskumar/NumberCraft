'use client';

import { ArrowRight, Check, X } from 'lucide-react';

interface BlueprintOverviewProps {
  onLaunchFactorGrid: () => void;
}

export default function BlueprintOverview({
  onLaunchFactorGrid,
}: BlueprintOverviewProps) {
  return (
    <main className="mx-auto max-w-[1040px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E0D5] pb-5">
        <div>
          <p className="text-xs font-medium text-[#1D4ED8]">
            Product Architecture · Full Studio Roadmap
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold text-[#1C232B]">
            Numbercraft Blueprint
          </h1>
          <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-[#46515E]">
            Review how all three mathematical disciplines, guardrails, and the
            guest-to-cloud sign-in model fit together before we build the
            remaining two sets and live Firebase multiplayer.
          </p>
        </div>
        <button
          type="button"
          onClick={onLaunchFactorGrid}
          className="btn-cobalt inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap"
        >
          Try Factor Grid Prototype
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Three Sets Summary */}
      <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {[
          {
            set: 'Set 01 · Basic Arithmetic',
            title: 'Equation Foundry',
            status: 'Planned for Full Build',
            summary:
              'Build live target expressions from shared tactile number tiles using +, −, ×, ÷, brackets, and powers with an algorithmic Expression Solver AI.',
          },
          {
            set: 'Set 02 · Modular Probability',
            title: 'Odds & Urns',
            status: 'Planned for Full Build',
            summary:
              'Switchable Marble Urn, Twin Dice, and Conditional Spinner chambers where players estimate exact odds and press or bank against an Expected-Value Bot.',
          },
          {
            set: 'Set 03 · Strategy Number Theory',
            title: 'Factor Grid',
            status: 'Live Interactive Prototype',
            summary:
              'Territorial divisor-capture grid (1–20 / 1–36 / 1–49) with Solo Taxman, Minimax Alpha-Beta AI, Local Pass-and-Play, and Prime Trap variant.',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="card-tactile rounded-2xl p-5"
          >
            <p className="text-xs font-medium text-[#5A6572]">{item.set}</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-[#1C232B]">
              {item.title}
            </h2>
            <p className="mt-1 text-xs font-semibold text-[#1D4ED8]">
              {item.status}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#46515E]">
              {item.summary}
            </p>
          </div>
        ))}
      </section>

      {/* Include vs Exclude Guardrails */}
      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="card-tactile rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-[#1C232B]">
            What We Include
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-[#46515E]">
            {[
              'Instant 1-click guest play with zero mandatory signup wall',
              'Deterministic, explainable math AI (Expression Solver, EV Bot, Minimax)',
              'Live visual manipulatives (divisor previews, urn marbles, step trees)',
              'Child-safe 6-character private rooms with structured turn moves only',
              'Adaptive difficulty across Explorers (8–10), Challengers (11–13), and Strategists (14–16)',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#047857]"
                  aria-hidden="true"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-tactile rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-[#1C232B]">
            What We Intentionally Exclude
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-[#46515E]">
            {[
              'No open public chat rooms or stranger matchmaking for minors',
              'No LLM chatbots or hallucinated math hints inside gameplay',
              'No punitive panic timers or "3 lives locked out" flashcard walls',
              'No loot boxes, streak shaming, coins, or paywall gates',
              'No noisy neon clutter or multi-layered card-inside-card chrome',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <X
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                  aria-hidden="true"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
