'use client';

import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export interface TooltipProps {
  content: string;
  children: ReactNode;
  placement?: 'top' | 'bottom';
  className?: string;
}

export default function Tooltip({
  content,
  children,
  placement = 'bottom',
  className = '',
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const prefersReducedMotion = useReducedMotion();

  const positionClasses =
    placement === 'top'
      ? 'bottom-full left-1/2 mb-2 -translate-x-1/2'
      : 'top-full left-1/2 mt-2 -translate-x-1/2';

  const initialY = placement === 'top' ? 4 : -4;

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpen(false);
        }
      }}
    >
      <span aria-describedby={open ? tooltipId : undefined} className="inline-flex w-full">
        {children}
      </span>

      <AnimatePresence>
        {open && (
          <motion.span
            id={tooltipId}
            role="tooltip"
            data-testid="studio-tooltip"
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, y: initialY, scale: 0.97 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: initialY, scale: 0.97 }
            }
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-none absolute z-50 w-max max-w-[230px] rounded-lg border border-[#2C3642] bg-[#1C232B] px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-[#FAF8F4] shadow-[0_8px_18px_rgba(28,35,43,0.22)] ${positionClasses}`}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
