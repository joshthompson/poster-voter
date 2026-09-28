<script lang="ts">
  import { tween } from './util';

  let { value, duration = 1200, decimals = 0, suffix = '' }: {
    value: number;
    duration?: number;
    decimals?: number;
    suffix?: string;
  } = $props();

  let shown = $state(0);

  $effect(() => {
    const target = value;
    return tween(shown, target, duration, (n) => (shown = n));
  });
</script>

{shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
