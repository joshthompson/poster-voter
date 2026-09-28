import { query, type QueryCtx } from './_generated/server';

/** The competition being voted on, or null before the first sync. */
export const getActive = (ctx: QueryCtx) =>
  ctx.db
    .query('competitions')
    .withIndex('by_active', (q) => q.eq('active', true))
    .first();

/** A competition by slug, or the active one when there's no slug. */
export const find = (ctx: QueryCtx, slug?: string) =>
  slug
    ? ctx.db
        .query('competitions')
        .withIndex('by_slug', (q) => q.eq('slug', slug))
        .unique()
    : getActive(ctx);

/** Past competitions, newest first. */
export const archived = query({
  args: {},
  handler: async (ctx) => {
    const past = await ctx.db
      .query('competitions')
      .withIndex('by_active', (q) => q.eq('active', false))
      .order('desc')
      .collect();
    return past.map(({ slug, title }) => ({ slug, title }));
  }
});
