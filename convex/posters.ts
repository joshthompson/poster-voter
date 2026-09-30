import { internalMutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { find } from './competitions';
import { requestRun, startRebuild } from './tally';

/** Identifies a competition's poster list as it is now; it changes whenever the list does. */
export const posterVersion = (c: Doc<'competitions'>) => `${c._id}:${c.postersUpdatedAt ?? 0}`;

/**
 * A competition's current posters (by slug, or the active one), with its id and slug, the ids of
 * posters taken out of it, and the `version` of the list. Pages keep the list and pass its version
 * as `since`: if it's still current, `posters` is null and nothing else is read, so a returning
 * visitor is sent a few bytes instead of the list.
 */
export const list = query({
  args: { competition: v.optional(v.string()), since: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const competition = await find(ctx, args.competition);
    if (!competition) return { competitionId: null, slug: null, version: '', posters: [], removed: [] };
    const competitionId = competition._id;
    const slug = competition.slug;
    const version = posterVersion(competition);
    if (args.since === version) return { competitionId, slug, version, posters: null, removed: null };
    const posters = await ctx.db
      .query('posters')
      .withIndex('by_competition_active', (q) => q.eq('competitionId', competition._id).eq('active', true))
      .collect();
    return {
      competitionId,
      slug,
      version,
      posters: posters.map(({ _id, title, image }) => ({ _id, title, image })),
      removed: competition.removed ?? []
    };
  }
});

/**
 * Every competition's current posters, in the same order as `list`. The site build reads it to
 * prerender each poster's page with its own link preview (see src/lib/server/previews.ts).
 */
export const all = query({
  args: {},
  handler: async (ctx) => {
    const competitions = await ctx.db.query('competitions').collect();
    return Promise.all(
      competitions.map(async (c) => {
        const posters = await ctx.db
          .query('posters')
          .withIndex('by_competition_active', (q) => q.eq('competitionId', c._id).eq('active', true))
          .collect();
        return { slug: c.slug, title: c.title, posters: posters.map(({ _id, title, image }) => ({ _id, title, image })) };
      })
    );
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
    const removed = new Set(existingCompetition?.removed ?? []);
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
        removed.delete(existing._id);
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
        removed.add(p._id);
        deactivated++;
      }
    }

    const changed = adopted.length + added + updated + deactivated > 0;
    if (!changed) return { competition: competition.title, archived, added, updated, deactivated };
    if (existingCompetition) {
      await ctx.db.patch(competitionId, { postersUpdatedAt: Date.now(), removed: [...removed] });
    }

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
    await ctx.db.patch(competition._id, {
      postersUpdatedAt: Date.now(),
      removed: [...(competition.removed ?? []), drop._id]
    });
    await startRebuild(ctx, competition._id);

    return { kept: keep.title, removed: drop.title, votesMoved: moved, votesDropped: dropped };
  }
});

const REMOVE_BATCH = 2000;

/**
 * Take posters out of a competition and delete every vote they were in, then re-tally it from the
 * votes left. Their pairs are skipped rather than reshuffling anyone's order. Also delete their
 * files from posters/, or the next sync puts them back (with no votes). Run it once with
 * `npx convex run`; it carries on through the votes a batch at a time until `done`.
 */
export const remove = internalMutation({
  args: { competition: v.string(), keys: v.array(v.string()), after: v.optional(v.number()) },
  handler: async (ctx, { competition: slug, keys, after }) => {
    const competition = await ctx.db
      .query('competitions')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (!competition) throw new Error(`No competition "${slug}"`);
    const posters = [];
    for (const key of keys) {
      const poster = await ctx.db
        .query('posters')
        .withIndex('by_competition_key', (q) => q.eq('competitionId', competition._id).eq('key', key))
        .unique();
      if (!poster) throw new Error(`Missing poster: ${key}`);
      posters.push(poster);
    }
    const ids = new Set(posters.map((p) => p._id));

    // The first batch takes the posters out; later ones only carry on through the votes.
    if (after === undefined) {
      for (const p of posters) {
        if (p.active) await ctx.db.patch(p._id, { active: false });
        const standing = await ctx.db
          .query('standings')
          .withIndex('by_poster', (q) => q.eq('posterId', p._id))
          .unique();
        if (standing) await ctx.db.delete(standing._id);
      }
      await ctx.db.patch(competition._id, {
        postersUpdatedAt: Date.now(),
        removed: [...new Set([...(competition.removed ?? []), ...ids])]
      });
    }

    const votes = await ctx.db
      .query('votes')
      .withIndex('by_competition', (q) => q.eq('competitionId', competition._id).gt('_creationTime', after ?? 0))
      .take(REMOVE_BATCH);
    let deleted = 0;
    for (const vote of votes) {
      if (!ids.has(vote.winnerId) && !ids.has(vote.loserId)) continue;
      await ctx.db.delete(vote._id);
      deleted++;
    }

    const done = votes.length < REMOVE_BATCH;
    if (done) await startRebuild(ctx, competition._id);
    else {
      const next = votes[votes.length - 1]._creationTime;
      await ctx.scheduler.runAfter(0, internal.posters.remove, { competition: slug, keys, after: next });
    }
    return { removed: posters.map((p) => p.title), votesDeleted: deleted, done };
  }
});
