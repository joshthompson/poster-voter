import { query, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { find } from './competitions';
import { START_RATING } from './posters';
import { K, orderPair } from './votes';

/** Whose votes to count. Votes from before we asked about designers only count towards 'all'. */
const segment = v.union(v.literal('all'), v.literal('designers'), v.literal('others'));
type Segment = 'all' | 'designers' | 'others';

const inSegment = (s: Segment, vote: Doc<'votes'>) =>
  s === 'all' || (s === 'designers' ? vote.designer === true : vote.designer === false);

/** Replay votes in order through the same Elo update as `votes.cast`, plus per-pair tallies. */
function tally(votes: Doc<'votes'>[]) {
  const scores = new Map<Id<'posters'>, { rating: number; wins: number; losses: number }>();
  const pairs = new Map<string, { aId: Id<'posters'>; bId: Id<'posters'>; aWins: number; bWins: number }>();
  const score = (id: Id<'posters'>) => {
    let s = scores.get(id);
    if (!s) scores.set(id, (s = { rating: START_RATING, wins: 0, losses: 0 }));
    return s;
  };

  for (const vote of votes) {
    const w = score(vote.winnerId);
    const l = score(vote.loserId);
    const delta = K * (1 - 1 / (1 + 10 ** ((l.rating - w.rating) / 400)));
    w.rating += delta;
    w.wins++;
    l.rating -= delta;
    l.losses++;

    const [aId, bId] = orderPair(vote.winnerId, vote.loserId);
    const key = `${aId}|${bId}`;
    const pair = pairs.get(key) ?? { aId, bId, aWins: 0, bWins: 0 };
    if (vote.winnerId === aId) pair.aWins++;
    else pair.bWins++;
    pairs.set(key, pair);
  }
  return { score, pairs: [...pairs.values()] };
}

/** Active posters ranked by a tally, best first. */
function rank(posters: Doc<'posters'>[], score: ReturnType<typeof tally>['score']) {
  return posters
    .map((p) => {
      const s = score(p._id);
      const matches = s.wins + s.losses;
      return {
        _id: p._id,
        title: p.title,
        image: p.image,
        rating: Math.round(s.rating),
        wins: s.wins,
        losses: s.losses,
        matches,
        winRate: matches ? s.wins / matches : 0
      };
    })
    .sort((a, b) => b.rating - a.rating)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

/** A competition (by slug, or the active one) with its current posters and all its votes; null if there's none. */
async function load(ctx: QueryCtx, slug?: string) {
  const competition = await find(ctx, slug);
  if (!competition) return null;
  const posters = await ctx.db
    .query('posters')
    .withIndex('by_competition_active', (q) => q.eq('competitionId', competition._id).eq('active', true))
    .collect();
  const votes = await ctx.db
    .query('votes')
    .withIndex('by_competition', (q) => q.eq('competitionId', competition._id))
    .collect();
  const { title, active } = competition;
  return { competition: { slug: competition.slug, title, active }, posters, votes };
}

export const overview = query({
  args: { segment: v.optional(segment), competition: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const loaded = await load(ctx, args.competition);
    if (!loaded) return null;
    const { competition, posters } = loaded;
    const seg = args.segment ?? 'all';
    const byId = new Map(posters.map((p) => [p._id, p]));
    const votes = loaded.votes.filter((vote) => inSegment(seg, vote));
    const { score, pairs: allPairs } = tally(votes);
    const pairs = allPairs.filter((p) => byId.has(p.aId) && byId.has(p.bId));

    const voters = new Set(votes.map((v) => v.voterId)).size;
    const now = Date.now();
    const lastDay = votes.filter((v) => now - v._creationTime < 86_400_000).length;

    const summarise = (p: (typeof pairs)[number]) => {
      const total = p.aWins + p.bWins;
      return {
        a: { _id: p.aId, title: byId.get(p.aId)!.title, image: byId.get(p.aId)!.image, votes: p.aWins },
        b: { _id: p.bId, title: byId.get(p.bId)!.title, image: byId.get(p.bId)!.image, votes: p.bWins },
        total,
        split: total ? Math.abs(p.aWins - p.bWins) / total : 0
      };
    };

    const contested = pairs.filter((p) => p.aWins + p.bWins >= 2).map(summarise);
    const closest = [...contested].sort((x, y) => x.split - y.split || y.total - x.total)[0] ?? null;
    const lopsided = [...contested].sort((x, y) => y.split - x.split || y.total - x.total)[0] ?? null;

    return {
      competition,
      posters: rank(posters, score),
      stats: {
        totalVotes: votes.length,
        voters,
        lastDay,
        posterCount: posters.length,
        pairsSeen: pairs.length,
        possiblePairs: (posters.length * (posters.length - 1)) / 2
      },
      closest,
      lopsided
    };
  }
});

/** Each poster needs this many designer and non-designer matches to be compared. */
export const MIN_MATCHES = 3;

/** Posters designers and non-designers disagree on most, by the gap between their win rates. */
export const disagreements = query({
  args: { competition: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const loaded = await load(ctx, args.competition);
    if (!loaded) return null;
    const { competition, posters, votes } = loaded;
    const designerVotes = votes.filter((vote) => inSegment('designers', vote));
    const otherVotes = votes.filter((vote) => inSegment('others', vote));
    const designers = new Map(rank(posters, tally(designerVotes).score).map((p) => [p._id, p]));
    const others = new Map(rank(posters, tally(otherVotes).score).map((p) => [p._id, p]));

    const posterGaps = posters
      .map((p) => {
        const d = designers.get(p._id)!;
        const o = others.get(p._id)!;
        return {
          _id: p._id,
          title: p.title,
          image: p.image,
          designers: { rank: d.rank, winRate: d.winRate, matches: d.matches },
          others: { rank: o.rank, winRate: o.winRate, matches: o.matches },
          // Positive: designers like it more.
          gap: d.winRate - o.winRate
        };
      })
      .filter((p) => p.designers.matches >= MIN_MATCHES && p.others.matches >= MIN_MATCHES)
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

    return {
      competition,
      posters: posterGaps,
      designerVotes: designerVotes.length,
      otherVotes: otherVotes.length,
      minMatches: MIN_MATCHES
    };
  }
});
