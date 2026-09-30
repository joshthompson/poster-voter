<script lang="ts">
  import button from '$lib/assets/bmc-button.svg';
  import logo from '$lib/assets/bmc-logo.png';
  import { i18n } from '$lib/i18n/index.svelte';

  // Link to our Buy Me a Coffee page. By default a small square that sways in the bottom-left
  // corner and names itself on hover; `full` is the whole "Buy me a coffee" button, in the flow.

  let { full = false }: { full?: boolean } = $props();

  const LINK = 'https://buymeacoffee.com/joshandalisa';
</script>

{#if full}
  <a class="full" href={LINK} target="_blank" rel="noopener">
    <img src={button} alt={i18n.t.coffee} width="171" height="48" />
  </a>
{:else}
  <!-- The tip is the link's name too, so it's only hidden visually. -->
  <a class="floating" href={LINK} target="_blank" rel="noopener">
    <span class="cup"><img src={logo} alt="" width="48" height="48" /></span>
    <span class="tip">{i18n.t.coffee}</span>
  </a>
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

  .floating {
    position: fixed;
    left: max(clamp(16px, 3vw, 36px), env(safe-area-inset-left));
    bottom: max(clamp(16px, 2.5vw, 28px), env(safe-area-inset-bottom));
    z-index: 10;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    -webkit-tap-highlight-color: transparent;
  }
  .floating:focus-visible {
    outline: 3px solid var(--red);
    outline-offset: 4px;
  }
  .cup {
    display: block;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border: 2px solid var(--ink);
    border-radius: 12px;
    background: #ffdd00;
    box-shadow: var(--shadow-card);
    animation: sway 3s ease-in-out infinite alternate;
    transition: scale 0.25s var(--spring);
  }
  /* `scale` adds to the sway's `transform` rather than replacing it. */
  .floating:hover .cup {
    scale: 1.1;
  }
  .cup img {
    display: block;
    width: 100%;
    height: 100%;
  }
  @keyframes sway {
    from {
      transform: rotate(-5deg);
    }
    to {
      transform: rotate(5deg);
    }
  }

  .tip {
    position: absolute;
    left: calc(100% + 12px);
    top: 50%;
    padding: 6px 12px;
    border-radius: 99px;
    background: var(--ink);
    color: var(--paper);
    font-weight: 700;
    font-size: 14px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transform: translate(-6px, -50%);
    transition:
      opacity 0.2s,
      transform 0.25s var(--spring);
  }
  .floating:hover .tip,
  .floating:focus-visible .tip {
    opacity: 1;
    transform: translate(0, -50%);
  }
</style>
