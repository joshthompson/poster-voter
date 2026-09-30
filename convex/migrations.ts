import { internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { requestRun, startRebuild } from './tally';

// One-off maintenance, run by hand: npx convex run migrations:<name> '<args>' (add --prod for production).

const BATCH = 1000;

/**
 * Tally every competition from scratch (the rankings keep showing the old snapshot until it's
 * done). `competition` limits it to one slug. Not needed after a normal deploy: the first vote
 * or the hourly check starts the tally of the active competition by itself.
 */
export const rebuild = internalMutation({
  args: { competition: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const competitions = await ctx.db.query('competitions').collect();
    const chosen = competitions.filter((c) => !args.competition || c.slug === args.competition);
    if (!chosen.length) throw new Error(`No competition "${args.competition}"`);
    for (const c of chosen) await startRebuild(ctx, c._id);
    return chosen.map((c) => c.title);
  }
});

/**
 * Remove data from before the tally: scores stored on posters and the old `pairs` table.
 * Runs itself in batches until done. Afterwards those fields and the table can leave the schema.
 */
export const cleanupLegacy = internalMutation({
  args: {},
  handler: async (ctx) => {
    let cleared = 0;
    for (const p of await ctx.db.query('posters').collect()) {
      if (p.rating === undefined && p.wins === undefined && p.losses === undefined) continue;
      await ctx.db.patch(p._id, { rating: undefined, wins: undefined, losses: undefined });
      cleared++;
    }
    const pairs = await ctx.db.query('pairs').take(BATCH);
    for (const pair of pairs) await ctx.db.delete(pair._id);
    if (pairs.length === BATCH) await ctx.scheduler.runAfter(0, internal.migrations.cleanupLegacy, {});
    return { postersCleared: cleared, pairsDeleted: pairs.length, done: pairs.length < BATCH };
  }
});

/** Start the tally for every competition that doesn't have one yet (e.g. archived ones). */
export const tallyAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const started = [];
    for (const c of await ctx.db.query('competitions').collect()) {
      const progress = await ctx.db
        .query('progress')
        .withIndex('by_competition', (q) => q.eq('competitionId', c._id))
        .unique();
      if (progress) continue;
      await requestRun(ctx, c._id, { progress, now: true });
      started.push(c.title);
    }
    return started;
  }
});
