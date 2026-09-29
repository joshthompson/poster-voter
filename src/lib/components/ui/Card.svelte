<script lang="ts">
  import type { Snippet } from 'svelte';

  // A frosted white panel that rises into place. `delay` (seconds) staggers a column of cards.

  let { delay = 0, children }: { delay?: number; children: Snippet } = $props();
</script>

<section class="card" style="animation-delay: {delay}s">
  {@render children()}
</section>

<style>
  .card {
    display: grid;
    justify-items: center;
    gap: 14px;
    padding: clamp(24px, 4vw, 36px);
    background: var(--glass);
    backdrop-filter: var(--glass-blur);
    border-radius: 26px;
    box-shadow: var(--shadow-card);
    text-align: center;
    animation: rise 0.8s var(--spring) both;
  }
</style>
