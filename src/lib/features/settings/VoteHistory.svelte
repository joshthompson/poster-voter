<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { resolve } from '$app/paths';
  import { api } from '$convex/api';
  import Button from '$lib/components/ui/Button.svelte';
  import { i18n } from '$lib/i18n/index.svelte';
  import { storage } from '$lib/services/storage';
  import { voterId } from '$lib/services/voter';

  // How many times you've voted, and a button to forget everything this device remembers.

  const votes = useQuery(api.votes.count, { voterId: voterId() });
  const t = $derived(i18n.t.settings);

  function clear() {
    if (!confirm(t.clearConfirm)) return;
    storage.clear();
    // A full reload so every page starts from the cleared state (and asks the designer question again).
    location.href = resolve('/');
  }
</script>

<p class="count">
  {#if votes.data === undefined}
    {t.counting}
  {:else}
    {t.votedBefore} <strong>{i18n.num(votes.data)}</strong> {t.votedAfter(votes.data)}
  {/if}
</p>
<p class="hint">{t.clearHint}</p>
<Button label={t.clear} variant="paper" px={1} onclick={clear} />

<style>
  .count {
    margin: 0;
    font-size: 18px;
  }
  strong {
    color: var(--red);
    font-weight: 800;
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
    max-width: 40ch;
  }
</style>
