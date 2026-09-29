<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { resolve } from '$app/paths';
  import { api } from '../../../convex/_generated/api';
  import Button from '$lib/Button.svelte';
  import PixelText from '$lib/PixelText.svelte';
  import { designer } from '$lib/designer.svelte';
  import { i18n, LANGUAGES, type Lang } from '$lib/i18n.svelte';
  import { clearStorage, voterId } from '$lib/util';

  const votes = useQuery(api.votes.count, { voterId: voterId() });

  function clear() {
    const ok = confirm(i18n.t.settings.clearConfirm);
    if (!ok) return;
    clearStorage();
    // A full reload so every page starts from the cleared state (and asks the designer question again).
    location.href = resolve('/');
  }
</script>

<svelte:head>
  <title>{i18n.t.settings.title} · {i18n.t.brand}</title>
</svelte:head>

<div class="page">
  <h1><PixelText text={i18n.t.settings.title} color="var(--ink)" /></h1>

  <section class="card" style="--i:1">
    <h2>{i18n.t.designerQuestion}</h2>
    <p class="hint">{i18n.t.settings.designerHint}</p>
    <div class="choices">
      <Button label={i18n.t.yes} variant="ink" px={1} pressed={designer.value === true} onclick={() => designer.set(true)} />
      <Button label={i18n.t.no} variant="ink" px={1} pressed={designer.value === false} onclick={() => designer.set(false)} />
    </div>
  </section>

  <section class="card" style="--i:2">
    <h2>{i18n.t.settings.language}</h2>
    <!-- Each language is named in itself, so it's findable whichever one is showing. -->
    <div class="choices">
      {#each Object.entries(LANGUAGES) as [lang, { name }]}
        <Button label={name} variant="ink" px={1} pressed={i18n.lang === lang} onclick={() => i18n.set(lang as Lang)} />
      {/each}
    </div>
  </section>

  <section class="card" style="--i:3">
    <h2>{i18n.t.settings.yourVotes}</h2>
    <p class="count">
      {#if votes.data === undefined}
        {i18n.t.settings.counting}
      {:else}
        {i18n.t.settings.votedBefore} <strong>{i18n.num(votes.data)}</strong> {i18n.t.settings.votedAfter(votes.data)}
      {/if}
    </p>
    <p class="hint">{i18n.t.settings.clearHint}</p>
    <Button label={i18n.t.settings.clear} variant="paper" px={1} onclick={clear} />
  </section>
</div>

<style>
  .page {
    max-width: 640px;
    margin: 0 auto;
    padding: clamp(120px, 18dvh, 170px) 16px 96px;
    text-align: center;
  }
  h1 {
    --text-px: 4;
    --text-px-sm: 2;
    /* Flex so a heading wider than the column overflows evenly on both sides. */
    display: flex;
    justify-content: center;
    margin: 0 0 clamp(28px, 5vw, 48px);
    animation: rise 0.8s var(--spring) both;
  }
  .card {
    display: grid;
    justify-items: center;
    gap: 14px;
    margin-bottom: 18px;
    padding: clamp(24px, 4vw, 36px);
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(10px);
    border-radius: 26px;
    box-shadow: 0 16px 40px -22px rgba(31, 26, 36, 0.45);
    animation: rise 0.8s var(--spring) both;
    animation-delay: calc(var(--i) * 0.12s);
  }
  h2 {
    margin: 0;
    font-size: clamp(22px, 3vw, 28px);
    letter-spacing: -0.03em;
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
    max-width: 40ch;
  }
  .count {
    margin: 0;
    font-size: 18px;
  }
  .count strong {
    color: var(--red);
    font-weight: 800;
  }
  .choices {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 14px;
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.9);
    }
  }
</style>
