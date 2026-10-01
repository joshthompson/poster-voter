<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import Pill from '$lib/components/ui/Pill.svelte';
  import { i18n } from '$lib/i18n/index.svelte';
  import { track } from '$lib/services/analytics';

  // The header's shortcut: to the rankings from the voting page, back to voting from anywhere else.
  // It fills the space it's given and hides once it no longer fits; the menu has the same links.

  const onVoting = $derived(page.route.id === '/');

  let slot: HTMLElement;
  let pill: HTMLElement;
  let fits = $state(true);

  $effect(() => {
    const observer = new ResizeObserver(() => (fits = pill.offsetWidth <= slot.clientWidth));
    observer.observe(slot);
    observer.observe(pill);
    return () => observer.disconnect();
  });
</script>

<div class="slot" bind:this={slot}>
  <span class="fit" class:hidden={!fits} bind:this={pill}>
    <Pill
      variant="ink"
      href={onVoting ? resolve('/results') : resolve('/')}
      onclick={() => track('nav_link_clicked', { destination: onVoting ? 'rankings' : 'vote', placement: 'header_pill' })}
    >
      {onVoting ? i18n.t.header.rankings : i18n.t.header.keepVoting}
    </Pill>
  </span>
</div>

<style>
  .slot {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    justify-content: flex-end;
  }
  @media (max-width: 560px) {
    .slot {
      flex: 0 1 auto;
    }
  }
  .fit {
    flex: none;
  }
  .hidden {
    visibility: hidden;
  }
</style>
