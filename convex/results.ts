import { query } from './_generated/server';

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const posters = (
      await ctx.db
        .query('posters')
        .withIndex('by_active', (q) => q.eq('active', true))
        .collect()
    ).sort((a, b) => b.rating - a.rating);

    const byId = new Map(posters.map((p) => [p._id, p]));
    const pairs = (await ctx.db.query('pairs').collect()).filter(
      (p) => byId.has(p.aId) && byId.has(p.bId)
    );

    const votes = await ctx.db.query('votes').collect();
    const voters = new Set(votes.map((v) => v.voterId)).size;
    const now = Date.now();
    const lastDay = votes.filter((v) => now - v._creationTime < 86_400_000).length;

    const ranked = posters.map((p, i) => {
      const matches = p.wins + p.losses;
      return {
        _id: p._id,
        rank: i + 1,
        title: p.title,
        image: p.image,
        rating: Math.round(p.rating),
        wins: p.wins,
        losses: p.losses,
        matches,
        winRate: matches ? p.wins / matches : 0
      };
    });

    const summarise = (p: (typeof pairs)[number]) => {
      const total = p.aWins + p.bWins;
      return {
        a: { _id: p.aId, title: byId.get(p.aId)!.title, image: byId.get(p.aId)!.image, votes: p.aWins },
        b: { _id: p.bId, title: byId.get(p.bId)!.title, image: byId.get(p.bId)!.image, votes: p.bWins },
        total,
        split: total ? Math.abs(p.aWins - p.bWins) / total : 0
      };
    };

    const contested = pairs.filter((p) => p.aWins + p.bWins >= 2).map(summarise);
    const closest = [...contested].sort((x, y) => x.split - y.split || y.total - x.total)[0] ?? null;
    const lopsided = [...contested].sort((x, y) => y.split - x.split || y.total - x.total)[0] ?? null;

    const possiblePairs = (posters.length * (posters.length - 1)) / 2;

    return {
      posters: ranked,
      stats: {
        totalVotes: votes.length,
        voters,
        lastDay,
        posterCount: posters.length,
        pairsSeen: pairs.length,
        possiblePairs
      },
      closest,
      lopsided
    };
  }
});
