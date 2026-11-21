'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Open modals, innermost last. Only the topmost one reacts to Escape.
const modalStack: symbol[] = [];

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0
  );
}

function hasTypedText(el: Element | null): boolean {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
  if (el instanceof HTMLInputElement && ['checkbox', 'radio', 'button', 'submit'].includes(el.type)) return false;
  return el.value.length > 0;
}

/**
 * Shared dialog behaviour: moves focus in on open, traps Tab, restores focus to
 * the opener on close, and handles Escape only when the dialog is topmost and
 * focus is inside it. Escape in a field that holds typed text first leaves the
 * field (so nothing is lost by a stray keypress); a second Escape closes.
 * Attach the returned ref to the dialog root element.
 */
export function useModalFocus<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onEscape: () => void
) {
  const ref = useRef<T>(null);
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    if (!root) return;
    const id = Symbol('modal');
    modalStack.push(id);
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!root.hasAttribute('tabindex')) root.tabIndex = -1;
    const raf = window.requestAnimationFrame(() => {
      if (!root.contains(document.activeElement)) {
        // Prefer the first real control; the dialog itself is the fallback.
        (focusables(root)[0] ?? root).focus({ preventScroll: true });
      }
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== id) return;
      const active = document.activeElement;
      if (e.key === 'Escape') {
        const inside = !active || active === document.body || root.contains(active);
        if (!inside) return;
        if (hasTypedText(active)) {
          root.focus({ preventScroll: true });
          return;
        }
        e.stopPropagation();
        escapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables(root);
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!root.contains(active) || active === root) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      const i = modalStack.indexOf(id);
      if (i >= 0) modalStack.splice(i, 1);
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  return ref;
}
