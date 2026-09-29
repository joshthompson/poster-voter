<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { resolve } from '$app/paths';
  import { api } from '$convex/api';
  import Loader from '$lib/components/ui/Loader.svelte';
  import { i18n } from '$lib/i18n/index.svelte';
  import Disagreements from './Disagreements.svelte';
  import Highlights from './Highlights.svelte';
  import Leaderboard from './Leaderboard.svelte';
  import Note from './Note.svelte';
  import Podium from './Podium.svelte';
  import ResultsHero from './ResultsHero.svelte';
  import StatTiles from './StatTiles.svelte';
  import ViewFilters from './ViewFilters.svelte';
  import type { View } from './types';

  // A competition's results: the active one, or the one named by `slug` (usually archived).
  // Everyone / designers / non-designers share the overview; disagreements has its own query.

  let { slug }: { slug?: string } = $props();

  let view = $state<View>('all');

  const overview = useQuery(
    api.results.overview,
    () => (view === 'disagree' ? 'skip' : { segment: view, competition: slug }),
    { keepPreviousData: true }
  );
  const split = useQuery(api.results.disagreements, () => (view === 'disagree' ? { competition: slug } : 'skip'));

  const t = $derived(i18n.t.results);
  const data = $derived(overview.data);
  const competition = $derived(view === 'disagree' ? split.data?.competition : data?.competition);
  const archived = $derived(competition?.active === false);
  const missing = $derived(view === 'disagree' ? split.data === null : overview.data === null);
  // The voter group the overview is showing (the overview is skipped for 'disagree').
  const segment = $derived(view === 'disagree' ? 'all' : view);

  const sub = $derived.by(() => {
    if (missing) return slug ? t.noCompetitionHere : t.noCompetition;
    if (view === 'disagree') return t.disagreeSub;
    if (!data) return t.tallying;
    return archived ? t.final(data.stats.totalVotes, segment) : t.live(data.stats.totalVotes, segment);
  });

  const stats = $derived.by(() => {
    if (!data) return [];
    const s = data.stats;
    const coverage = s.possiblePairs ? (s.pairsSeen / s.possiblePairs) * 100 : 0;
    return [
      { label: t.stats.votes, value: s.totalVotes },
      { label: t.stats.voters, value: s.voters },
      { label: t.stats.posters, value: s.posterCount },
      { label: t.stats.today, value: s.lastDay },
      { label: t.stats.explored, value: coverage, decimals: coverage < 10 ? 1 : 0, suffix: '%' }
    ];
  });
</script>

<svelte:head>
  <title>{competition ? `${competition.title} · ` : ''}{t.title} · {i18n.t.brand}</title>
</svelte:head>

<ResultsHero
  heading={t.heading}
  competition={competition && `${competition.title}${archived ? ` · ${t.archived}` : ''}`}
  {sub}
/>

{#if missing}
  <Note><a href={resolve('/results')}>{t.seeCurrent}</a>.</Note>
{:else}
  <ViewFilters bind:value={view} />

  {#if view === 'disagree'}
    {#if split.error}
      <Note>{t.loadError(split.error.message)}</Note>
    {:else if !split.data}
      <div class="loading"><Loader /></div>
    {:else if !split.data.posters.length}
      <Note>{t.notEnough(split.data.minMatches, split.data.designerVotes, split.data.otherVotes)}</Note>
    {:else}
      <Disagreements posters={split.data.posters} />
    {/if}
  {:else if overview.error}
    <Note>{t.loadError(overview.error.message)}</Note>
  {:else if data}
    <StatTiles {stats} />

    {#if data.stats.totalVotes === 0}
      <Note>
        {#if archived}
          {t.noVotesArchived(segment)}
        {:else if view === 'all'}
          {t.noVotesYet[0]}<a href={resolve('/')}>{t.noVotesYet[1]}</a>{t.noVotesYet[2]}
        {:else}
          {t.noVotesSegment(segment)}
        {/if}
      </Note>
    {:else}
      <Podium top={data.posters.slice(0, 3)} />
      <Highlights closest={data.closest} lopsided={data.lopsided} />
    {/if}

    <Leaderboard posters={data.posters} />
  {:else}
    <div class="loading"><Loader /></div>
  {/if}
{/if}

<style>
  .loading {
    padding: 60px 0;
  }
</style>
