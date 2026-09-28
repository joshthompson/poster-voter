import { internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { getActive } from './competitions';

export const K = 32;

export function orderPair(x: Id<'posters'>, y: Id<'posters'>) {
  return x < y ? ([x, y] as const) : ([y, x] as const);
}

/** Every pair this voter has voted on, as "smallerId|largerId" keys. */
export const mine = query({
  args: { voterId: v.string() },
  handler: async (ctx, { voterId }) => {
    const votes = await ctx.db
      .query('votes')
      .withIndex('by_voter', (q) => q.eq('voterId', voterId.slice(0, 64)))
      .collect();
    return [...new Set(votes.map((v) => orderPair(v.winnerId, v.loserId).join('|')))];
  }
});

/** How many votes this voter has cast. */
export const count = query({
  args: { voterId: v.string() },
  handler: async (ctx, { voterId }) => {
    const votes = await ctx.db
      .query('votes')
      .withIndex('by_voter', (q) => q.eq('voterId', voterId.slice(0, 64)))
      .collect();
    return votes.length;
  }
});

/** Record a vote, update Elo ratings, and return how everyone has voted on this pair. */
export const cast = mutation({
  args: {
    winnerId: v.id('posters'),
    loserId: v.id('posters'),
    voterId: v.string(),
    designer: v.optional(v.boolean())
  },
  handler: async (ctx, { winnerId, loserId, voterId, designer }) => {
    if (winnerId === loserId) throw new ConvexError('A poster cannot beat itself');
    const winner = await ctx.db.get(winnerId);
    const loser = await ctx.db.get(loserId);
    if (!winner || !loser) throw new ConvexError('Poster not found');
    const competition = await getActive(ctx);
    if (!competition || winner.competitionId !== competition._id || loser.competitionId !== competition._id) {
      throw new ConvexError('Voting has closed on these posters');
    }

    await ctx.db.insert('votes', {
      competitionId: competition._id,
      winnerId,
      loserId,
      voterId: voterId.slice(0, 64),
      designer
    });

    const expected = 1 / (1 + 10 ** ((loser.rating - winner.rating) / 400));
    const delta = K * (1 - expected);
    await ctx.db.patch(winnerId, { rating: winner.rating + delta, wins: winner.wins + 1 });
    await ctx.db.patch(loserId, { rating: loser.rating - delta, losses: loser.losses + 1 });

    const [aId, bId] = orderPair(winnerId, loserId);
    const pair = await ctx.db
      .query('pairs')
      .withIndex('by_pair', (q) => q.eq('aId', aId).eq('bId', bId))
      .unique();
    const winnerIsA = winnerId === aId;
    let aWins = (pair?.aWins ?? 0) + (winnerIsA ? 1 : 0);
    let bWins = (pair?.bWins ?? 0) + (winnerIsA ? 0 : 1);
    if (pair) await ctx.db.patch(pair._id, { aWins, bWins });
    else await ctx.db.insert('pairs', { aId, bId, aWins, bWins });

    return {
      winnerVotes: winnerIsA ? aWins : bWins,
      loserVotes: winnerIsA ? bWins : aWins,
      ratingDelta: delta
    };
  }
});

const BACKFILL_BATCH = 500;

/** Tag votes from before competitions with their posters' competition, a batch at a time. */
export const backfill = internalMutation({
  args: {},
  handler: async (ctx) => {
    const votes = await ctx.db
      .query('votes')
      .withIndex('by_competition', (q) => q.eq('competitionId', undefined))
      .take(BACKFILL_BATCH);
    let tagged = 0;
    for (const vote of votes) {
      const winner = await ctx.db.get(vote.winnerId);
      if (!winner?.competitionId) continue;
      await ctx.db.patch(vote._id, { competitionId: winner.competitionId });
      tagged++;
    }
    // Stop if nothing could be tagged, so untaggable votes can't loop forever.
    if (votes.length === BACKFILL_BATCH && tagged) await ctx.scheduler.runAfter(0, internal.votes.backfill, {});
  }
});
