import { internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { ConvexError, v } from 'convex/values';
import { getActive } from './competitions';
import { orderPair } from './shared';
import { getProgress, requestRun, startRebuild } from './tally';

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

/**
 * Record a vote and return how everyone has voted on this pair. Scores and the rest of the
 * rankings are tallied from the votes in the background (see tally.ts), so this stays small.
 */
export const cast = mutation({
  args: {
    winnerId: v.id('posters'),
    loserId: v.id('posters'),
    voterId: v.string(),
    designer: v.optional(v.boolean()),
    country: v.optional(v.string()),
    city: v.optional(v.string())
  },
  handler: async (ctx, { winnerId, loserId, voterId, designer, country, city }) => {
    if (winnerId === loserId) throw new ConvexError('A poster cannot beat itself');
    const winner = await ctx.db.get(winnerId);
    const loser = await ctx.db.get(loserId);
    if (!winner || !loser) throw new ConvexError('Poster not found');
    const competition = await getActive(ctx);
    if (!competition || winner.competitionId !== competition._id || loser.competitionId !== competition._id) {
      throw new ConvexError('Voting has closed on these posters');
    }

    // This pair's votes so far: what the tally has counted, plus the votes it hasn't reached yet.
    // While a rebuild is clearing the old tally, count them all from the votes instead.
    const progress = await getProgress(ctx, competition._id);
    const counted = progress && !progress.clearing;
    const cursor = counted ? progress.cursor : 0;
    const [aId, bId] = orderPair(winnerId, loserId);
    const tallied = counted
      ? await ctx.db
          .query('matchups')
          .withIndex('by_pair', (q) => q.eq('segment', 'all').eq('aId', aId).eq('bId', bId))
          .unique()
      : null;
    const untallied = (w: typeof winnerId, l: typeof loserId) =>
      ctx.db
        .query('votes')
        .withIndex('by_matchup', (q) => q.eq('winnerId', w).eq('loserId', l).gt('_creationTime', cursor))
        .collect();
    const winnerIsA = winnerId === aId;
    const winnerVotes =
      (tallied ? (winnerIsA ? tallied.aWins : tallied.bWins) : 0) + (await untallied(winnerId, loserId)).length + 1;
    const loserVotes = (tallied ? (winnerIsA ? tallied.bWins : tallied.aWins) : 0) + (await untallied(loserId, winnerId)).length;

    await ctx.db.insert('votes', {
      competitionId: competition._id,
      winnerId,
      loserId,
      voterId: voterId.slice(0, 64),
      designer,
      country: country?.slice(0, 2).toUpperCase() || undefined,
      city: city?.slice(0, 80) || undefined
    });

    // Tick the live counts the rankings page shows between tally runs.
    const live = await ctx.db
      .query('live')
      .withIndex('by_competition', (q) => q.eq('competitionId', competition._id))
      .unique();
    const add = { all: 1, designers: designer === true ? 1 : 0, others: designer === false ? 1 : 0 };
    if (live) {
      await ctx.db.patch(live._id, {
        all: live.all + add.all,
        designers: live.designers + add.designers,
        others: live.others + add.others
      });
    } else {
      await ctx.db.insert('live', { competitionId: competition._id, ...add });
    }

    await requestRun(ctx, competition._id, { progress });
    return { winnerVotes, loserVotes };
  }
});

const BACKFILL_BATCH = 500;

/**
 * Tag votes from before competitions with their posters' competition, a batch at a time. Those
 * votes are older than anything the tally has reached, so each competition that gained some is
 * re-tallied at the end.
 */
export const backfill = internalMutation({
  args: { tagged: v.optional(v.array(v.id('competitions'))) },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query('votes')
      .withIndex('by_competition', (q) => q.eq('competitionId', undefined))
      .take(BACKFILL_BATCH);
    const tagged = new Set(args.tagged ?? []);
    let taggedNow = 0;
    for (const vote of votes) {
      const winner = await ctx.db.get(vote.winnerId);
      if (!winner?.competitionId) continue;
      await ctx.db.patch(vote._id, { competitionId: winner.competitionId });
      tagged.add(winner.competitionId);
      taggedNow++;
    }
    // Stop if nothing could be tagged, so untaggable votes can't loop forever.
    if (votes.length === BACKFILL_BATCH && taggedNow) {
      await ctx.scheduler.runAfter(0, internal.votes.backfill, { tagged: [...tagged] });
    } else {
      for (const competitionId of tagged) await startRebuild(ctx, competitionId);
    }
  }
});
