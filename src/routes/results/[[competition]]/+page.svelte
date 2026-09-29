<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { api } from '../../../../convex/_generated/api';
  import CountUp from '$lib/CountUp.svelte';
  import PixelText from '$lib/PixelText.svelte';
  import { posterSrc } from '$lib/util';
  import { i18n } from '$lib/i18n.svelte';

  type View = 'all' | 'designers' | 'others' | 'disagree';
  const VIEWS: View[] = ['all', 'designers', 'others', 'disagree'];
  let view = $state<View>('all');

  // /results is the active competition; /results/<slug> is any competition, usually an archived one.
  const slug = $derived(page.params.competition);

  const overview = useQuery(
    api.results.overview,
    () => (view === 'disagree' ? 'skip' : { segment: view, competition: slug }),
    { keepPreviousData: true }
  );
  const split = useQuery(api.results.disagreements, () =>
    view === 'disagree' ? { competition: slug } : 'skip'
  );

  const data = $derived(overview.data);
  const competition = $derived(view === 'disagree' ? split.data?.competition : data?.competition);
  const archived = $derived(competition?.active === false);
  const missing = $derived(view === 'disagree' ? split.data === null : overview.data === null);
  const podium = $derived(data ? [data.posters[1], data.posters[0], data.posters[2]].filter(Boolean) : []);
  const ratingRange = $derived.by(() => {
    if (!data?.posters.length) return { min: 0, span: 1 };
    const ratings = data.posters.map((p) => p.rating);
    const min = Math.min(...ratings);
    return { min, span: Math.max(1, Math.max(...ratings) - min) };
  });
  const coverage = $derived(
    data && data.stats.possiblePairs ? (data.stats.pairsSeen / data.stats.possiblePairs) * 100 : 0
  );

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  // The voter group the overview is showing (the overview is skipped for 'disagree').
  const segment = $derived(view === 'disagree' ? 'all' : view);
  const gapLabel = (gap: number) => i18n.t.results.gap(Math.round(Math.abs(gap) * 100));
  const t = $derived(i18n.t.results);
</script>

<svelte:head>
  <title>{competition ? `${competition.title} · ` : ''}{t.title} · {i18n.t.brand}</title>
</svelte:head>

