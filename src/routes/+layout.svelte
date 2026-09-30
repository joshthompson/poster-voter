<script lang="ts">
  import { PUBLIC_CONVEX_URL } from '$env/static/public';
  import { setupConvex } from 'convex-svelte';
  import CoffeeButton from '$lib/components/layout/CoffeeButton.svelte';
  import PolkaDots from '$lib/components/layout/PolkaDots.svelte';
  import SetupNotice from '$lib/components/layout/SetupNotice.svelte';
  import SiteHeader from '$lib/components/layout/SiteHeader.svelte';
  import SiteShareButton from '$lib/features/share/SiteShareButton.svelte';
  import { sound } from '$lib/services/sound.svelte';
  import '$lib/styles/index.css';

  let { children } = $props();

  const configured = Boolean(PUBLIC_CONVEX_URL);
  if (configured) setupConvex(PUBLIC_CONVEX_URL);
</script>

<!-- Browsers only allow audio after a gesture, so the first click or key press starts it. -->
<svelte:window onpointerdown={() => sound.unlock()} onkeydown={() => sound.unlock()} />

<PolkaDots />
<SiteHeader withMenu={configured} />

<main>
  {#if configured}
    {@render children()}
  {:else}
    <SetupNotice />
  {/if}
</main>
<CoffeeButton />
<SiteShareButton />

<style>
  main {
    position: relative;
    z-index: 1;
  }
</style>
