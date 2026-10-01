<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import Meter from '$lib/components/ui/Meter.svelte';
  import { i18n } from '$lib/i18n/index.svelte';
  import { pct } from './format';
  import Board from './Board.svelte';
  import RankRow from './RankRow.svelte';
  import type { LinkTo, RankedPoster } from './types';

  // Every poster by rating. Rows slide to their new place as votes come in; each links to its
  // poster (see `linkTo`).

  let { posters, linkTo }: { posters: RankedPoster[]; linkTo: LinkTo } = $props();

  // Meters span the lowest to the highest rating, with a sliver even for last place.
  const range = $derived.by(() => {
    if (!posters.length) return { min: 0, span: 1 };
    const ratings = posters.map((p) => p.rating);
    const min = Math.min(...ratings);
    return { min, span: Math.max(1, Math.max(...ratings) - min) };
  });
  const meter = (rating: number) => 8 + ((rating - range.min) / range.span) * 92;
</script>

<Board title={i18n.t.results.everyPoster}>
  {#each posters as p, i (p._id)}
    <li
      animate:flip={{ duration: 600 }}
      in:fly={{ y: 24, duration: 500, delay: Math.min(i, 20) * 35, easing: backOut }}
    >
      <RankRow
        rank={p.rank}
        image={p.image}
        title={p.title}
        value={p.rating}
        caption="{p.wins}–{p.losses} · {p.matches ? pct(p.winRate) : '—'}"
        top={p.rank <= 3}
        {...linkTo(p, 'leaderboard')}
      >
        <Meter value={meter(p.rating)} />
      </RankRow>
    </li>
  {/each}
</Board>
