import Link from 'next/link';
import type { ReactNode } from 'react';

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

interface Props {
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}

/** Server component: no client JS, no inline scripts (strict-CSP friendly). */
export default function LegalPage({ title, intro, sections }: Props) {
  return (
    <main
      id="main"
      className="mx-auto max-w-3xl px-4 py-8 text-sm leading-relaxed text-[#1C232B]"
    >
      <Link
        href="/"
        className="text-xs font-semibold text-[#1D4ED8] underline underline-offset-2"
      >
        Back to NumberCraft
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold">{title}</h1>
      <p className="mt-1 text-xs text-[#5A6572]">
        Draft version 2026-11-v1. Subject to legal review before launch.
      </p>
      <div className="mt-4 rounded-xl border border-[#D8D1C4] bg-white p-4">
        {intro}
      </div>
      {sections.map((s) => (
        <section key={s.heading} className="mt-6">
          <h2 className="font-display text-lg font-semibold">{s.heading}</h2>
          <div className="mt-2 space-y-2 text-[#1C232B]">{s.body}</div>
        </section>
      ))}
    </main>
  );
}
