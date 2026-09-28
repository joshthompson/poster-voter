import { internalMutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { getActive } from './competitions';

export const START_RATING = 1000;

/** Posters in the active competition. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const competition = await getActive(ctx);
    if (!competition) return [];
    const posters = await ctx.db
      .query('posters')
      .withIndex('by_competition_active', (q) => q.eq('competitionId', competition._id).eq('active', true))
      .collect();
    return posters.map(({ _id, title, image }) => ({ _id, title, image }));
  }
});

/**
 * Make this the active competition (archiving any other), upsert its posters by key,
 * and deactivate any of its posters not in the list.
 * Called by `pnpm posters:sync`.
 */
export const sync = internalMutation({
  args: {
    competition: v.object({ slug: v.string(), title: v.string() }),
    posters: v.array(v.object({ key: v.string(), title: v.string(), image: v.string() }))
  },
  handler: async (ctx, { competition, posters }) => {
    const existingCompetition = await ctx.db
      .query('competitions')
      .withIndex('by_slug', (q) => q.eq('slug', competition.slug))
      .unique();
    const competitionId = existingCompetition?._id ?? (await ctx.db.insert('competitions', { ...competition, active: true }));
    if (existingCompetition) await ctx.db.patch(competitionId, { title: competition.title, active: true });

    const archived: string[] = [];
    for (const c of await ctx.db
      .query('competitions')
      .withIndex('by_active', (q) => q.eq('active', true))
      .collect()) {
      if (c._id === competitionId) continue;
      await ctx.db.patch(c._id, { active: false });
      archived.push(c.title);
    }

    // Posters from before competitions existed belong to the first one synced, votes and all.
    for (const p of await ctx.db
      .query('posters')
      .withIndex('by_competition_key', (q) => q.eq('competitionId', undefined))
      .collect()) {
      await ctx.db.patch(p._id, { competitionId });
    }
    await ctx.scheduler.runAfter(0, internal.votes.backfill, {});

    const keys = new Set(posters.map((p) => p.key));
    let added = 0;
    let updated = 0;
    let deactivated = 0;

    for (const p of posters) {
      const existing = await ctx.db
        .query('posters')
        .withIndex('by_competition_key', (q) => q.eq('competitionId', competitionId).eq('key', p.key))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { title: p.title, image: p.image, active: true });
        updated++;
      } else {
        await ctx.db.insert('posters', {
          ...p,
          competitionId,
          active: true,
          rating: START_RATING,
          wins: 0,
          losses: 0
        });
        added++;
      }
    }

    for (const p of await ctx.db
      .query('posters')
      .withIndex('by_competition_active', (q) => q.eq('competitionId', competitionId).eq('active', true))
      .collect()) {
      if (!keys.has(p.key)) {
        await ctx.db.patch(p._id, { active: false });
        deactivated++;
      }
    }

    return { competition: competition.title, archived, added, updated, deactivated };
  }
});
