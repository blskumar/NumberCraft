import { useEffect } from 'react';

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
  const { onDigit, onMinus, onBackspace, onClear, onSubmit, onHint } = handlers;
  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
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
  }, [active, onDigit, onMinus, onBackspace, onClear, onSubmit, onHint]);
}
