<script lang="ts">
  import type { Snippet } from 'svelte';

  // A titled ranked list. `children` renders the <li>s.

  let { title, note, children }: { title: string; note?: string; children: Snippet } = $props();
</script>

<section class="board">
  <h2><span class="legible">{title}</span></h2>
  {#if note}<p class="note"><span class="legible">{note}</span></p>{/if}
  <ol>{@render children()}</ol>
</section>

<style>
  h2 {
    font-size: clamp(30px, 4.4vw, 52px);
    letter-spacing: -0.04em;
    margin: 0 0 20px;
  }
  h2 .legible {
    padding: 0.05em 0.4em 0.12em;
    border-radius: 0.3em;
  }
  .note {
    margin: -8px 0 20px;
    color: var(--muted);
    line-height: 2;
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 10px;
  }
</style>
