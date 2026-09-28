import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  posters: defineTable({
    // Stable key (the image filename) so re-syncing updates rather than duplicates.
    key: v.string(),
    title: v.string(),
    // Path relative to the site base (e.g. "posters/foo.jpg") or an absolute URL.
    image: v.string(),
    active: v.boolean(),
    rating: v.number(),
    wins: v.number(),
    losses: v.number()
  })
    .index('by_key', ['key'])
    .index('by_active', ['active']),

  votes: defineTable({
    winnerId: v.id('posters'),
    loserId: v.id('posters'),
    voterId: v.string()
  }).index('by_voter', ['voterId']),

  // One row per unordered poster pair; aId < bId.
  pairs: defineTable({
    aId: v.id('posters'),
    bId: v.id('posters'),
    aWins: v.number(),
    bWins: v.number()
  }).index('by_pair', ['aId', 'bId'])
});
