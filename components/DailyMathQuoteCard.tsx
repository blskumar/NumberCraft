'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Quote,
  RotateCcw,
} from 'lucide-react';
import { getDailyMathQuote } from '@/lib/daily-quotes';

interface DailyMathQuoteCardProps {
  dateKey: string;
  formattedDate: string;
}

export default function DailyMathQuoteCard({
  dateKey,
  formattedDate,
}: DailyMathQuoteCardProps) {
  const [browseOffset, setBrowseOffset] = useState(0);
  const [copied, setCopied] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const selection = useMemo(
    () => getDailyMathQuote(dateKey, browseOffset),
    [dateKey, browseOffset]
  );

  const { quote, index, total } = selection;
  const isTodayQuote = browseOffset === 0;

  const handleCopy = async () => {
    const text = `“${quote.text}” — ${quote.author} (${quote.specialty})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable in restricted browser context
    }
  };

  return (
    <motion.section
      aria-label="Daily mathematician quote"
      data-testid="daily-math-quote"
      initial={
        prefersReducedMotion
          ? { opacity: 1, scale: 1 }
          : { opacity: 0, scale: 0.975, y: 10 }
      }
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.42,
        delay: prefersReducedMotion ? 0 : 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="card-tactile mt-10 origin-center rounded-2xl border-[#E5E0D5] bg-[#FFFDF9] p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE7DD] pb-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Quote className="h-3.5 w-3.5 shrink-0 text-[#B45309]" aria-hidden="true" />
          <span className="font-mono font-semibold text-[#B45309]">
            {isTodayQuote
              ? `Daily Mathematician’s Note · ${formattedDate}`
              : 'Archive Note · Mathematician’s Marginalia'}
          </span>
          <span className="text-[#C5BEB0]" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-[#5A6572] tabular-nums">
            #{index + 1} of {total}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {!isTodayQuote && (
            <button
              type="button"
              data-testid="daily-quote-today"
              onClick={() => setBrowseOffset(0)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#D8D1C4] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1D4ED8] hover:border-[#1D4ED8] transition-colors"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Today
            </button>
          )}
          <button
            type="button"
            data-testid="daily-quote-prev"
            onClick={() => setBrowseOffset((prev) => prev - 1)}
            aria-label="Previous mathematician quote"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#D8D1C4] bg-white text-[#5A6572] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="daily-quote-next"
            onClick={() => setBrowseOffset((prev) => prev + 1)}
            aria-label="Next mathematician quote"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#D8D1C4] bg-white text-[#5A6572] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="daily-quote-copy"
            onClick={handleCopy}
            aria-label="Copy quote"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5A6572] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-[#047857]" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" aria-hidden="true" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={quote.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-end"
        >
          <div className="border-l-2 border-[#B45309]/70 pl-4 sm:pl-5 lg:col-span-8">
            <blockquote
              data-testid="daily-quote-text"
              className="font-display text-xl font-semibold leading-[1.35] text-[#1C232B] sm:text-2xl [text-wrap:balance]"
            >
              “{quote.text}”
            </blockquote>
            <p
              data-testid="daily-quote-author"
              className="mt-3 text-xs font-medium text-[#5A6572]"
            >
              <span className="font-semibold text-[#1C232B]">
                — {quote.author}
              </span>{' '}
              · {quote.specialty} ({quote.era})
            </p>
          </div>

          <div className="rounded-xl border border-[#ECE7DD] bg-[#FAF8F4] px-4 py-3.5 lg:col-span-4">
            <p className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
              Notebook Reflection
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#46515E]">
              {quote.studioNote}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}
