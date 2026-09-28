import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // One is active (being voted on); the rest are archives.
  competitions: defineTable({
    // Stable key from posters/competition.json, also used in results URLs.
    slug: v.string(),
    title: v.string(),
    active: v.boolean()
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
    rating: v.number(),
    wins: v.number(),
    losses: v.number()
  })
    .index('by_competition_key', ['competitionId', 'key'])
    .index('by_competition_active', ['competitionId', 'active']),

  votes: defineTable({
    // Missing on votes from before competitions; backfilled by `votes.backfill`.
    competitionId: v.optional(v.id('competitions')),
    winnerId: v.id('posters'),
    loserId: v.id('posters'),
    voterId: v.string(),
    // Whether the voter said they're a designer. Missing on votes from before we asked.
    designer: v.optional(v.boolean())
  })
    .index('by_voter', ['voterId'])
    .index('by_competition', ['competitionId']),

  // One row per unordered poster pair; aId < bId.
  pairs: defineTable({
    aId: v.id('posters'),
    bId: v.id('posters'),
    aWins: v.number(),
    bWins: v.number()
  }).index('by_pair', ['aId', 'bId'])
});
