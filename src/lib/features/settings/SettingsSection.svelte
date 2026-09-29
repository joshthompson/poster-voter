<script lang="ts">
  import type { Snippet } from 'svelte';
  import Card from '$lib/components/ui/Card.svelte';

  // One settings card: a heading, an optional hint under it, then the controls.

  let { title, hint, delay, children }: { title: string; hint?: string; delay?: number; children: Snippet } =
    $props();
</script>

<Card {delay}>
  <h2>{title}</h2>
  {#if hint}<p class="hint">{hint}</p>{/if}
  {@render children()}
</Card>

<style>
  h2 {
    margin: 0;
    font-size: clamp(22px, 3vw, 28px);
    letter-spacing: -0.03em;
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
    max-width: 40ch;
  }
</style>