<div class="page">
  <section class="hero">
    <h1>
      <span class="w" style="--i:0"><PixelText text={t.heading[0]} color="var(--ink)" /></span>
      <span class="w" style="--i:1"><PixelText text={t.heading[1]} color="var(--red)" /></span>
    </h1>
    <svg class="squiggle" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 12 Q 20 2, 40 12 T 80 12 T 120 12 T 160 12 T 200 12 T 240 12 T 280 12 T 298 10" />
    </svg>
    {#if competition}
      <p class="competition">
        <span class="legible">{competition.title}{archived ? ` · ${t.archived}` : ''}</span>
      </p>
    {/if}
    <p class="sub">
      <span class="legible">
        {#if missing}
          {slug ? t.noCompetitionHere : t.noCompetition}
        {:else if view === 'disagree'}
          {t.disagreeSub}
        {:else if data && archived}
          {t.final(data.stats.totalVotes, segment)}
        {:else if data}
          {t.live(data.stats.totalVotes, segment)}
        {:else}
          {t.tallying}
        {/if}
      </span>
    </p>
  </section>

  {#if !missing}
    <nav class="filters" aria-label={t.viewsLabel}>
      {#each VIEWS as v}
        <button class:active={view === v} aria-pressed={view === v} onclick={() => (view = v)}>
          {t.views[v]}
        </button>
      {/each}
    </nav>
  {/if}

  {#if missing}
    <p class="empty">
      <span class="legible"><a href={resolve('/results')}>{t.seeCurrent}</a>.</span>
    </p>
  {:else if view === 'disagree'}
    {#if split.error}
      <p class="empty"><span class="legible">{t.loadError(split.error.message)}</span></p>
    {:else if !split.data}
      <div class="loader" aria-label={i18n.t.loading}><i></i><i></i><i></i></div>
    {:else if !split.data.posters.length}
      <p class="empty">
        <span class="legible">
          {t.notEnough(split.data.minMatches, split.data.designerVotes, split.data.otherVotes)}
        </span>
      </p>
    {:else}
      <section class="board">
        <h2><span class="legible">{t.versusTitle}</span></h2>
        <p class="note">
          <span class="legible">{t.versusNote}</span>
        </p>
        <ol>
          {#each split.data.posters as p, i (p._id)}
            <li class="gap-row" in:fly={{ y: 24, duration: 500, delay: Math.min(i, 20) * 35, easing: backOut }}>
              <span class="rank">{i + 1}</span>
              <img src={posterSrc(p.image)} alt="" loading="lazy" />
              <div class="info">
                <strong>{p.title}</strong>
                <div class="versus">
                  <span class="who">{t.designers}</span>
                  <div class="meter designers"><i style="width: {Math.max(2, p.designers.winRate * 100)}%"></i></div>
                  <span class="val">{pct(p.designers.winRate)} · #{p.designers.rank}</span>
                  <span class="who">{t.others}</span>
                  <div class="meter others"><i style="width: {Math.max(2, p.others.winRate * 100)}%"></i></div>
                  <span class="val">{pct(p.others.winRate)} · #{p.others.rank}</span>
                </div>
              </div>
              <div class="nums">
                <span class="rating">{gapLabel(p.gap)}</span>
                <span class="record">{p.gap > 0 ? t.designersLove : t.designersNotSold}</span>
              </div>
            </li>
          {/each}
        </ol>
      </section>
    {/if}
  {:else if overview.error}
    <p class="empty"><span class="legible">{t.loadError(overview.error.message)}</span></p>
  {:else if data}
    <section class="stats">
      {#each [
        { label: t.stats.votes, value: data.stats.totalVotes },
        { label: t.stats.voters, value: data.stats.voters },
        { label: t.stats.posters, value: data.stats.posterCount },
        { label: t.stats.today, value: data.stats.lastDay },
        { label: t.stats.explored, value: coverage, decimals: coverage < 10 ? 1 : 0, suffix: '%' }
      ] as stat, i}
        <div class="stat" style="--i:{i}">
          <strong><CountUp value={stat.value} decimals={stat.decimals ?? 0} suffix={stat.suffix ?? ''} pixel /></strong>
          <span>{stat.label}</span>
        </div>
      {/each}
    </section>

    {#if data.stats.totalVotes === 0}
      <p class="empty">
        <span class="legible">
          {#if archived}
            {t.noVotesArchived(segment)}
          {:else if view === 'all'}
            {t.noVotesYet[0]}<a href={resolve('/')}>{t.noVotesYet[1]}</a>{t.noVotesYet[2]}
          {:else}
            {t.noVotesSegment(segment)}
          {/if}
        </span>
      </p>
    {:else}
      <section class="podium" aria-label={t.topThree}>
        {#each podium as p (p._id)}
          <div class="place place-{p.rank}" style="--i:{p.rank}">
            <div class="thumb">
              <img src={posterSrc(p.image)} alt={p.title} />
              <span class="medal">{p.rank}</span>
            </div>
            <div class="label legible">
              <h3>{p.title}</h3>
              <p>{t.podium(p.rating, pct(p.winRate))}</p>
            </div>
            <div class="plinth"></div>
          </div>
        {/each}
      </section>

      <section class="highlights">
        {#each [
          { title: t.closest, blurb: t.closestBlurb, pair: data.closest },
          { title: t.lopsided, blurb: t.lopsidedBlurb, pair: data.lopsided }
        ] as h, i}
          {#if h.pair}
            <article class="highlight" style="--i:{i}">
              <header>
                <h3>{h.title}</h3>
                <span>{h.blurb}</span>
              </header>
              <div class="duel">
                <img src={posterSrc(h.pair.a.image)} alt={h.pair.a.title} />
                <span class="vs">{t.vs}</span>
                <img src={posterSrc(h.pair.b.image)} alt={h.pair.b.title} />
              </div>
              <div class="split">
                <i style="flex: {h.pair.a.votes || 0.0001}"></i>
                <i style="flex: {h.pair.b.votes || 0.0001}"></i>
              </div>
              <div class="split-labels">
                <span>{h.pair.a.title} · {h.pair.a.votes}</span>
                <span>{h.pair.b.votes} · {h.pair.b.title}</span>
              </div>
            </article>
          {/if}
        {/each}
      </section>
    {/if}

    <section class="board">
      <h2><span class="legible">{t.everyPoster}</span></h2>
      <ol>
        {#each data.posters as p, i (p._id)}
          <li
            animate:flip={{ duration: 600 }}
            in:fly={{ y: 24, duration: 500, delay: Math.min(i, 20) * 35, easing: backOut }}
          >
            <span class="rank">{p.rank}</span>
            <img src={posterSrc(p.image)} alt="" loading="lazy" />
            <div class="info">
              <strong>{p.title}</strong>
              <div class="meter">
                <i style="width: {8 + ((p.rating - ratingRange.min) / ratingRange.span) * 92}%"></i>
              </div>
            </div>
            <div class="nums">
              <span class="rating">{p.rating}</span>
              <span class="record">{p.wins}–{p.losses} · {p.matches ? pct(p.winRate) : '—'}</span>
            </div>
          </li>
        {/each}
      </ol>
    </section>
  {:else}
    <div class="loader" aria-label={i18n.t.loading}><i></i><i></i><i></i></div>
  {/if}
</div>

<style>
  .page {
    max-width: 1100px;
    margin: 0 auto;
    padding: clamp(96px, 14dvh, 140px) 16px 96px;
  }

  /* Hero */
  .hero {
    text-align: center;
    margin-bottom: clamp(32px, 6vw, 64px);
  }
  h1 {
    /* Pixel letters: 4 screen px per art px, 2 on phones. */
    --text-px: 4;
    --text-px-sm: 2;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-end;
    gap: 0 32px;
  }
  @media (max-width: 560px) {
    h1 {
      gap: 0 16px;
    }
  }
  .w {
    display: inline-block;
    animation: rise 0.9s var(--spring) both;
    animation-delay: calc(var(--i) * 0.12s);
  }
  .squiggle {
    display: block;
    width: min(360px, 60%);
    height: 20px;
    margin: 8px auto 0;
  }
  .squiggle path {
    fill: none;
    stroke: var(--yellow);
    stroke-width: 5;
    stroke-linecap: round;
    stroke-dasharray: 400;
    stroke-dashoffset: 400;
    animation: draw 1.4s var(--smooth) 0.4s forwards;
  }
  @keyframes draw {
    to {
      stroke-dashoffset: 0;
    }
  }
  .competition {
    margin: 18px 0 0;
    line-height: 2;
    color: var(--ink);
    font-weight: 700;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    animation: rise 0.8s var(--smooth) 0.25s both;
  }
  .sub {
    line-height: 2;
    color: var(--muted);
    font-size: clamp(15px, 1.6vw, 19px);
    animation: rise 0.8s var(--smooth) 0.3s both;
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.9);
    }
  }

  /* Filters */
  .filters {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0 0 clamp(32px, 6vw, 56px);
    animation: rise 0.8s var(--smooth) 0.4s both;
  }
  .filters button {
    padding: 0.55em 1.1em;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: rgba(255, 247, 238, 0.8);
    backdrop-filter: blur(6px);
    font: inherit;
    font-weight: 700;
    font-size: 15px;
    color: var(--ink);
    cursor: pointer;
    transition:
      transform 0.25s var(--spring),
      background 0.2s,
      color 0.2s;
  }
  .filters button:hover {
    transform: translateY(-2px) rotate(-2deg);
  }
  .filters button.active {
    background: var(--ink);
    color: var(--paper);
  }
  @media (max-width: 560px) {
    .filters {
      gap: 6px;
    }
    .filters button {
      padding: 0.45em 0.85em;
      font-size: 13px;
    }
  }
  .filters button:last-child.active {
    background: var(--red);
    border-color: var(--red);
    color: white;
  }

  /* Stats */
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 14px;
    margin-bottom: clamp(48px, 8vw, 88px);
  }
  .stat {
    background: rgba(255, 255, 255, 0.78);
    backdrop-filter: blur(10px);
    border-radius: 22px;
    padding: 20px 22px;
    box-shadow: 0 12px 30px -18px rgba(31, 26, 36, 0.4);
    animation: rise 0.7s var(--spring) both;
    animation-delay: calc(0.2s + var(--i) * 0.08s);
    transition: transform 0.35s var(--spring);
  }
  .stat:hover {
    transform: translateY(-4px) rotate(-1.5deg);
  }
  .stat strong {
    /* Pixel digits vary from 26 to 30 art px tall; a fixed row keeps the labels lined up. */
    display: flex;
    align-items: flex-end;
    height: 60px;
    margin-bottom: 10px;
  }
  @media (max-width: 560px) {
    .stat strong {
      height: 30px;
      margin-bottom: 6px;
    }
  }
  .stat:nth-child(odd) strong {
    color: var(--red);
  }
  .stat span {
    color: var(--muted);
    font-size: 14px;
    font-weight: 600;
  }

  /* Podium */
  .podium {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: end;
    gap: clamp(10px, 3vw, 32px);
    margin-bottom: clamp(56px, 9vw, 100px);
    text-align: center;
  }
  .place {
    animation: rise 0.9s var(--spring) both;
    animation-delay: calc(0.5s + (3 - var(--i)) * 0.18s);
  }
  .thumb {
    position: relative;
    margin: 0 auto;
    width: 78%;
    transition: transform 0.4s var(--spring);
  }
  .place:hover .thumb {
    transform: translateY(-8px) rotate(-2deg) scale(1.03);
  }
  .place-1 .thumb {
    width: 92%;
  }
  .thumb img {
    display: block;
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    border: clamp(4px, 0.8vw, 10px) solid white;
    border-radius: 6px;
    box-shadow: 0 24px 50px -18px rgba(31, 26, 36, 0.5);
  }
  .medal {
    position: absolute;
    top: -16px;
    right: -12px;
    width: clamp(40px, 5vw, 60px);
    aspect-ratio: 1;
    border-radius: 50%;
    display: grid;
    place-content: center;
    font-weight: 800;
    font-size: clamp(18px, 2.4vw, 28px);
    background: var(--ink);
    color: var(--paper);
    animation: spin-in 0.9s var(--spring) both;
    animation-delay: calc(1s + (3 - var(--i)) * 0.18s);
  }
  .place-1 .medal {
    background: var(--red);
    width: clamp(52px, 6.5vw, 76px);
  }
  .place-2 .medal {
    background: var(--yellow);
    color: var(--ink);
  }
  @keyframes spin-in {
    from {
      transform: scale(0) rotate(-200deg);
    }
  }
  .label {
    display: inline-block;
    margin: 16px 0 12px;
    padding: 0.4em 0.8em;
    border-radius: 14px;
  }
  .place h3 {
    margin: 0 0 2px;
    font-size: clamp(14px, 1.8vw, 22px);
    letter-spacing: -0.02em;
  }
  .place p {
    margin: 0;
    color: var(--muted);
    font-size: clamp(12px, 1.3vw, 15px);
  }
  .plinth {
    height: 36px;
    background: var(--ink);
  }
  .place-1 .plinth {
    height: 76px;
    background: var(--red);
  }
  .place-2 .plinth {
    height: 52px;
    background: var(--yellow);
  }

  /* Highlights */
  .highlights {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 340px));
    justify-content: center;
    gap: 18px;
    margin-bottom: clamp(56px, 9vw, 100px);
  }
  .highlight {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(10px);
    border-radius: 26px;
    padding: 22px;
    box-shadow: 0 16px 40px -22px rgba(31, 26, 36, 0.45);
    animation: rise 0.8s var(--spring) both;
    animation-delay: calc(0.8s + var(--i) * 0.12s);
    transition: transform 0.35s var(--spring);
  }
  .highlight:hover {
    transform: translateY(-5px) rotate(0.8deg);
  }
  .highlight header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .highlight h3 {
    margin: 0;
    font-size: 20px;
    letter-spacing: -0.02em;
  }
  .highlight header span {
    color: var(--muted);
    font-size: 13px;
  }
  .duel {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 18px 0 16px;
  }
  .duel img {
    width: 38%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    border: 5px solid white;
    border-radius: 4px;
    box-shadow: 0 10px 24px -12px rgba(31, 26, 36, 0.5);
  }
  .duel img:first-child {
    rotate: -4deg;
  }
  .duel img:last-child {
    rotate: 4deg;
  }
  .duel .vs {
    font-weight: 800;
    background: var(--yellow);
    border-radius: 50%;
    width: 38px;
    height: 38px;
    display: grid;
    place-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }
  .split {
    display: flex;
    height: 12px;
    border-radius: 99px;
    overflow: hidden;
    gap: 3px;
  }
  .split i {
    background: var(--red);
    transition: flex 0.8s var(--smooth);
  }
  .split i:last-child {
    background: var(--ink);
  }
  .split-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 13px;
    font-weight: 600;
    gap: 10px;
  }

  /* Leaderboard */
  .board h2 .legible {
    padding: 0.05em 0.4em 0.12em;
    border-radius: 0.3em;
  }
  .board h2 {
    font-size: clamp(30px, 4.4vw, 52px);
    letter-spacing: -0.04em;
    margin: 0 0 20px;
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 10px;
  }
  li {
    display: grid;
    grid-template-columns: 44px 54px 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 10px 18px 10px 12px;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(8px);
    border-radius: 18px;
    box-shadow: 0 8px 20px -16px rgba(31, 26, 36, 0.5);
    transition:
      transform 0.3s var(--spring),
      box-shadow 0.3s;
  }
  li:hover {
    transform: scale(1.015) rotate(-0.4deg);
    box-shadow: 0 14px 30px -16px rgba(255, 59, 92, 0.5);
  }
  .rank {
    font-weight: 800;
    font-size: 22px;
    text-align: center;
    color: var(--muted);
  }
  li:nth-child(-n + 3) .rank {
    color: var(--red);
  }
  li img {
    width: 54px;
    height: 72px;
    object-fit: cover;
    border-radius: 6px;
  }
  .info {
    min-width: 0;
  }
  .info strong {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 8px;
  }
  .meter {
    height: 8px;
    border-radius: 99px;
    background: rgba(31, 26, 36, 0.08);
    overflow: hidden;
  }
  .meter i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--yellow), var(--red));
    transition: width 0.8s var(--smooth);
    animation: fill 1.2s var(--smooth) both 0.4s;
    transform-origin: left;
  }
  @keyframes fill {
    from {
      transform: scaleX(0);
    }
  }
  .nums {
    text-align: right;
  }
  .rating {
    display: block;
    font-weight: 800;
    font-size: 22px;
    letter-spacing: -0.03em;
  }
  .record {
    color: var(--muted);
    font-size: 13px;
    white-space: nowrap;
  }

  /* Disagreements */
  .note {
    margin: -8px 0 20px;
    color: var(--muted);
    line-height: 2;
  }
  .versus {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 4px 10px;
    font-size: 13px;
  }
  .versus .who {
    color: var(--muted);
    font-weight: 600;
  }
  .versus .val {
    font-weight: 700;
    white-space: nowrap;
  }
  .meter.designers i {
    background: var(--red);
  }
  .meter.others i {
    background: var(--ink);
  }

  .empty {
    line-height: 2;
    text-align: center;
    font-size: 20px;
    margin: 0 0 64px;
  }
  .empty a {
    color: var(--red);
    font-weight: 700;
  }

  .loader {
    display: flex;
    justify-content: center;
    gap: 14px;
    padding: 60px 0;
  }
  .loader i {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--red);
    animation: bounce 0.9s ease-in-out infinite;
  }
  .loader i:nth-child(2) {
    animation-delay: 0.15s;
    background: var(--yellow);
  }
  .loader i:nth-child(3) {
    animation-delay: 0.3s;
  }
  @keyframes bounce {
    50% {
      transform: translateY(-20px) scale(0.7);
    }
  }

  @media (max-width: 560px) {
    li {
      grid-template-columns: 30px 44px 1fr auto;
      gap: 10px;
      padding: 8px 12px 8px 8px;
    }
    li img {
      width: 44px;
      height: 58px;
    }
    .rank,
    .rating {
      font-size: 18px;
    }
  }
</style>
