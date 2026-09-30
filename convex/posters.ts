import { internalMutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { find } from './competitions';
import { requestRun, startRebuild } from './tally';

/** Identifies a competition's poster list as it is now; it changes whenever the list does. */
export const posterVersion = (c: Doc<'competitions'>) => `${c._id}:${c.postersUpdatedAt ?? 0}`;

/**
 * A competition's current posters (by slug, or the active one), with the `version` of the list.
 * Pages keep the list and pass its version as `since`: if it's still current, `posters` is null
 * and nothing else is read, so a returning visitor is sent a few bytes instead of the list.
 */
export const list = query({
  args: { competition: v.optional(v.string()), since: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const competition = await find(ctx, args.competition);
    if (!competition) return { version: '', posters: [] };
    const version = posterVersion(competition);
    if (args.since === version) return { version, posters: null };
    const posters = await ctx.db
      .query('posters')
      .withIndex('by_competition_active', (q) => q.eq('competitionId', competition._id).eq('active', true))
      .collect();
    return { version, posters: posters.map(({ _id, title, image }) => ({ _id, title, image })) };
  }
});

/**
 * Make this the active competition (archiving any other), upsert its posters by key,
 * and deactivate any of its posters not in the list. Only what differs is written, and the
 * competition's poster version moves on only if the list changed, so pages keep their copy.
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
    const competitionId =
      existingCompetition?._id ??
      (await ctx.db.insert('competitions', { ...competition, active: true, postersUpdatedAt: Date.now() }));
    if (existingCompetition && (existingCompetition.title !== competition.title || !existingCompetition.active)) {
      await ctx.db.patch(competitionId, { title: competition.title, active: true });
    }

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
    const adopted = await ctx.db
      .query('posters')
      .withIndex('by_competition_key', (q) => q.eq('competitionId', undefined))
      .collect();
    for (const p of adopted) await ctx.db.patch(p._id, { competitionId });
    if (adopted.length) await ctx.scheduler.runAfter(0, internal.votes.backfill, {});

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
        if (existing.title === p.title && existing.image === p.image && existing.active) continue;
        await ctx.db.patch(existing._id, { title: p.title, image: p.image, active: true });
        updated++;
      } else {
        await ctx.db.insert('posters', { ...p, competitionId, active: true });
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

    const changed = adopted.length + added + updated + deactivated > 0;
    if (!changed) return { competition: competition.title, archived, added, updated, deactivated };
    if (existingCompetition) await ctx.db.patch(competitionId, { postersUpdatedAt: Date.now() });

    // Standings mirror whether their poster is active, and the snapshots need rebuilding to match.
    for (const p of await ctx.db
      .query('posters')
      .withIndex('by_competition_key', (q) => q.eq('competitionId', competitionId))
      .collect()) {
      const standing = await ctx.db
        .query('standings')
        .withIndex('by_poster', (q) => q.eq('posterId', p._id))
        .unique();
      if (standing && standing.active !== p.active) await ctx.db.patch(standing._id, { active: p.active });
    }
    await requestRun(ctx, competitionId, { now: true, stale: true });

    return { competition: competition.title, archived, added, updated, deactivated };
  }
});

/**
 * Fold a duplicate poster into the one being kept: its votes move over (votes between the two are
 * dropped, since a poster can't beat itself), the duplicate is deleted, and the competition is
 * re-tallied from its votes. Run it once with `npx convex run`.
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

    let moved = 0;
    let dropped = 0;
    for (const vote of await ctx.db
      .query('votes')
      .withIndex('by_competition', (q) => q.eq('competitionId', competition._id))
      .collect()) {
      const winnerId = vote.winnerId === drop._id ? keep._id : vote.winnerId;
      const loserId = vote.loserId === drop._id ? keep._id : vote.loserId;
      if (winnerId === loserId) {
        await ctx.db.delete(vote._id);
        dropped++;
      } else if (winnerId !== vote.winnerId || loserId !== vote.loserId) {
        await ctx.db.patch(vote._id, { winnerId, loserId });
        moved++;
      }
    }

    const standing = await ctx.db
      .query('standings')
      .withIndex('by_poster', (q) => q.eq('posterId', drop._id))
      .unique();
    if (standing) await ctx.db.delete(standing._id);
    await ctx.db.delete(drop._id);
    await ctx.db.patch(competition._id, { postersUpdatedAt: Date.now() });
    await startRebuild(ctx, competition._id);

    return { kept: keep.title, removed: drop.title, votesMoved: moved, votesDropped: dropped };
  }
});
