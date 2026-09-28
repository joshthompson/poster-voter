<script lang="ts">
  import { PUBLIC_CONVEX_URL } from '$env/static/public';
  import { setupConvex } from 'convex-svelte';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import Logo from '$lib/Logo.svelte';
  import Menu from '$lib/Menu.svelte';
  import PolkaDots from '$lib/PolkaDots.svelte';
  import { sound } from '$lib/sound.svelte';
  import '../app.css';

  let { children } = $props();

  const configured = Boolean(PUBLIC_CONVEX_URL);
  if (configured) setupConvex(PUBLIC_CONVEX_URL);

  const onResults = $derived(page.route.id?.startsWith('/results'));
</script>

<svelte:window onpointerdown={() => sound.unlock()} onkeydown={() => sound.unlock()} />

<PolkaDots />

<header>
  <button
    class="mute"
    onclick={() => sound.toggle()}
    aria-pressed={sound.muted}
    aria-label={sound.muted ? 'Unmute sound' : 'Mute sound'}
    title={sound.muted ? 'Unmute' : 'Mute'}
  >
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {#if sound.muted}
        <path d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
      {:else}
        <path
          d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          fill="none"
        />
      {/if}
    </svg>
  </button>
  <a class="brand" href={resolve('/')} aria-label="Poster Voter!">
    <Logo />
  </a>
  <nav>
    {#if onResults}
      <a class="pill" href={resolve('/')}>← Keep voting</a>
    {:else}
      <a class="pill" href={resolve('/results')}>Rankings →</a>
    {/if}
    {#if configured}<Menu />{/if}
  </nav>
</header>

<main>
  {#if configured}
    {@render children()}
  {:else}
    <div class="setup-wrap">
      <div class="setup legible">
      <h1>Almost there</h1>
        <p>Add your Convex URL to <code>.env.local</code> (or run <code>pnpm dev</code> to set it up).</p>
      </div>
    </div>
  {/if}
</main>

<style>
  header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    padding: clamp(12px, 2.5vw, 28px) clamp(16px, 3vw, 36px);
    pointer-events: none;
  }
  header > * {
    pointer-events: auto;
  }
  .mute {
    grid-column: 1;
    justify-self: start;
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--ink);
    color: var(--paper);
    cursor: pointer;
    transition: transform 0.25s var(--spring), background 0.2s;
  }
  .mute:hover {
    transform: rotate(-8deg) scale(1.08);
    background: var(--red);
  }
  .mute[aria-pressed='true'] {
    background: var(--muted);
  }
  .brand {
    grid-column: 2;
    display: inline-block;
    text-decoration: none;
  }
  nav {
    grid-column: 3;
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  @media (max-width: 560px) {
    header {
      grid-template-columns: 1fr;
      justify-items: center;
      gap: 8px;
    }
    /* The header stacks into one centred column here, so pin the button to the corner. */
    .mute {
      position: absolute;
      top: 12px;
      left: 12px;
      width: 36px;
      height: 36px;
    }
    .brand,
    nav {
      grid-column: 1;
      justify-self: center;
    }
  }
  .pill {
    display: inline-block;
    padding: 0.6em 1.1em;
    border-radius: 999px;
    background: var(--ink);
    color: var(--paper);
    text-decoration: none;
    font-weight: 600;
    font-size: 15px;
    transition: transform 0.25s var(--spring), background 0.2s;
  }
  @media (max-width: 560px) {
    .pill {
      padding: 0.5em 0.9em;
      font-size: 13px;
    }
  }
  .pill:hover {
    transform: translateY(-2px) rotate(-2deg) scale(1.05);
    background: var(--red);
  }
  main {
    position: relative;
    z-index: 1;
  }
  .setup-wrap {
    min-height: 100dvh;
    display: grid;
    place-content: center;
    padding: 16px;
  }
  .setup {
    text-align: center;
    padding: 28px 36px;
    border-radius: 24px;
  }
  .setup h1 {
    font-size: clamp(36px, 6vw, 72px);
    margin: 0;
  }
  code {
    background: rgba(0, 0, 0, 0.06);
    padding: 0.1em 0.4em;
    border-radius: 6px;
  }
</style>
