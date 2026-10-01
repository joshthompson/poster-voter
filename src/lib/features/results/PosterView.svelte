<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { resolve } from '$app/paths';
  import { api } from '$convex/api';
  import Loader from '$lib/components/ui/Loader.svelte';
  import Pill from '$lib/components/ui/Pill.svelte';
  import ShareButton from '$lib/features/share/ShareButton.svelte';
  import { i18n } from '$lib/i18n/index.svelte';
  import { track } from '$lib/services/analytics';
  import { usePosters } from '$lib/services/posters.svelte';
  import { visibility } from '$lib/state/visibility.svelte';
  import Note from './Note.svelte';
  import PosterPanel from './PosterPanel.svelte';
  import { rank } from './hydrate';
  import { posterHref, posterNames } from './links';

  // A poster's own page, named by its competition's slug and its name (see links.ts): the same
  // detail as the rankings' modal, from everyone's votes, with a way back to the rankings and a
  // button to share it under its title.

  let { competition: slug, name }: { competition: string; name: string } = $props();

  const posterList = usePosters(() => slug);
  // Live queries pause while the tab has been in the background for a while.
  const main = useQuery(
    api.results.snapshot,
    () => (visibility.away ? 'skip' : { segment: 'all' as const, competition: slug }),
    { keepPreviousData: true }
  );

  const t = $derived(i18n.t.results);
  const posters = $derived(posterList.data ?? []);
  const posterById = $derived(new Map(posters.map((p) => [p._id, p])));
  const competition = $derived(main.data?.competition);
  const error = $derived(main.error ?? posterList.error);
  const id = $derived([...posterNames(posters)].find(([, n]) => n === name)?.[0]);
  // Undefined while loading; null if no poster in the competition has this name.
  const poster = $derived(
    main.data && posterList.data
      ? (rank(posters, main.data.snapshot?.scores ?? []).find((p) => p._id === id) ?? null)
      : undefined
  );
  const rankings = $derived(
    competition?.active === false ? resolve('/results/[[competition]]', { competition: slug }) : resolve('/results')
  );
</script>

<svelte:head>
  <title>{poster ? `${poster.title} · ` : ''}{competition ? `${competition.title} · ` : ''}{i18n.t.brand}</title>
</svelte:head>

{#if error}
  <Note>{t.loadError(error.message)}</Note>
{:else if main.data === null}
  <Note>{t.noCompetitionHere} <a href={resolve('/results')}>{t.seeCurrent}</a>.</Note>
{:else if poster === null}
  <Note>{t.detail.noPoster} <a href={rankings}>{t.detail.seeRankings}</a>.</Note>
{:else if poster && competition}
  <p class="competition">
    <span class="legible">{competition.title}{competition.active ? '' : ` · ${t.archived}`}</span>
  </p>
  <article class="card">
    <PosterPanel {poster} segment="all" {posterById}>
      {#snippet links()}
        <Pill variant="ink" href={rankings}>{t.detail.allRankings}</Pill>
        <ShareButton
          href={posterHref(slug, name)}
          title={poster.title}
          labelled
          onshare={(outcome) =>
            track('poster_shared', {
              competition: slug,
              poster_id: poster._id,
              poster_title: poster.title,
              placement: 'poster_page',
              outcome
            })}
        />
      {/snippet}
    </PosterPanel>
  </article>
{:else}
  <div class="loading"><Loader /></div>
{/if}

<style>
  .competition {
    max-width: 860px;
    margin: 0 auto 12px;
    animation: rise 0.8s var(--smooth) both;
    font-weight: 700;
    font-size: 13px;
    line-height: 2;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .card {
    max-width: 860px;
    margin: 0 auto;
    border-radius: 26px;
    background: var(--card);
    box-shadow: var(--shadow-lift);
    animation: rise 0.8s var(--spring) 0.1s both;
  }
  .loading {
    padding: 60px 0;
  }
</style>
