// Plain constants and helpers used by both the Convex functions and the site (via `$shared`).
// Keep this file free of server-only imports so the browser bundle can include it.

import type { Id } from './_generated/dataModel';

/** Whose votes a tally counts. Votes from before we asked about designers only count towards 'all'. */
export type Segment = 'all' | 'designers' | 'others';
export const SEGMENTS: Segment[] = ['all', 'designers', 'others'];

/** Every poster starts here; the Elo K-factor sets how far one vote moves a rating. */
export const START_RATING = 1000;
export const K = 32;

/** A city needs this many votes before it gets a local favourite. */
export const LOCAL_MIN_VOTES = 5;

/** The two posters in id order, so a pair has one key whichever way round it was voted. */
export function orderPair(x: Id<'posters'>, y: Id<'posters'>) {
  return x < y ? ([x, y] as const) : ([y, x] as const);
}

/** The group a vote counts towards besides 'all', from what the voter said; null if they weren't asked. */
export function groupOf(designer: boolean | undefined): Exclude<Segment, 'all'> | null {
  return designer === true ? 'designers' : designer === false ? 'others' : null;
}
