import { useQuery } from 'convex-svelte';
import type { FunctionReturnType } from 'convex/server';
import { api } from '$convex/api';
import { storage } from './storage';

// A competition's poster list, kept in localStorage with its version. The server is only asked
// whether that version is still current (a few bytes back); the list itself is sent on a first
// visit and after posters are synced. The query is live, so a sync reaches open pages too.

export type PosterInfo = NonNullable<FunctionReturnType<typeof api.posters.list>['posters']>[number];
type Cached = { version: string; posters: PosterInfo[] };

/** The posters of `competition` (a slug, or undefined for the active one), once the server has confirmed them. */
export function usePosters(competition: () => string | undefined) {
  const key = $derived(`posters:${competition() ?? 'active'}`);
  // Lists received this visit, by key; otherwise whatever was stored last time.
  const received = $state<Record<string, Cached>>({});
  const cached = $derived(received[key] ?? storage.getJSON<Cached | null>(key, null));

  // Keeping the previous result covers the moment `since` moves on to a list just received.
  const query = useQuery(api.posters.list, () => ({ competition: competition(), since: cached?.version }), {
    keepPreviousData: true
  });

  $effect(() => {
    const result = query.data;
    if (!result?.posters) return;
    const list = { version: result.version, posters: result.posters };
    received[key] = list;
    storage.setJSON(key, list);
  });

  return {
    /** Undefined until the server has said which version is current. */
    get data(): PosterInfo[] | undefined {
      const result = query.data;
      if (!result) return undefined;
      if (result.posters) return result.posters;
      return cached?.version === result.version ? cached.posters : undefined;
    },
    /** The competition's id, once the server has said; null if there isn't one. */
    get competitionId() {
      return query.data?.competitionId;
    },
    get error() {
      return query.error;
    },
    get isLoading() {
      return this.data === undefined && !query.error;
    }
  };
}
