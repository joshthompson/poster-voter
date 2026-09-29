<script lang="ts">
  import { i18n } from '$lib/i18n/index.svelte';
  import DuelCard from './DuelCard.svelte';
  import type { Duel } from './types';

  // The closest and the most lopsided match-ups, when there are any.

  let { closest, lopsided }: { closest: Duel | null; lopsided: Duel | null } = $props();

  const t = $derived(i18n.t.results);
  const cards = $derived(
    [
      { title: t.closest, blurb: t.closestBlurb, duel: closest },
      { title: t.lopsided, blurb: t.lopsidedBlurb, duel: lopsided }
    ].filter((c): c is typeof c & { duel: Duel } => c.duel !== null)
  );
</script>

<section class="highlights">
  {#each cards as c, i}
    <DuelCard title={c.title} blurb={c.blurb} duel={c.duel} index={i} />
  {/each}
</section>

<style>
  .highlights {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 340px));
    justify-content: center;
    gap: 18px;
    margin-bottom: 3rem;
  }
</style>
