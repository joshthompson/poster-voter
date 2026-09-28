import { mutation } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';

const K = 32;

function orderPair(x: Id<'posters'>, y: Id<'posters'>) {
  return x < y ? ([x, y] as const) : ([y, x] as const);
}

/** Record a vote, update Elo ratings, and return how everyone has voted on this pair. */
export const cast = mutation({
  args: {
    winnerId: v.id('posters'),
    loserId: v.id('posters'),
    voterId: v.string()
  },
  handler: async (ctx, { winnerId, loserId, voterId }) => {
    if (winnerId === loserId) throw new ConvexError('A poster cannot beat itself');
    const winner = await ctx.db.get(winnerId);
    const loser = await ctx.db.get(loserId);
    if (!winner || !loser) throw new ConvexError('Poster not found');

    await ctx.db.insert('votes', { winnerId, loserId, voterId: voterId.slice(0, 64) });

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
