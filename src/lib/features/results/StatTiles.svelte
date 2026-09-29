<script lang="ts">
  import PixelText from '$lib/components/pixel/PixelText.svelte';
  import CountUp from '$lib/components/ui/CountUp.svelte';
  import { i18n } from '$lib/i18n/index.svelte';

  // A row of big counting-up numbers with a label under each; every other one is red.
  // Tiles grow to fit their number and wrap onto more rows when they don't fit.

  type Stat = { label: string; value: number; decimals?: number; suffix?: string };

  let { stats }: { stats: Stat[] } = $props();

  const final = (s: Stat) =>
    i18n.num(s.value, { minimumFractionDigits: s.decimals ?? 0, maximumFractionDigits: s.decimals ?? 0 }) +
    (s.suffix ?? '');
</script>

<section class="stats">
  {#each stats as stat, i}
    <div class="stat" style="--i:{i}">
      <strong>
        <!-- The final number, invisible, sizes the tile so it doesn't grow while counting up. -->
        <span class="sizer" aria-hidden="true"><PixelText text={final(stat)} color="currentColor" /></span>
        <span class="count"><CountUp value={stat.value} decimals={stat.decimals ?? 0} suffix={stat.suffix ?? ''} pixel /></span>
      </strong>
      <span>{stat.label}</span>
    </div>
  {/each}
</section>

<style>
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 3rem;
  }
  .stat {
    flex: 1 1 auto;
    min-width: 160px;
    background: var(--glass);
    backdrop-filter: var(--glass-blur);
    border-radius: 22px;
    padding: 20px 22px;
    box-shadow: var(--shadow-card);
    animation: rise 0.7s var(--spring) both;
    animation-delay: calc(0.2s + var(--i) * 0.08s);
    transition:
      transform 0.35s var(--spring),
      box-shadow 0.35s;
  }
  /* Lift by whole pixels only: rotating or scaling text resamples it and it blurs. */
  .stat:hover {
    transform: translateY(-4px);
    box-shadow: 0 24px 44px -20px rgba(31, 26, 36, 0.5);
  }
  strong {
    /* Pixel digits vary from 26 to 30 art px tall; a fixed row keeps the labels lined up. */
    display: grid;
    align-items: end;
    height: 60px;
    margin-bottom: 10px;
    white-space: nowrap;
  }
  .sizer,
  .count {
    grid-area: 1 / 1;
    display: flex;
    align-items: flex-end;
  }
  .sizer {
    visibility: hidden;
  }
  @media (max-width: 560px) {
    strong {
      height: 30px;
      margin-bottom: 6px;
    }
  }
  .stat:nth-child(odd) strong {
    color: var(--red);
  }
  .stat > span {
    display: block;
    white-space: nowrap;
    color: var(--muted);
    font-size: 14px;
    font-weight: 600;
  }
</style>
