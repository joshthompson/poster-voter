<script lang="ts">
  import Pill from '$lib/components/ui/Pill.svelte';
  import { i18n } from '$lib/i18n/index.svelte';
  import type { View } from './types';

  // Toggles between whose votes to show. The disagreements view lights up red.

  let { value = $bindable() }: { value: View } = $props();

  const VIEWS: View[] = ['all', 'designers', 'others', 'disagree'];

  const variant = (v: View) => (value !== v ? 'outline' : v === 'disagree' ? 'red' : 'ink');
</script>

<nav class="filters" aria-label={i18n.t.results.viewsLabel}>
  {#each VIEWS as v}
    <Pill variant={variant(v)} pressed={value === v} onclick={() => (value = v)}>
      {i18n.t.results.views[v]}
    </Pill>
  {/each}
</nav>

<style>
  .filters {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0 0 3rem;
    animation: rise 0.8s var(--smooth) 0.4s both;
  }
  @media (max-width: 560px) {
    .filters {
      gap: 6px;
    }
  }
</style>
