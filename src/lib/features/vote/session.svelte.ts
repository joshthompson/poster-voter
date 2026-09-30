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

/** A pair to show, and where it is in the visitor's order for its collection. */
type Next = { pair: Poster[]; collection: string; at: number };

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

  #source: Source;
  #progress = createProgress();
  #shown: Next | null = null;
  #revealTimer: ReturnType<typeof setTimeout> | undefined;
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
    this.#revealTimer = setTimeout(() => this.advance(), REVEAL_MS);
  }

  skip() {
    if (this.phase === 'choose') this.advance();
  }

  async advance() {
    clearTimeout(this.#revealTimer);
    this.phase = 'exit';
    // Voted or skipped, this pair is done with: carry on after it, this visit or the next.
    if (this.#shown) this.#progress.set(this.#shown.collection, this.#shown.at + 1);
    await wait(EXIT_MS);
    await this.#show(this.#next());
  }

  /**
   * The first pair from `from` in this visitor's order (default: where they're up to), or null
   * once they've been through them all. Pairs with a poster since taken out are skipped. Adding
   * posters reshuffles the order, but they carry on from the same place in it.
   */
  #next(from?: number): Next | null {
    const collection = this.#source.collection();
    if (!collection) return null;
    const { seed, index } = this.#progress.get(collection);
    const order = pairOrder(this.#source.posters(), seed, this.#source.removed());
    for (let at = from ?? index; at < order.length; at++) {
      const pair = order[at];
      if (pair) return { pair, collection, at };
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
    this.pair = next.pair;
    this.chosen = null;
    this.result = null;
    this.error = false;
    this.round++;
    this.phase = 'enter';

    // Preload the following pair while this one is on screen.
    this.#next(next.at + 1)?.pair.forEach((p) => preload(posterSrc(p.image)));

    await wait(ENTER_MS);
    if (this.phase === 'enter') this.phase = 'choose';
  }
}
