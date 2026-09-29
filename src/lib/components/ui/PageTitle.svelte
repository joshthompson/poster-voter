<script lang="ts">
  import PixelText from '$lib/components/pixel/PixelText.svelte';

  // A page's big pixel-letter heading.

  let { text, color = 'var(--ink)' }: { text: string; color?: string } = $props();
</script>

<h1><PixelText {text} {color} /></h1>

<style>
  h1 {
    --text-px: 4;
    --text-px-sm: 2;
    /* Flex so a heading wider than the page column overflows evenly on both sides. */
    display: flex;
    justify-content: center;
    margin: 0 0 clamp(28px, 5vw, 48px);
    animation: rise 0.8s var(--spring) both;
  }
</style>
