/** Pill-button class shared by the dashboard's segmented filter and tab controls. */
export const segClass = (active: boolean) =>
  `rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
    active
      ? 'bg-white text-[#1C232B] shadow-xs'
      : 'text-[#5A6572] hover:text-[#1C232B]'
  }`;
