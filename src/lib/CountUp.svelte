<script lang="ts">
  import PixelText from './PixelText.svelte';
  import { tween } from './util';
  import { i18n } from './i18n.svelte';

  // `pixel` draws the number in the pixel letters, coloured like the surrounding text.
  let { value, duration = 1200, decimals = 0, suffix = '', pixel = false }: {
    value: number;
    duration?: number;
    decimals?: number;
    suffix?: string;
    pixel?: boolean;
  } = $props();

  let shown = $state(0);

  $effect(() => {
    const target = value;
    return tween(shown, target, duration, (n) => (shown = n));
  });

  const text = $derived(
    i18n.num(shown, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
  );
</script>

{#if pixel}<PixelText {text} color="currentColor" />{:else}{text}{/if}
