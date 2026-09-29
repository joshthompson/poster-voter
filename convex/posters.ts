import { internalMutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { getActive } from './competitions';
import { K, orderPair } from './votes';

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

/**
 * Fold a duplicate poster into the one being kept: its votes move over (votes between the two are
 * dropped, since a poster can't beat itself), pair tallies are rebuilt, every poster's rating is
 * replayed from the votes, and the duplicate is deleted. Run it once with `npx convex run`.
 */
export const merge = internalMutation({
  args: { competition: v.string(), keepKey: v.string(), dropKey: v.string() },
  handler: async (ctx, { competition: slug, keepKey, dropKey }) => {
    const competition = await ctx.db
      .query('competitions')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (!competition) throw new Error(`No competition "${slug}"`);
    const byKey = (key: string) =>
      ctx.db
        .query('posters')
        .withIndex('by_competition_key', (q) => q.eq('competitionId', competition._id).eq('key', key))
        .unique();
    const keep = await byKey(keepKey);
    const drop = await byKey(dropKey);
    if (!keep || !drop) throw new Error(`Missing poster: ${!keep ? keepKey : dropKey}`);

    const votes = await ctx.db
      .query('votes')
      .withIndex('by_competition', (q) => q.eq('competitionId', competition._id))
      .collect();
    const posterIds = new Set(
      (
        await ctx.db
          .query('posters')
          .withIndex('by_competition_key', (q) => q.eq('competitionId', competition._id))
          .collect()
      ).map((p) => p._id)
    );

    // Pair rows touching the duplicate are rebuilt from the votes below.
    const touched = new Set<Id<'posters'>>([keep._id, drop._id]);
    for (const p of await ctx.db.query('pairs').collect()) {
      if (touched.has(p.aId) || touched.has(p.bId)) await ctx.db.delete(p._id);
    }

    let moved = 0;
    let dropped = 0;
    const replay: { winnerId: Id<'posters'>; loserId: Id<'posters'> }[] = [];
    for (const vote of votes) {
      const winnerId = vote.winnerId === drop._id ? keep._id : vote.winnerId;
      const loserId = vote.loserId === drop._id ? keep._id : vote.loserId;
      if (winnerId === loserId) {
        await ctx.db.delete(vote._id);
        dropped++;
        continue;
      }
      if (winnerId !== vote.winnerId || loserId !== vote.loserId) {
        await ctx.db.patch(vote._id, { winnerId, loserId });
        moved++;
      }
      replay.push({ winnerId, loserId });
    }

    // Same Elo replay as `votes.cast`, so the stored ratings match a fresh count.
    const scores = new Map<Id<'posters'>, { rating: number; wins: number; losses: number }>();
    const score = (id: Id<'posters'>) => {
      let s = scores.get(id);
      if (!s) scores.set(id, (s = { rating: START_RATING, wins: 0, losses: 0 }));
      return s;
    };
    const keptPairs = new Map<string, { aId: Id<'posters'>; bId: Id<'posters'>; aWins: number; bWins: number }>();
    for (const { winnerId, loserId } of replay) {
      const w = score(winnerId);
      const l = score(loserId);
      const delta = K * (1 - 1 / (1 + 10 ** ((l.rating - w.rating) / 400)));
      w.rating += delta;
      w.wins++;
      l.rating -= delta;
      l.losses++;
      if (winnerId !== keep._id && loserId !== keep._id) continue;
      const [aId, bId] = orderPair(winnerId, loserId);
      const key = `${aId}|${bId}`;
      const pair = keptPairs.get(key) ?? { aId, bId, aWins: 0, bWins: 0 };
      if (winnerId === aId) pair.aWins++;
      else pair.bWins++;
      keptPairs.set(key, pair);
    }
    for (const pair of keptPairs.values()) await ctx.db.insert('pairs', pair);
    for (const id of posterIds) {
      if (id !== drop._id) await ctx.db.patch(id, score(id));
    }
    await ctx.db.delete(drop._id);

    return { kept: keep.title, removed: drop.title, votesMoved: moved, votesDropped: dropped, pairs: keptPairs.size };
  }
});
