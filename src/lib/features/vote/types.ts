import type { Id } from '$convex/dataModel';

export type Poster = { _id: Id<'posters'>; title: string; image: string };

/**
 * Where a round is up to: `enter` (flying in), `choose` (waiting for a vote), `reveal` (showing
 * the crowd's split), `exit` (flying out). `loading` comes before the first pair, `done` after the last,
 * and `seenAll` after the pair that showed them the last of the posters they hadn't seen.
 */
export type Phase = 'loading' | 'enter' | 'choose' | 'reveal' | 'exit' | 'seenAll' | 'done';

/** Each side's share of the votes on this pair (by screen position), and how many votes that is. */
export type VoteResult = { pct: [number, number]; total: number };
