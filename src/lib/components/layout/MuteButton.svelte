<script lang="ts">
  import IconButton from '$lib/components/ui/IconButton.svelte';
  import { i18n } from '$lib/i18n/index.svelte';
  import { sound } from '$lib/services/sound.svelte';

  const t = $derived(i18n.t.header);
</script>

<IconButton
  label={sound.muted ? t.unmuteLabel : t.muteLabel}
  pressed={sound.muted}
  muted={sound.muted}
  onclick={() => sound.toggle()}
>
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
    {#if sound.muted}
      <path d="M16.5 9.5l5 5m0-5l-5 5" />
    {:else}
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    {/if}
  </svg>
</IconButton>

<style>
  path:not([fill]) {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }
</style>
