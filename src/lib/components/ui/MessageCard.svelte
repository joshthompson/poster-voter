<script lang="ts">
  import type { Snippet } from 'svelte';

  // A short centred notice (a title and a line or two) that sits on the polka dots.

  let { title, children }: { title: string; children: Snippet } = $props();
</script>

<div class="message legible">
  <h2>{title}</h2>
  {@render children()}
</div>

<style>
  .message {
    padding: 24px 32px;
    border-radius: 24px;
    text-align: center;
    max-width: 36ch;
    animation: pop-in 0.6s var(--spring) both;
  }
  h2 {
    font-size: clamp(28px, 4vw, 48px);
    margin: 0 0 0.3em;
    letter-spacing: -0.03em;
  }
</style>
