<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { api } from '../../convex/_generated/api';
  import { i18n } from './i18n.svelte';

  // Burger button with a small dropdown of every page and past competitions' results.
  // Closes on navigation, Escape, or a click anywhere outside it.

  let open = $state(false);
  let root: HTMLElement;

  const links = $derived([
    { href: resolve('/'), label: i18n.t.menu.vote },
    { href: resolve('/results'), label: i18n.t.menu.rankings },
    { href: resolve('/about'), label: i18n.t.menu.about },
    { href: resolve('/settings'), label: i18n.t.menu.settings }
  ]);

  const archived = useQuery(api.competitions.archived, {});
  const past = $derived(
    (archived.data ?? []).map((c) => ({ href: resolve('/results/[[competition]]', { competition: c.slug }), label: c.title }))
  );

  $effect(() => {
    void page.url.pathname;
    open = false;
  });

  function onWindowPointer(e: PointerEvent) {
    if (open && !root.contains(e.target as Node)) open = false;
  }
</script>

<svelte:window onpointerdown={onWindowPointer} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<div class="menu" bind:this={root}>
  <button
    class="burger"
    class:open
    onclick={() => (open = !open)}
    aria-expanded={open}
    aria-controls="site-menu"
    aria-label={i18n.t.menu.label}
    title={i18n.t.menu.label}
  >
    <span></span><span></span><span></span>
  </button>
  {#if open}
    <ul id="site-menu" class="panel">
      {#each links as l}
        <li>
          <a href={l.href} aria-current={page.url.pathname === l.href ? 'page' : undefined}>{l.label}</a>
        </li>
      {/each}
      {#if past.length}
        <li class="heading" role="presentation">{i18n.t.menu.past}</li>
        {#each past as l}
          <li>
            <a href={l.href} aria-current={page.url.pathname === l.href ? 'page' : undefined}>{l.label}</a>
          </li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>

<style>
  .menu {
    position: relative;
  }
  .burger {
    display: grid;
    place-content: center;
    gap: 4px;
    width: 42px;
    height: 42px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--ink);
    cursor: pointer;
    transition:
      transform 0.25s var(--spring),
      background 0.2s;
  }
  .burger:hover {
    transform: rotate(8deg) scale(1.08);
    background: var(--red);
  }
  .burger span {
    display: block;
    width: 18px;
    height: 2px;
    border-radius: 2px;
    background: var(--paper);
    transition:
      transform 0.25s var(--spring),
      opacity 0.2s;
  }
  /* Morphs into an X while open. */
  .open span:nth-child(1) {
    transform: translateY(6px) rotate(45deg);
  }
  .open span:nth-child(2) {
    opacity: 0;
  }
  .open span:nth-child(3) {
    transform: translateY(-6px) rotate(-45deg);
  }

  .panel {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    min-width: 160px;
    width: max-content;
    max-width: 260px;
    margin: 0;
    display: grid;
    gap: 4px;
    padding: 8px;
    list-style: none;
    background: var(--ink);
    border-radius: 20px;
    box-shadow: 0 20px 40px -16px rgba(31, 26, 36, 0.6);
    transform-origin: top right;
    animation: drop 0.35s var(--spring) both;
  }
  @keyframes drop {
    from {
      opacity: 0;
      transform: scale(0.8) translateY(-6px);
    }
  }
  .panel a {
    display: block;
    padding: 0.6em 1em;
    border-radius: 12px;
    color: var(--paper);
    font-weight: 600;
    font-size: 15px;
    text-decoration: none;
    transition: background 0.2s;
  }
  .heading {
    margin: 8px 0 0;
    padding: 0.8em 1em 0.3em;
    border-top: 1px solid rgba(255, 247, 238, 0.2);
    color: var(--paper);
    opacity: 0.6;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  .panel a:hover,
  .panel a[aria-current='page'] {
    background: var(--red);
  }
</style>
