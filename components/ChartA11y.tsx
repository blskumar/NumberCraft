'use client';

import { useEffect, useId, useRef } from 'react';

type Row = Record<string, unknown>;

interface ChartA11yProps {
  /** Short accessible name for the chart, e.g. "Daily solves, last 30 days". */
  label: string;
  /** The same rows the chart renders; primitive columns become a hidden table. */
  data: readonly Row[] | undefined;
}

const MAX_ROWS = 60;

/**
 * Drop this as a child of the element that wraps a Recharts chart. It gives the
 * chart SVG role="img" + an accessible name (instead of an unnamed
 * role="application") and exposes the data as a visually hidden table.
 * The SVG stays focusable, so Recharts' keyboard tooltip navigation keeps working.
 */
export default function ChartA11y({ label, data }: ChartA11yProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const rows = (data ?? []).slice(0, MAX_ROWS);
  const columns = rows.length
    ? Object.keys(rows[0]).filter((k) => ['string', 'number', 'boolean'].includes(typeof rows[0][k]))
    : [];

  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const patch = () => {
      host.querySelectorAll('svg.recharts-surface').forEach((svg) => {
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', label);
        svg.setAttribute('aria-describedby', id);
      });
    };
    patch();
    const mo = new MutationObserver(patch);
    mo.observe(host, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [label, id]);

  return (
    <div ref={ref} className="sr-only-data"><table id={id}>
      <caption>{label}</caption>
      {columns.length > 0 && (
        <>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c}>{String(r[c])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </>
      )}
    </table></div>
  );
}
