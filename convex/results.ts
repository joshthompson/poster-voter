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

/** A city needs this many votes before it gets a local favourite. */
export const LOCAL_MIN_VOTES = 5;
const LOCAL_PICKS = 12;

/** Where a vote came from, as a grouping key and its parts; null when it has no location. */
function placeOf(vote: Doc<'votes'>) {
  if (!vote.country) return null;
  return { key: `${vote.country}|${vote.city ?? ''}`, country: vote.country, city: vote.city ?? null };
}

/**
 * Where the votes came from: vote counts by country, and each busy city's favourite poster
 * (most wins there, then best win rate). Votes without a location are left out.
 */
function geography(votes: Doc<'votes'>[], byId: Map<Id<'posters'>, Doc<'posters'>>) {
  const countries = new Map<string, number>();
  const cities = new Map<
    string,
    { country: string; city: string; votes: number; records: Map<Id<'posters'>, { wins: number; matches: number }> }
  >();
  let located = 0;
  for (const vote of votes) {
    const place = placeOf(vote);
    if (!place) continue;
    located++;
    countries.set(place.country, (countries.get(place.country) ?? 0) + 1);
    if (!place.city) continue;
    const c = cities.get(place.key) ?? { country: place.country, city: place.city, votes: 0, records: new Map() };
    c.votes++;
    for (const [id, won] of [
      [vote.winnerId, true],
      [vote.loserId, false]
    ] as const) {
      const r = c.records.get(id) ?? { wins: 0, matches: 0 };
      r.matches++;
      if (won) r.wins++;
      c.records.set(id, r);
    }
    cities.set(place.key, c);
  }

  const localPicks = [...cities.values()]
    .filter((c) => c.votes >= LOCAL_MIN_VOTES)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, LOCAL_PICKS)
    .flatMap((c) => {
      const best = [...c.records]
        .filter(([id]) => byId.has(id))
        .sort(([, a], [, b]) => b.wins - a.wins || b.wins / b.matches - a.wins / a.matches)[0];
      if (!best || !best[1].wins) return [];
      const p = byId.get(best[0])!;
      return [
        {
          country: c.country,
          city: c.city,
          votes: c.votes,
          poster: { _id: p._id, title: p.title, image: p.image },
          wins: best[1].wins,
          matches: best[1].matches
        }
      ];
    });

  return {
    located,
    countries: [...countries].map(([code, votes]) => ({ code, votes })).sort((a, b) => b.votes - a.votes),
    cities: cities.size,
    localPicks,
    localMinVotes: LOCAL_MIN_VOTES
  };
}

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
      lopsided,
      places: geography(votes, byId)
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

/**
 * One poster's detail: its win rate with designers and with everyone else, and its record
 * against each current poster it has met (in `segment`'s votes), most-met first.
 */
export const poster = query({
  args: { id: v.id('posters'), segment: v.optional(segment), competition: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const loaded = await load(ctx, args.competition);
    if (!loaded) return null;
    const { posters, votes } = loaded;
    const byId = new Map(posters.map((p) => [p._id, p]));
    if (!byId.has(args.id)) return null;
    const seg = args.segment ?? 'all';

    const record = () => ({ wins: 0, losses: 0 });
    const groups = { designers: record(), others: record() };
    const opponents = new Map<Id<'posters'>, { wins: number; losses: number }>();
    const fans = new Map<string, { country: string; city: string | null; wins: number; losses: number }>();
    for (const vote of votes) {
      const won = vote.winnerId === args.id;
      if (!won && vote.loserId !== args.id) continue;
      const group = vote.designer === true ? groups.designers : vote.designer === false ? groups.others : null;
      if (group) group[won ? 'wins' : 'losses']++;

      if (!inSegment(seg, vote)) continue;
      const place = placeOf(vote);
      if (place) {
        const f = fans.get(place.key) ?? { country: place.country, city: place.city, ...record() };
        f[won ? 'wins' : 'losses']++;
        fans.set(place.key, f);
      }
      const other = won ? vote.loserId : vote.winnerId;
      if (!byId.has(other)) continue;
      const r = opponents.get(other) ?? record();
      r[won ? 'wins' : 'losses']++;
      opponents.set(other, r);
    }

    return {
      designers: groups.designers,
      others: groups.others,
      // Where it wins most, best first; places it has only lost in don't count as fans.
      fans: [...fans.values()]
        .filter((f) => f.wins)
        .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
        .slice(0, 3),
      opponents: [...opponents]
        .map(([id, r]) => ({ _id: id, title: byId.get(id)!.title, image: byId.get(id)!.image, ...r }))
        .sort((a, b) => b.wins + b.losses - (a.wins + a.losses) || b.wins - b.losses - (a.wins - a.losses))
    };
  }
});
