import type { ReactNode } from 'react';

/** Accessible group wrapper + polite "arena active" announcement shared by every game tab. */
export default function GameArenaShell({
  testId,
  label,
  announce,
  children,
}: {
  testId: string;
  label: string;
  announce: string;
  children: ReactNode;
}) {
  return (
    <div data-testid={testId} role="group" aria-label={label}>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
      {children}
    </div>
  );
}
