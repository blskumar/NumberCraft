import { ArrowRight, Database } from 'lucide-react';

/** "Load Sample Progress" + "Start Daily Challenge" call-to-action pair shared by the dashboard chart empty states. */
export default function SampleDailyActions({
  className,
  hasSampleData,
  onLoadSampleDashboard,
  onOpenDaily,
}: {
  className: string;
  hasSampleData: boolean;
  onLoadSampleDashboard: () => void;
  onOpenDaily: () => void;
}) {
  return (
    <div className={className}>
      {!hasSampleData && (
        <button
          type="button"
          onClick={onLoadSampleDashboard}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3 py-1.5 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] whitespace-nowrap shrink-0"
        >
          <Database className="h-3.5 w-3.5" aria-hidden="true" />
          Load Sample Progress
        </button>
      )}
      <button
        type="button"
        onClick={onOpenDaily}
        className="btn-cobalt inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
      >
        Start Daily Challenge
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
