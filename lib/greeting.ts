export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export interface StudioGreeting {
  period: DayPeriod;
  headline: string;
  subnote: string;
}

const DEFAULT_GUEST_NAME = 'guest explorer';

function resolveAddressee(playerName?: string): string {
  const trimmed = playerName?.trim() ?? '';
  if (!trimmed || trimmed.toLowerCase() === DEFAULT_GUEST_NAME) {
    return 'scholar';
  }
  const firstToken = trimmed.split(/\s+/)[0] ?? '';
  if (!firstToken) return 'scholar';
  return firstToken.slice(0, 24);
}

/**
 * Produces a time-aware personalized greeting based on the local system hour (0-23).
 * Pass `hour = null` during SSR / pre-hydration to return a hydration-safe neutral welcome.
 */
export function getStudioGreeting(
  hour: number | null,
  playerName?: string
): StudioGreeting {
  const addressee = resolveAddressee(playerName);

  if (hour === null || Number.isNaN(hour)) {
    return {
      period: 'morning',
      headline: `Welcome back, ${addressee}!`,
      subnote: 'Your drafting desk is ready for a fresh round.',
    };
  }

  const normalizedHour = ((Math.floor(hour) % 24) + 24) % 24;

  if (normalizedHour >= 5 && normalizedHour < 12) {
    return {
      period: 'morning',
      headline: `Good morning, ${addressee}!`,
      subnote: 'Fresh notebook pages—ideal for a crisp morning warm-up.',
    };
  }

  if (normalizedHour >= 12 && normalizedHour < 17) {
    return {
      period: 'afternoon',
      headline: `Good afternoon, ${addressee}!`,
      subnote: 'Sharp focus for an afternoon sprint or today’s daily puzzle.',
    };
  }

  if (normalizedHour >= 17 && normalizedHour < 21) {
    return {
      period: 'evening',
      headline: `Good evening, ${addressee}!`,
      subnote: 'Settle in for a calm strategy match or seal today’s streak.',
    };
  }

  return {
    period: 'night',
    headline: `Late-night study, ${addressee}!`,
    subnote: 'Quiet desk hours—perfect for deep number theory thinking.',
  };
}
