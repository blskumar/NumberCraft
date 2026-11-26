import { useEffect, useRef } from 'react';

interface KeypadKeyboardHandlers {
  onDigit: (digit: string) => void;
  /** Present only for games that accept a leading minus sign. */
  onMinus?: () => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  onHint: () => void;
}

/** Window-level 0-9 / Backspace / Escape / Enter / H handling shared by the keypad arenas. */
export function useKeypadKeyboard(active: boolean, handlers: KeypadKeyboardHandlers) {
  // Latest handlers live in a ref so the listener attaches once per `active` change,
  // not on every render (the callers pass fresh closures each render).
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      const { onDigit, onMinus, onBackspace, onClear, onSubmit, onHint } = ref.current;
      // Leave browser shortcuts (zoom Ctrl/Cmd +/-/0, Alt+Left, ...) alone.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        onDigit(e.key);
      } else if (e.key === '-' && onMinus) {
        e.preventDefault();
        onMinus();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        onBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        onHint();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);
}
