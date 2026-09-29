<script lang="ts">
  import CountUp from '$lib/components/ui/CountUp.svelte';

  // A grid of big counting-up numbers with a label under each; every other one is red.

  type Stat = { label: string; value: number; decimals?: number; suffix?: string };

  let { stats }: { stats: Stat[] } = $props();
</script>

<section class="stats">
  {#each stats as stat, i}
    <div class="stat" style="--i:{i}">
      <strong><CountUp value={stat.value} decimals={stat.decimals ?? 0} suffix={stat.suffix ?? ''} pixel /></strong>
      <span>{stat.label}</span>
    </div>
  {/each}
</section>

<style>
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 14px;
    margin-bottom: clamp(48px, 8vw, 88px);
  }
  .stat {
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
    display: flex;
    align-items: flex-end;
    height: 60px;
    margin-bottom: 10px;
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
  span {
    color: var(--muted);
    font-size: 14px;
    font-weight: 600;
  }
</style>
