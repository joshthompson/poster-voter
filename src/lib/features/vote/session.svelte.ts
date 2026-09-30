import { posterSrc, preload } from '$lib/utils/images';
import { pairOrder } from './pairing';
import { createProgress } from './progress';
import type { Phase, Poster, VoteResult } from './types';

// One visitor's run through the pairs: which pair is up, and the enter → choose → reveal → exit
// cycle around each vote. Knows nothing about Convex; the page passes in its data and a way to vote.

const ENTER_MS = 1100;
const REVEAL_MS = 3000;
const EXIT_MS = 700;

type Source = {
  /** The competition's posters (reactive). */
  posters: () => Poster[];
  /** Ids of posters taken out of it, whose pairs are skipped (reactive). */
  removed: () => string[];
  /** The collection (competition) they belong to (reactive): undefined until known, null if none. */
  collection: () => string | null | undefined;
  /** Record a vote; resolves to both posters' vote counts on this pair. */
  cast: (winner: Poster, loser: Poster) => Promise<{ winnerVotes: number; loserVotes: number }>;
};

/**
 * A pair to show, where it is in the visitor's order for its collection, how many posters they've
 * been shown before it, and how many of its two are new to them.
 */
type Next = { pair: Poster[]; collection: string; at: number; seen: number; fresh: number };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class VoteSession {
  pair = $state<Poster[] | null>(null);
  phase = $state<Phase>('loading');
  chosen = $state<number | null>(null);
  result = $state<VoteResult | null>(null);
  error = $state(false);
  /** Goes up with every new pair, so the page can replay its entrance animations. */
  round = $state(0);
  /** Votes in a row that went with the crowd. */
  streak = $state(0);
  /**
   * How many of the posters they've been shown (counting this pair once it's voted on or skipped),
   * out of how many there are. Null once they'd been shown them all before this pair.
   */
  progress = $state<{ seen: number; total: number } | null>(null);

  #source: Source;
  #progress = createProgress();
  #shown: Next | null = null;
  #revealTimer: ReturnType<typeof setTimeout> | undefined;
  /** What's keeping the reveal on screen (see `hold`). */
  #holds = new Set<string>();
  #showing = false;

  constructor(source: Source) {
    this.#source = source;
  }

  get canVote() {
    return this.phase === 'choose' && !!this.pair;
  }

  /** Whether the reveal is on screen with something to show, so it can be dismissed. */
  get revealed() {
    return this.phase === 'reveal' && (!!this.result || this.error);
  }

  /** Every pair of the current posters, for the "you've been through them all" message. */
  get totalPairs() {
    const n = this.#source.posters().length;
    return (n * (n - 1)) / 2;
  }

  /** Show the first pair once there are posters; also picks up again from `done` when new ones arrive. */
  refresh() {
    if (this.pair || this.#showing || this.#source.posters().length < 2 || !this.#source.collection()) return;
    if (this.phase === 'loading') this.#show(this.#next());
    else if (this.phase === 'done') {
      const next = this.#next();
      if (next) this.#show(next);
    }
  }

  async vote(i: number) {
    if (!this.canVote) return;
    const pair = this.pair!;
    const [winner, loser] = [pair[i], pair[1 - i]];
    this.chosen = i;
    this.phase = 'reveal';
    this.#count();

    try {
      const r = await this.#source.cast(winner, loser);
      const total = r.winnerVotes + r.loserVotes;
      const w = Math.round((r.winnerVotes / total) * 100);
      this.result = { pct: i === 0 ? [w, 100 - w] : [100 - w, w], total };
      this.streak = w >= 50 ? this.streak + 1 : 0;
    } catch (e) {
      this.error = true;
      console.error(e);
    }
    this.#autoAdvance();
  }

  /**
   * Keep the reveal on screen while `by` needs it (e.g. the pointer is over a share button)
   * instead of moving on by itself. Once nothing holds it, it moves on REVEAL_MS later.
   */
  hold(by: string, held: boolean) {
    if (held) this.#holds.add(by);
    else this.#holds.delete(by);
    this.#autoAdvance();
  }

  /** Move on REVEAL_MS from now, if the reveal is showing and nothing holds it. */
  #autoAdvance() {
    clearTimeout(this.#revealTimer);
    if (this.revealed && !this.#holds.size) this.#revealTimer = setTimeout(() => this.advance(), REVEAL_MS);
  }

  skip() {
    if (this.phase === 'choose') this.advance();
  }

  async advance() {
    clearTimeout(this.#revealTimer);
    this.phase = 'exit';
    this.#count();
    // Voted or skipped, this pair is done with: carry on after it, this visit or the next.
    if (this.#shown) this.#progress.set(this.#shown.collection, this.#shown.at + 1);
    await wait(EXIT_MS);
    // This pair showed them the last of the posters: say so before the next one.
    if (this.progress && this.progress.seen >= this.progress.total) {
      this.pair = null;
      this.progress = null;
      this.phase = 'seenAll';
      return;
    }
    await this.#show(this.#next());
  }

  /** Move on from the "you've seen every poster" message to the next pair. */
  carryOn() {
    if (this.phase === 'seenAll') this.#show(this.#next());
  }

  /** Count this pair's posters as seen, now it's been voted on or skipped. */
  #count() {
    if (this.progress && this.#shown) this.progress.seen = this.#shown.seen + this.#shown.fresh;
  }

  /**
   * The first pair from `from` in this visitor's order (default: where they're up to), or null
   * once they've been through them all. Pairs with a poster since taken out are skipped. Adding
   * posters reshuffles the order, but they carry on from the same place in it.
   *
   * Until they've been shown every poster, pairs of posters they've already seen are skipped too.
   * The first round shows every poster once, but a poster taken out leaves its partner there
   * without a pair, and that partner's next pair could be dozens of pairs later.
   */
  #next(from?: number): Next | null {
    const collection = this.#source.collection();
    if (!collection) return null;
    const { seed, index } = this.#progress.get(collection);
    const posters = this.#source.posters();
    const order = pairOrder(posters, seed, this.#source.removed());
    const start = from ?? index;
    // The pairs skipped hold only posters already seen, so every pair before `start` counts,
    // shown or skipped, and what they've seen needn't be stored.
    const unseen = new Set(posters.map((p) => p._id));
    for (let at = 0; at < start; at++) order[at]?.forEach((p) => unseen.delete(p._id));
    for (let at = start; at < order.length; at++) {
      const pair = order[at];
      const fresh = pair?.filter((p) => unseen.has(p._id)).length ?? 0;
      if (pair && (fresh || !unseen.size)) return { pair, collection, at, seen: posters.length - unseen.size, fresh };
    }
    return null;
  }

  async #show(next: Next | null) {
    if (!next) {
      this.pair = null;
      this.phase = 'done';
      return;
    }
    this.#showing = true;
    await Promise.all(next.pair.map((p) => preload(posterSrc(p.image))));
    this.#showing = false;

    this.#shown = next;
    this.#holds.clear();
    this.pair = next.pair;
    this.chosen = null;
    this.result = null;
    this.error = false;
    const total = this.#source.posters().length;
    this.progress = next.seen < total ? { seen: next.seen, total } : null;
    this.round++;
    this.phase = 'enter';

    // Preload the following pair while this one is on screen.
    this.#next(next.at + 1)?.pair.forEach((p) => preload(posterSrc(p.image)));

    await wait(ENTER_MS);
    if (this.phase === 'enter') this.phase = 'choose';
  }
}
