<script lang="ts">
  import PixelText from '$lib/components/pixel/PixelText.svelte';
  import { i18n } from '$lib/i18n/index.svelte';
  import { tween } from '$lib/utils/tween';

  // A number that counts up to `value`, formatted for the current language.
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
