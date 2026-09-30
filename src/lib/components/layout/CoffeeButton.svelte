<script lang="ts">
  import button from '$lib/assets/bmc-button.svg';
  import logo from '$lib/assets/bmc-logo.png';
  import { i18n } from '$lib/i18n/index.svelte';
  import CornerButton from './CornerButton.svelte';

  // Link to our Buy Me a Coffee page. By default a small square that sways in the bottom-left
  // corner (see CornerButton); `full` is the whole "Buy me a coffee" button, in the flow.

  let { full = false }: { full?: boolean } = $props();

  const LINK = 'https://buymeacoffee.com/joshandalisa';
</script>

{#if full}
  <a class="full" href={LINK} target="_blank" rel="noopener">
    <img src={button} alt={i18n.t.coffee} width="171" height="48" />
  </a>
{:else}
  <CornerButton corner="left" label={i18n.t.coffee} href={LINK} background="#ffdd00">
    <img class="cup" src={logo} alt="" width="48" height="48" />
  </CornerButton>
{/if}

<style>
  .full {
    display: inline-block;
    border-radius: 8px;
    transition:
      transform 0.25s var(--spring),
      box-shadow 0.25s;
  }
  /* Lift by whole pixels only, as the socials do, so the lettering stays sharp. */
  .full:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px -10px rgba(31, 26, 36, 0.6);
  }
  .full:focus-visible {
    outline: 3px solid var(--red);
    outline-offset: 3px;
  }
  .full img {
    display: block;
  }

  .cup {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
