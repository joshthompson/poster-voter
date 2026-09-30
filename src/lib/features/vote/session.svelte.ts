import { posterSrc, preload } from '$lib/utils/images';
import { nextPair, pairKey } from './pairing';
import { createSeen } from './seen';
import type { Phase, Poster, VoteResult } from './types';

// One visitor's run through the pairs: which pair is up, and the enter → choose → reveal → exit
// cycle around each vote. Knows nothing about Convex; the page passes in its data and a way to vote.

const ENTER_MS = 1100;
const REVEAL_MS = 3000;
const EXIT_MS = 700;

type Source = {
  /** The competition's posters (reactive). */
  posters: () => Poster[];
  /** Pairs this voter has already voted on, as pair keys (reactive). */
  votedKeys: () => Set<string>;
  /** Record a vote; resolves to both posters' vote counts on this pair. */
  cast: (winner: Poster, loser: Poster) => Promise<{ winnerVotes: number; loserVotes: number }>;
};

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
  #seen = createSeen();
  #justVoted = new Set<string>(); // votes this visit; `votedKeys` is fetched once, before them
  #shownPairs = new Set<string>();
  #upcoming: Poster[] | null = null;
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

  /** Every pair of the current posters, for the "you've voted on them all" message. */
  get totalPairs() {
    const n = this.#source.posters().length;
    return (n * (n - 1)) / 2;
  }

  /** Show the first pair once there are posters; also picks up again from `done` when new ones arrive. */
  refresh() {
    const list = this.#source.posters();
    if (this.pair || this.#showing || list.length < 2) return;
    if (this.phase === 'loading') this.#show(this.#pick(list));
    else if (this.phase === 'done') {
      const next = this.#pick(list);
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
      this.#justVoted.add(pairKey(pair));
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
    await wait(EXIT_MS);
    // The upcoming pair was chosen before this vote; re-pick if posters changed or it's now voted.
    const list = this.#source.posters();
    const ids = new Set(list.map((p) => p._id));
    const up = this.#upcoming;
    const stillGood = up && up.every((p) => ids.has(p._id)) && !this.#hasVoted(pairKey(up));
    await this.#show(stillGood ? up : this.#pick(list, this.pair ? pairKey(this.pair) : undefined));
  }

  #hasVoted(key: string) {
    return this.#justVoted.has(key) || this.#source.votedKeys().has(key);
  }

  /** The next pair to show, or null once every pair has been voted on. `avoid` is the pair on screen. */
  #pick(from: Poster[], avoid?: string) {
    const votedPosters = new Set([...this.#source.votedKeys()].flatMap((k) => k.split('|')));
    return nextPair(from, {
      hasSeen: (id) => this.#seen.has(id) || votedPosters.has(id),
      hasVoted: (key) => this.#hasVoted(key),
      wasShown: (key) => this.#shownPairs.has(key),
      avoid
    });
  }

  async #show(next: Poster[] | null) {
    if (!next) {
      this.pair = null;
      this.phase = 'done';
      return;
    }
    this.#showing = true;
    await Promise.all(next.map((p) => preload(posterSrc(p.image))));
    this.#seen.add(next.map((p) => p._id));
    this.#shownPairs.add(pairKey(next));
    this.#showing = false;

    this.pair = next;
    this.chosen = null;
    this.result = null;
    this.error = false;
    this.round++;
    this.phase = 'enter';

    // Queue up (and preload) the following pair while this one is on screen.
    this.#upcoming = this.#pick(this.#source.posters(), pairKey(next));
    this.#upcoming?.forEach((p) => preload(posterSrc(p.image)));

    await wait(ENTER_MS);
    if (this.phase === 'enter') this.phase = 'choose';
  }
}
