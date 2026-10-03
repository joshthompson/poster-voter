import type { Id } from './_generated/dataModel';
import { START_RATING } from './shared';

// The Bradley-Terry model: each poster has a strength p, and it beats another with probability
// p / (p + q). The fit finds the strengths that best explain every head-to-head so far, using
// the MM algorithm (Hunter, 2004).
//
// Each poster also counts as having won one match and lost one against an imaginary poster of
// strength 1 (START_RATING). That keeps a poster with only wins (or only losses) from running off
// to infinity, holds posters with few votes near the start, and fixes the scale.

/** Imaginary wins, and losses, each poster gets against a START_RATING poster. */
const PRIOR = 1;
const MAX_ITERATIONS = 500;
/** Stop once no strength moves by more than this fraction in an iteration. */
const TOLERANCE = 1e-7;

type Matchup = { aId: Id<'posters'>; bId: Id<'posters'>; aWins: number; bWins: number };

/**
 * Ratings for every poster in `matchups`, on the Elo scale so the numbers read the same either
 * way: a poster 400 points ahead is expected to win 10 to 1.
 */
export function bradleyTerry(matchups: Matchup[]): Map<Id<'posters'>, number> {
  const wins = new Map<Id<'posters'>, number>();
  for (const m of matchups) {
    wins.set(m.aId, (wins.get(m.aId) ?? 0) + m.aWins);
    wins.set(m.bId, (wins.get(m.bId) ?? 0) + m.bWins);
  }
  let strength = new Map([...wins.keys()].map((id) => [id, 1]));

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Sum over each poster's opponents of games / (own strength + theirs), the imaginary one included.
    const sums = new Map([...strength].map(([id, p]) => [id, (2 * PRIOR) / (p + 1)]));
    for (const m of matchups) {
      const games = m.aWins + m.bWins;
      if (!games) continue;
      const share = games / (strength.get(m.aId)! + strength.get(m.bId)!);
      sums.set(m.aId, sums.get(m.aId)! + share);
      sums.set(m.bId, sums.get(m.bId)! + share);
    }
    const next = new Map<Id<'posters'>, number>();
    let moved = 0;
    for (const [id, p] of strength) {
      const q = (wins.get(id)! + PRIOR) / sums.get(id)!;
      moved = Math.max(moved, Math.abs(q - p) / p);
      next.set(id, q);
    }
    strength = next;
    if (moved < TOLERANCE) break;
  }

  return new Map([...strength].map(([id, p]) => [id, START_RATING + 400 * Math.log10(p)]));
}
