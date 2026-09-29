import type { Messages } from '$lib/i18n/locales/en';
import type { VoteResult } from './types';

/**
 * The line shown after a vote, from how your pick did with the crowd. Empty when there's
 * nothing to say: no result yet, or yours is the only vote on the pair.
 */
export function verdictFor(
  t: Messages['vote'],
  { error, result, chosen, streak }: { error: boolean; result: VoteResult | null; chosen: number | null; streak: number }
) {
  if (error) return t.error;
  if (!result || chosen === null || result.total === 1) return '';
  const mine = result.pct[chosen];
  const v = t.verdict;
  if (mine === 50) return v.tie;
  if (mine === 100) return v.unanimous;
  if (mine >= 80) return v.obvious;
  if (mine > 50) return streak >= 3 ? v.streak(streak) : v.crowd;
  if (mine <= 20) return v.contrarian;
  return v.minority;
}
