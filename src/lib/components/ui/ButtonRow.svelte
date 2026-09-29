<script lang="ts">
  import type { Snippet } from 'svelte';

  // A centred row of buttons that wraps onto more lines when it runs out of room.

  let { children }: { children: Snippet } = $props();
</script>

<div class="row">{@render children()}</div>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: clamp(14px, 3vw, 28px);
  }
</style>
