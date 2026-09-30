import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Whose votes a tally counts: everyone, or only the voters who said they are (or aren't) designers.
export const segment = v.union(v.literal('all'), v.literal('designers'), v.literal('others'));

const score = v.object({ rating: v.number(), wins: v.number(), losses: v.number() });
// Running totals for one segment: votes, distinct voters, poster pairs met, votes with a location,
// and distinct cities.
const segmentCounts = v.object({
  votes: v.number(),
  voters: v.number(),
  pairs: v.number(),
  located: v.number(),
  cities: v.number()
});
const duel = v.union(
  v.null(),
  v.object({ aId: v.id('posters'), bId: v.id('posters'), aWins: v.number(), bWins: v.number() })
);

export default defineSchema({
  // One is active (being voted on); the rest are archives.
  competitions: defineTable({
    // Stable key from posters/competition.json, also used in results URLs.
    slug: v.string(),
    title: v.string(),
    active: v.boolean(),
    // When its poster list last changed, so pages can keep their copy until it does (see posters.list).
    postersUpdatedAt: v.optional(v.number()),
    // Posters taken out of it. Their pairs keep their places in each visitor's order and are
    // skipped, so taking a poster out doesn't reshuffle anyone's order (see pairing.ts).
    removed: v.optional(v.array(v.id('posters')))
  })
    .index('by_slug', ['slug'])
    .index('by_active', ['active']),

  posters: defineTable({
    // Missing on posters from before competitions; the first sync adopts them.
    competitionId: v.optional(v.id('competitions')),
    // Stable key (the image filename) so re-syncing updates rather than duplicates.
    key: v.string(),
    title: v.string(),
    // Path relative to the site base (e.g. "posters/<slug>/foo.jpg") or an absolute URL.
    image: v.string(),
    // Whether it's still in the competition; removed posters keep their votes.
    active: v.boolean(),
    // Legacy: scores now live in `standings`. Cleared by `migrations.cleanupLegacy`; remove after.
    rating: v.optional(v.number()),
    wins: v.optional(v.number()),
    losses: v.optional(v.number())
  })
    .index('by_competition_key', ['competitionId', 'key'])
    .index('by_competition_active', ['competitionId', 'active']),

  // The raw record. Everything the results show is tallied from these by `tally.run`.
  votes: defineTable({
    // Missing on votes from before competitions; backfilled by `votes.backfill`.
    competitionId: v.optional(v.id('competitions')),
    winnerId: v.id('posters'),
    loserId: v.id('posters'),
    voterId: v.string(),
    // Whether the voter said they're a designer. Missing on votes from before we asked.
    designer: v.optional(v.boolean()),
    // Roughly where the voter was, looked up from their IP in the browser (the IP isn't kept).
    // ISO 3166 two-letter code, e.g. "SE". Missing on older votes or when the lookup failed.
    country: v.optional(v.string()),
    city: v.optional(v.string())
  })
    .index('by_voter', ['voterId'])
    .index('by_competition', ['competitionId'])
    // A pair's votes that the tally hasn't reached yet, for the instant result after voting.
    .index('by_matchup', ['winnerId', 'loserId']),

  // Legacy per-pair tallies, replaced by `matchups`. Emptied by `migrations.cleanupLegacy`; remove after.
  pairs: defineTable({
    aId: v.id('posters'),
    bId: v.id('posters'),
    aWins: v.number(),
    bWins: v.number()
  }).index('by_pair', ['aId', 'bId']),

  // --- Tallies, written only by `tally.run` (except `live`, which `votes.cast` bumps). ---

  // Per competition: how far the tally has got, when it next runs, and its running counts.
  progress: defineTable({
    competitionId: v.id('competitions'),
    // _creationTime of the last vote tallied; 0 before the first.
    cursor: v.number(),
    // A run is scheduled for `scheduledFor`, so casts needn't schedule another.
    pending: v.boolean(),
    scheduledFor: v.number(),
    lastRunAt: v.number(),
    // A rebuild is deleting the old tallies; `cursor` restarts from 0 once it's done.
    clearing: v.boolean(),
    // Rebuild every segment's snapshot on the next run (e.g. posters changed).
    stale: v.boolean(),
    counts: v.object({ all: segmentCounts, designers: segmentCounts, others: segmentCounts }),
    // Each segment's snapshot, so a run can replace it without reading it first.
    snapshots: v.optional(
      v.object({
        all: v.optional(v.id('snapshots')),
        designers: v.optional(v.id('snapshots')),
        others: v.optional(v.id('snapshots'))
      })
    )
  }).index('by_competition', ['competitionId']),

  // Per competition: votes cast, bumped by every cast and corrected by each tally run. Tiny, so
  // the rankings page can tick live without refetching the rankings.
  live: defineTable({
    competitionId: v.id('competitions'),
    all: v.number(),
    designers: v.number(),
    others: v.number()
  }).index('by_competition', ['competitionId']),

  // Per poster: its Elo rating and record with each group of voters.
  standings: defineTable({
    competitionId: v.id('competitions'),
    posterId: v.id('posters'),
    // Mirrors the poster's `active`, so the tally can skip removed posters without reading them.
    active: v.boolean(),
    all: score,
    designers: score,
    others: score
  })
    .index('by_poster', ['posterId'])
    .index('by_competition', ['competitionId']),

  // Per segment and unordered poster pair (aId < bId): how their head-to-heads went.
  // `closeKey` / `lopKey` order contested pairs (2+ votes) for the closest and most lopsided.
  matchups: defineTable({
    competitionId: v.id('competitions'),
    segment,
    aId: v.id('posters'),
    bId: v.id('posters'),
    aWins: v.number(),
    bWins: v.number(),
    contested: v.boolean(),
    // Smallest split first, then most votes: split * 1e6 - total.
    closeKey: v.number(),
    // Largest split first, then most votes (read descending): split * 1e6 + total.
    lopKey: v.number()
  })
    .index('by_pair', ['segment', 'aId', 'bId'])
    .index('by_a', ['segment', 'aId'])
    .index('by_b', ['segment', 'bId'])
    .index('by_close', ['competitionId', 'segment', 'contested', 'closeKey'])
    .index('by_lopsided', ['competitionId', 'segment', 'contested', 'lopKey']),

  // Per competition and voter: how many votes, and whether any came as a designer / non-designer.
  voters: defineTable({
    competitionId: v.id('competitions'),
    voterId: v.string(),
    votes: v.number(),
    designers: v.boolean(),
    others: v.boolean()
  }).index('by_competition_voter', ['competitionId', 'voterId']),

  // Votes per segment and country.
  countries: defineTable({
    competitionId: v.id('competitions'),
    segment,
    code: v.string(),
    votes: v.number()
  }).index('by_code', ['competitionId', 'segment', 'code']),

  // Votes per segment and city, and the city's favourite poster (most wins there, then fewest
  // matches), kept up to date by the tally so snapshots needn't look it up. null: no wins yet;
  // missing: not known (made before favourites were kept), so the next snapshot works it out.
  cities: defineTable({
    competitionId: v.id('competitions'),
    segment,
    country: v.string(),
    city: v.string(),
    votes: v.number(),
    best: v.optional(v.union(v.null(), v.object({ posterId: v.id('posters'), wins: v.number(), matches: v.number() })))
  })
    .index('by_city', ['competitionId', 'segment', 'country', 'city'])
    .index('by_votes', ['competitionId', 'segment', 'votes']),

  // Per segment, city and poster: its record there, for local favourites and biggest fans.
  cityPosters: defineTable({
    competitionId: v.id('competitions'),
    segment,
    country: v.string(),
    city: v.string(),
    posterId: v.id('posters'),
    wins: v.number(),
    matches: v.number()
  })
    .index('by_city_poster', ['competitionId', 'segment', 'country', 'city', 'posterId'])
    .index('by_city_wins', ['competitionId', 'segment', 'country', 'city', 'wins'])
    .index('by_poster_wins', ['posterId', 'segment', 'wins']),

  // Votes per competition and hour (ms since epoch / HOUR_MS), for "votes today".
  hours: defineTable({
    competitionId: v.id('competitions'),
    hour: v.number(),
    all: v.number(),
    designers: v.number(),
    others: v.number()
  }).index('by_hour', ['competitionId', 'hour']),

  // What the rankings page shows for a segment, rebuilt by each tally run that changed it.
  // Posters are referred to by id; the page joins titles and images from `results.posters`.
  snapshots: defineTable({
    competitionId: v.id('competitions'),
    segment,
    builtAt: v.number(),
    // Votes tallied into this snapshot.
    votes: v.number(),
    voters: v.number(),
    pairsSeen: v.number(),
    // Votes per hour (see `hours`) over the last 25 hours, so the page can count the votes since
    // midnight where the viewer is. Missing on snapshots built before it was kept.
    recent: v.optional(v.array(v.object({ hour: v.number(), votes: v.number() }))),
    // Legacy: votes in the 24 hours before `builtAt`, replaced by `recent`. Dropped as each
    // snapshot is rebuilt; remove once they all have been.
    lastDay: v.optional(v.number()),
    // Posters with at least one match. Rating rounded; posters missing here are unrated.
    scores: v.array(v.object({ id: v.id('posters'), rating: v.number(), wins: v.number(), losses: v.number() })),
    closest: duel,
    lopsided: duel,
    places: v.object({
      located: v.number(),
      cities: v.number(),
      countries: v.array(v.object({ code: v.string(), votes: v.number() })),
      localPicks: v.array(
        v.object({
          country: v.string(),
          city: v.string(),
          votes: v.number(),
          posterId: v.id('posters'),
          wins: v.number(),
          matches: v.number()
        })
      ),
      localMinVotes: v.number()
    })
  }).index('by_segment', ['competitionId', 'segment'])
});
