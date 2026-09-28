<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { resolve } from '$app/paths';
  import { api } from '../../../convex/_generated/api';
  import CountUp from '$lib/CountUp.svelte';
  import { placeholderSrc, posterSrc } from '$lib/util';

  const overview = useQuery(api.results.overview, {});

  const data = $derived(overview.data);
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

  const fallback = (e: Event) => ((e.currentTarget as HTMLImageElement).src = placeholderSrc());
  const pct = (n: number) => `${Math.round(n * 100)}%`;
</script>

<svelte:head>
  <title>Rankings · Poster Voter</title>
</svelte:head>

<div class="page">
  <section class="hero">
    <h1>
      <span class="w" style="--i:0">The</span>
      <span class="w accent" style="--i:1">Rankings</span>
    </h1>
    <svg class="squiggle" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 12 Q 20 2, 40 12 T 80 12 T 120 12 T 160 12 T 200 12 T 240 12 T 280 12 T 298 10" />
    </svg>
    <p class="sub">
      <span class="legible">
        {#if data}
          Live from {data.stats.totalVotes.toLocaleString()} head-to-heads. Updates as people vote.
        {:else}
          Tallying the dots…
        {/if}
      </span>
    </p>
  </section>

  {#if overview.error}
    <p class="empty"><span class="legible">Couldn’t load results: {overview.error.message}</span></p>
  {:else if data}
    <section class="stats">
      {#each [
        { label: 'Votes cast', value: data.stats.totalVotes },
        { label: 'Voters', value: data.stats.voters },
        { label: 'Posters', value: data.stats.posterCount },
        { label: 'Votes today', value: data.stats.lastDay },
        { label: 'Match-ups explored', value: coverage, decimals: coverage < 10 ? 1 : 0, suffix: '%' }
      ] as stat, i}
        <div class="stat" style="--i:{i}">
          <strong><CountUp value={stat.value} decimals={stat.decimals ?? 0} suffix={stat.suffix ?? ''} /></strong>
          <span>{stat.label}</span>
        </div>
      {/each}
    </section>

    {#if data.stats.totalVotes === 0}
      <p class="empty"><span class="legible">No votes yet — <a href={resolve('/')}>go cast the first one</a>.</span></p>
    {:else}
      <section class="podium" aria-label="Top three">
        {#each podium as p (p._id)}
          <div class="place place-{p.rank}" style="--i:{p.rank}">
            <div class="thumb">
              <img src={posterSrc(p.image)} alt={p.title} onerror={fallback} />
              <span class="medal">{p.rank}</span>
            </div>
            <div class="label legible">
              <h3>{p.title}</h3>
              <p>{p.rating} pts · {pct(p.winRate)} wins</p>
            </div>
            <div class="plinth"></div>
          </div>
        {/each}
      </section>

      <section class="highlights">
        {#each [
          { title: 'Closest rivalry', blurb: 'Neck and neck', pair: data.closest },
          { title: 'Most lopsided', blurb: 'Not even close', pair: data.lopsided }
        ] as h, i}
          {#if h.pair}
            <article class="highlight" style="--i:{i}">
              <header>
                <h3>{h.title}</h3>
                <span>{h.blurb}</span>
              </header>
              <div class="duel">
                <img src={posterSrc(h.pair.a.image)} alt={h.pair.a.title} onerror={fallback} />
                <span class="vs">vs</span>
                <img src={posterSrc(h.pair.b.image)} alt={h.pair.b.title} onerror={fallback} />
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
      <h2><span class="legible">Every poster</span></h2>
      <ol>
        {#each data.posters as p, i (p._id)}
          <li
            animate:flip={{ duration: 600 }}
            in:fly={{ y: 24, duration: 500, delay: Math.min(i, 20) * 35, easing: backOut }}
          >
            <span class="rank">{p.rank}</span>
            <img src={posterSrc(p.image)} alt="" loading="lazy" onerror={fallback} />
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
    <div class="loader" aria-label="Loading"><i></i><i></i><i></i></div>
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
    margin: 0;
    font-size: clamp(52px, 11vw, 132px);
    font-weight: 800;
    letter-spacing: -0.06em;
    line-height: 0.9;
  }
  .w {
    display: inline-block;
    animation: rise 0.9s var(--spring) both;
    animation-delay: calc(var(--i) * 0.12s);
  }
  .accent {
    color: var(--red);
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
    display: block;
    font-size: clamp(32px, 4vw, 46px);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
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
