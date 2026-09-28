import { internalMutation, query } from './_generated/server';
import { v } from 'convex/values';

export const START_RATING = 1000;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const posters = await ctx.db
      .query('posters')
      .withIndex('by_active', (q) => q.eq('active', true))
      .collect();
    return posters.map(({ _id, title, image }) => ({ _id, title, image }));
  }
});

/**
 * Upsert posters by key and deactivate any not in the list.
 * Called by `pnpm posters:sync`.
 */
export const sync = internalMutation({
  args: {
    posters: v.array(v.object({ key: v.string(), title: v.string(), image: v.string() }))
  },
  handler: async (ctx, { posters }) => {
    const keys = new Set(posters.map((p) => p.key));
    let added = 0;
    let updated = 0;
    let deactivated = 0;

    for (const p of posters) {
      const existing = await ctx.db
        .query('posters')
        .withIndex('by_key', (q) => q.eq('key', p.key))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { title: p.title, image: p.image, active: true });
        updated++;
      } else {
        await ctx.db.insert('posters', {
          ...p,
          active: true,
          rating: START_RATING,
          wins: 0,
          losses: 0
        });
        added++;
      }
    }

    for (const p of await ctx.db.query('posters').collect()) {
      if (p.active && !keys.has(p.key)) {
        await ctx.db.patch(p._id, { active: false });
        deactivated++;
      }
    }

    return { added, updated, deactivated };
  }
});
