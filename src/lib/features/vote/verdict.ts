import type { Messages } from '$lib/i18n/locales/en';
import type { VoteResult } from './types';

/**
 * The line shown after a vote, from how your pick did with the crowd. Empty when there's
 * nothing to say: no result yet, or yours is the only vote on the pair. Each verdict has a few
 * wordings, and `variant` picks one: one number up is the next wording, so counting up never repeats.
 */
export function verdictFor(
  t: Messages['vote'],
  {
    error,
    result,
    chosen,
    streak,
    variant
  }: { error: boolean; result: VoteResult | null; chosen: number | null; streak: number; variant: number }
) {
  if (error) return t.error;
  if (!result || chosen === null || result.total === 1) return '';
  // Ties, clean sweeps and who won come from the counts: the rounded share reads 50% or 100%
  // with a vote or two the other way once a pair has over a hundred. Its 80% and 20% lines are
  // only rough, so they go by the share on screen.
  const [mine, theirs] = [result.votes[chosen], result.votes[1 - chosen]];
  const share = result.pct[chosen];
  const v = t.verdict;
  const pick = (lines: string[]) => lines[variant % lines.length];
  if (mine === theirs) return pick(v.tie);
  if (theirs === 0) return pick(v.unanimous);
  if (share >= 80) return pick(v.obvious);
  if (mine > theirs) return pick(streak >= 3 ? v.streak(streak) : v.crowd);
  if (share <= 20) return pick(v.contrarian);
  return pick(v.minority);
}
