// Which pair of posters to show next.
//
// 1. Until you've seen every poster, pair up ones you haven't seen (80 posters → 40 pairs).
// 2. Then only pairs you haven't voted on, favouring ones not shown yet this visit.
// 3. Once every pair has your vote, there's nothing left: returns null.

type Item = { _id: string };

export type PairState = {
  hasSeen: (id: string) => boolean;
  hasVoted: (key: string) => boolean;
  wasShown: (key: string) => boolean;
  /** The pair on screen, so it isn't picked again straight away unless it's the only one left. */
  avoid?: string;
};

const random = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/** Order-independent key for a pair, matching the server's "smallerId|largerId". */
export const pairKey = ([a, b]: Item[]) => (a._id < b._id ? `${a._id}|${b._id}` : `${b._id}|${a._id}`);

export function nextPair<T extends Item>(from: T[], s: PairState): T[] | null {
  const unseen = from.filter((p) => !s.hasSeen(p._id));
  if (unseen.length >= 2) {
    const a = random(unseen);
    return [a, random(unseen.filter((p) => p !== a))];
  }

  let open: T[][] = [];
  for (let i = 0; i < from.length; i++) {
    for (let j = i + 1; j < from.length; j++) {
      if (!s.hasVoted(pairKey([from[i], from[j]]))) open.push([from[i], from[j]]);
    }
  }
  const others = open.filter((p) => pairKey(p) !== s.avoid);
  if (others.length) open = others;
  if (!open.length) return null;

  // An odd poster out still gets its first showing next; then fresh pairs before skipped ones.
  const pool = [
    unseen.length ? open.filter((p) => p.includes(unseen[0])) : [],
    open.filter((p) => !s.wasShown(pairKey(p))),
    open
  ].find((p) => p.length)!;
  const next = random(pool);
  return Math.random() < 0.5 ? next : [next[1], next[0]];
}
