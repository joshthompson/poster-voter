<script lang="ts">
  import type { Snippet } from 'svelte';

  // The centred column a page's content sits in, clear of the header.
  // `narrow` suits a stack of cards; `wide` suits tables and grids.

  let { width = 'narrow', children }: { width?: 'narrow' | 'wide'; children: Snippet } = $props();
</script>

<div class="page {width}">{@render children()}</div>

<style>
  .page {
    margin: 0 auto;
    padding: clamp(120px, 18dvh, 170px) 16px 96px;
  }
  .narrow {
    max-width: 640px;
    text-align: center;
  }
  .wide {
    max-width: 1100px;
    padding-top: clamp(96px, 14dvh, 140px);
  }
</style>
