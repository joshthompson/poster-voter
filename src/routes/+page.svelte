<script lang="ts">
  import { useConvexClient, useQuery } from 'convex-svelte';
  import { api } from '../../convex/_generated/api';
  import type { Id } from '../../convex/_generated/dataModel';
  import CountUp from '$lib/CountUp.svelte';
  import Logo from '$lib/Logo.svelte';
  import { sound } from '$lib/sound.svelte';
  import { posterSrc, preload, voterId } from '$lib/util';

  type Poster = { _id: Id<'posters'>; title: string; image: string };
  type Phase = 'loading' | 'enter' | 'choose' | 'reveal' | 'exit';
  type Spark = { angle: number; dist: number; size: number; color: string; delay: number };

  const ENTER_MS = 1100;
  const REVEAL_MS = 3000;
  const EXIT_MS = 700;
  const SPARK_COLORS = ['#ff3b5c', '#ffb000', '#ff7a93', '#1f1a24'];

  const posters = useQuery(api.posters.list, {});
  const client = useConvexClient();
  const me = voterId();

  // Skip the start button if the music is already going, e.g. arriving via "Keep voting".
  let started = $state(sound.unlocked);
  let pair = $state<Poster[] | null>(null);
  let phase = $state<Phase>('loading');
  let chosen = $state<number | null>(null);
  let result = $state<{ pct: number[]; total: number } | null>(null);
  let sparks = $state<Spark[]>([]);
  let error = $state<string | null>(null);
  let round = $state(0);
  let streak = $state(0);

  let upcoming: Poster[] | null = null;
  let revealTimer: ReturnType<typeof setTimeout> | undefined;
  const recent: string[] = [];

  const list = $derived((posters.data ?? []) as Poster[]);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** Random pair, steering away from posters seen in the last few rounds. */
  function pick(from: Poster[]): Poster[] {
    const memory = Math.min(recent.length, Math.max(0, from.length - 2), 24);
    const avoid = new Set(recent.slice(recent.length - memory));
    const fresh = from.filter((p) => !avoid.has(p._id));
    const pool = fresh.length >= 2 ? fresh : from;
    const i = Math.floor(Math.random() * pool.length);
    let j = Math.floor(Math.random() * (pool.length - 1));
    if (j >= i) j++;
    return [pool[i], pool[j]];
  }

  async function show(next: Poster[]) {
    await Promise.all(next.map((p) => preload(posterSrc(p.image))));
    recent.push(...next.map((p) => p._id));
    recent.splice(0, Math.max(0, recent.length - 48));

    pair = next;
    chosen = null;
    result = null;
    error = null;
    round++;
    phase = 'enter';

    // Queue up (and preload) the following pair while this one is on screen.
    upcoming = pick(list);
    upcoming.forEach((p) => preload(posterSrc(p.image)));

    await wait(ENTER_MS);
    if (phase === 'enter') phase = 'choose';
  }

  async function advance() {
    clearTimeout(revealTimer);
    phase = 'exit';
    await wait(EXIT_MS);
    const ids = new Set(list.map((p) => p._id));
    const next = upcoming?.every((p) => ids.has(p._id)) ? upcoming : pick(list);
    await show(next);
  }

  function makeSparks(): Spark[] {
    return Array.from({ length: 18 }, (_, k) => ({
      angle: (k / 18) * 360 + Math.random() * 20,
      dist: 90 + Math.random() * 140,
      size: 8 + Math.random() * 22,
      color: SPARK_COLORS[k % SPARK_COLORS.length],
      delay: Math.random() * 80
    }));
  }

  async function vote(i: number) {
    if (phase !== 'choose' || !pair) return;
    const winner = pair[i];
    const loser = pair[1 - i];
    chosen = i;
    sparks = makeSparks();
    sound.vote();
    phase = 'reveal';

    try {
      const r = await client.mutation(api.votes.cast, {
        winnerId: winner._id,
        loserId: loser._id,
        voterId: me
      });
      const total = r.winnerVotes + r.loserVotes;
      const w = Math.round((r.winnerVotes / total) * 100);
      result = { pct: i === 0 ? [w, 100 - w] : [100 - w, w], total };
      streak = w >= 50 ? streak + 1 : 0;
    } catch (e) {
      error = 'That vote got lost in the dots. Try the next pair!';
      console.error(e);
    }
    revealTimer = setTimeout(advance, REVEAL_MS);
  }

  function start() {
    sound.unlock();
    started = true;
  }

  function skip() {
    if (phase === 'choose') advance();
  }

  function onKey(e: KeyboardEvent) {
    if (phase === 'choose') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') vote(0);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') vote(1);
    } else if (phase === 'reveal' && result && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      advance();
    }
  }

  $effect(() => {
    if (started && !pair && phase === 'loading' && list.length >= 2) show(pick(list));
  });

  const verdict = $derived.by(() => {
    if (error) return error;
    if (!result || chosen === null) return '';
    const mine = result.pct[chosen];
    if (result.total === 1) return 'First ever vote on this match-up!';
    if (mine === 50) return 'A perfect tie. The dots are trembling.';
    if (mine >= 80) return 'Obviously. Almost everyone agrees.';
    if (mine > 50) return streak >= 3 ? `In tune with the crowd — ${streak} in a row!` : 'You’re with the crowd.';
    if (mine <= 20) return 'A true contrarian. Iconic.';
    return 'Bold taste — you’re in the minority.';
  });
</script>

<svelte:window onkeydown={onKey} />

<svelte:head>
  <title>Poster Voter</title>
</svelte:head>

<section class="stage" data-phase={phase}>
  {#if posters.error}
    <div class="message legible">
      <h2>Couldn’t reach the poster vault.</h2>
      <p>{posters.error.message}</p>
    </div>
  {:else if !posters.isLoading && list.length < 2}
    <div class="message legible">
      <h2>No posters yet</h2>
      <p>Drop images into <code>posters/</code> and run <code>pnpm posters:sync</code>.</p>
    </div>
  {:else if !started}
    <div class="intro">
      <button class="start" onclick={start}>Start voting</button>
    </div>
  {:else if !pair}
    <div class="loader" aria-label="Loading"><i></i><i></i><i></i></div>
  {:else}
    <div class="headline">
      {#key phase === 'reveal' || phase === 'exit' ? `v${round}` : `p${round}`}
        {#if (phase === 'reveal' || phase === 'exit') && (result || error)}
          <p class="verdict legible">
            {verdict}
            {#if result}<span class="count">{result.total.toLocaleString()} vote{result.total === 1 ? '' : 's'} on this pair</span>{/if}
          </p>
        {/if}
      {/key}
    </div>

    {#key round}
      <div class="pair">
        {#each pair as poster, i (poster._id)}
          <button
            class="card side-{i}"
            class:chosen={chosen === i}
            class:rejected={chosen !== null && chosen !== i}
            disabled={phase !== 'choose'}
            onclick={() => vote(i)}
            aria-label="Vote for {poster.title}"
          >
            <div class="float">
              <div class="frame">
                <img
                  src={posterSrc(poster.image)}
                  alt={poster.title}
                  draggable="false"
                />
                {#if result}
                  <div class="bar"><i style="width: {result.pct[i]}%"></i></div>
                {/if}
              </div>
              {#if result}
                <div class="sticker" class:winner={result.pct[i] >= result.pct[1 - i]}>
                  <strong><CountUp value={result.pct[i]} duration={1100} suffix="%" /></strong>
                  <small>{chosen === i ? 'your pick' : 'of voters'}</small>
                </div>
              {/if}
              <div class="caption legible">{poster.title}</div>
            </div>
            {#if chosen === i}
              <div class="sparks" aria-hidden="true">
                {#each sparks as s}
                  <span
                    style="--a:{s.angle}deg; --d:{s.dist}px; --s:{s.size}px; --c:{s.color}; --delay:{s.delay}ms"
                  ></span>
                {/each}
              </div>
            {/if}
          </button>
          {#if i === 0}
            <div class="vs" aria-hidden="true"><span><Logo text="vs" px={1} /></span></div>
          {/if}
        {/each}
      </div>
    {/key}

    <div class="footer">
      {#if phase === 'choose'}
        <button class="ghost" onclick={skip}>Can’t decide? Skip →</button>
      {:else if phase === 'reveal' && (result || error)}
        <button class="ghost next" onclick={advance}>Next pair →</button>
      {/if}
    </div>
  {/if}
</section>

<style>
  .stage {
    --gap: clamp(20px, 5vw, 90px);
    /* Room a card needs beyond its 3:4 frame: caption, bob and tilt. */
    --extra: 80px;
    /* Sized from the pair row's height (cqh, see .pair) so the footer always fits on screen. */
    --w: min(34vw, calc((100cqh - var(--extra)) * 0.75), 440px);
    height: 100dvh;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    justify-items: center;
    align-items: center;
    padding: clamp(76px, 12dvh, 112px) 16px 24px;
    overflow: hidden;
  }

  /* ── Headline ─────────────────────────────── */
  .headline {
    align-self: end;
    min-height: 4.5em;
    display: grid;
    place-items: end center;
    text-align: center;
    padding-bottom: clamp(12px, 2.5dvh, 32px);
  }
  .verdict {
    margin: 0;
    padding: 0.25em 0.6em 0.35em;
    border-radius: 0.5em;
    font-size: clamp(22px, 3.4vw, 42px);
    font-weight: 700;
    letter-spacing: -0.03em;
    animation: pop-in 0.6s var(--spring) both;
  }
  .count {
    display: block;
    margin-top: 0.35em;
    font-size: 0.45em;
    font-weight: 500;
    letter-spacing: 0;
    color: var(--muted);
  }
  @keyframes pop-in {
    from {
      opacity: 0;
      transform: scale(0.7) translateY(10px);
    }
  }

  /* ── Pair layout ──────────────────────────── */
  .pair {
    /* Fills the middle row; its height drives --w via cqh. */
    container-type: size;
    align-self: stretch;
    justify-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--gap);
    position: relative;
  }

  .card {
    --rot: -3deg;
    --fx: calc(50% + var(--gap) / 2);
    --fy: 0px;
    --out-x: -60vw;
    position: relative;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    transform: rotate(var(--rot));
    animation: fly-in 1s var(--spring) both;
    -webkit-tap-highlight-color: transparent;
  }
  .card:disabled {
    cursor: default;
  }
  .side-1 {
    --rot: 3deg;
    --fx: calc(-50% - var(--gap) / 2);
    --out-x: 60vw;
    animation-delay: 0.08s;
  }

  @keyframes fly-in {
    0% {
      opacity: 0;
      transform: translate(var(--fx), var(--fy)) scale(0.1) rotate(calc(var(--rot) * -8));
    }
    30% {
      opacity: 1;
    }
    100% {
      transform: translate(0, 0) scale(1) rotate(var(--rot));
    }
  }

  /* Exit: the pick soars away, the other shrinks back into the centre. */
  [data-phase='exit'] .card {
    animation: sink 0.6s var(--smooth) forwards;
  }
  [data-phase='exit'] .card.chosen {
    animation: soar 0.7s cubic-bezier(0.6, -0.3, 0.7, 0.4) forwards;
  }
  [data-phase='exit'] .card:not(.chosen):not(.rejected) {
    animation: fling 0.6s cubic-bezier(0.6, -0.3, 0.7, 0.4) forwards;
  }
  @keyframes soar {
    to {
      transform: translate(0, -120vh) rotate(calc(var(--rot) * -6)) scale(1.1);
    }
  }
  @keyframes sink {
    to {
      opacity: 0;
      transform: translate(var(--fx), var(--fy)) scale(0.1) rotate(calc(var(--rot) * 8));
    }
  }
  @keyframes fling {
    to {
      opacity: 0;
      transform: translate(var(--out-x), 10vh) rotate(calc(var(--rot) * 10));
    }
  }

  .float {
    position: relative;
    animation: bob 5.5s ease-in-out infinite;
  }
  .side-1 .float {
    animation-delay: -2.7s;
  }
  @keyframes bob {
    50% {
      transform: translateY(-10px) rotate(0.6deg);
    }
  }

  .frame {
    position: relative;
    width: var(--w);
    aspect-ratio: 3 / 4;
    --pad: clamp(6px, 0.9vw, 12px);
    padding: var(--pad);
    background: var(--card);
    border-radius: 6px;
    box-shadow:
      0 2px 4px rgba(31, 26, 36, 0.06),
      0 20px 50px -12px rgba(31, 26, 36, 0.35);
    overflow: hidden;
    transition:
      transform 0.45s var(--spring),
      box-shadow 0.45s var(--smooth),
      filter 0.5s var(--smooth),
      opacity 0.5s var(--smooth);
  }
  .frame img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 2px;
    user-select: none;
    background: #f3ebe2;
  }

  [data-phase='choose'] .card:hover .frame,
  [data-phase='choose'] .card:focus-visible .frame {
    transform: scale(1.045) rotate(calc(var(--rot) * -1));
    box-shadow:
      0 0 0 5px var(--red),
      0 30px 70px -14px rgba(255, 59, 92, 0.55);
  }
  .card:focus-visible {
    outline: none;
  }
  [data-phase='choose'] .card:active .frame {
    transform: scale(0.97);
  }

  .card.chosen .frame {
    transform: scale(1.06) rotate(calc(var(--rot) * -1));
    box-shadow:
      0 0 0 7px var(--red),
      0 30px 80px -10px rgba(255, 59, 92, 0.6);
  }
  .card.rejected .frame {
    transform: scale(0.9);
    filter: grayscale(0.85) contrast(0.75) brightness(1.08);
  }

  .caption {
    display: inline-block;
    margin-top: 14px;
    font-weight: 700;
    font-size: clamp(14px, 1.3vw, 18px);
    letter-spacing: -0.01em;
    opacity: 0;
    animation: fade-up 0.5s var(--smooth) 0.9s forwards;
  }
  @keyframes fade-up {
    from {
      transform: translateY(8px);
    }
    to {
      opacity: 1;
    }
  }

  /* ── Results ─────────────────────────────── */
  /* Floats over the bottom of the poster, clear of the frame's border. */
  .bar {
    --inset: calc(var(--pad) + clamp(8px, 1.2vw, 16px));
    position: absolute;
    left: var(--inset);
    right: var(--inset);
    bottom: var(--inset);
    height: 10px;
    padding: 2px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 4px 14px -4px rgba(31, 26, 36, 0.45);
    backdrop-filter: blur(4px);
  }
  .bar i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--red);
    animation: grow 1.1s var(--smooth) both;
    transform-origin: left;
  }
  @keyframes grow {
    from {
      transform: scaleX(0);
    }
  }

  .sticker {
    position: absolute;
    top: -22px;
    right: -22px;
    width: clamp(78px, 9vw, 118px);
    aspect-ratio: 1;
    border-radius: 50%;
    display: grid;
    place-content: center;
    text-align: center;
    background: var(--ink);
    color: var(--paper);
    box-shadow: 0 10px 30px -8px rgba(31, 26, 36, 0.5);
    animation: sticker 0.8s var(--spring) both 0.1s;
    z-index: 2;
  }
  .side-0 .sticker {
    right: auto;
    left: -22px;
  }
  .sticker.winner {
    background: var(--red);
  }
  .sticker strong {
    font-size: clamp(22px, 2.6vw, 36px);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .sticker small {
    font-size: clamp(9px, 0.9vw, 12px);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.85;
  }
  @keyframes sticker {
    from {
      transform: scale(0) rotate(-120deg);
    }
    to {
      transform: scale(1) rotate(-8deg);
    }
  }

  .sparks {
    position: absolute;
    left: 50%;
    top: 50%;
    pointer-events: none;
    z-index: 3;
  }
  .sparks span {
    position: absolute;
    width: var(--s);
    height: var(--s);
    margin: calc(var(--s) / -2);
    border-radius: 50%;
    background: var(--c);
    animation: spark 0.9s var(--smooth) var(--delay) both;
  }
  @keyframes spark {
    0% {
      transform: rotate(var(--a)) translateX(0) scale(0.2);
      opacity: 1;
    }
    70% {
      opacity: 1;
    }
    100% {
      transform: rotate(var(--a)) translateX(calc(var(--w) * 0.35 + var(--d))) scale(0);
      opacity: 0;
    }
  }

  /* ── "vs" badge ───────────────────────────── */
  .vs {
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    z-index: 4;
    pointer-events: none;
  }
  .vs span {
    display: grid;
    place-content: center;
    width: clamp(48px, 5vw, 68px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--yellow);
    font-weight: 800;
    font-size: clamp(16px, 1.6vw, 22px);
    box-shadow: 0 8px 24px -6px rgba(255, 176, 0, 0.7);
    animation:
      vs-in 0.7s var(--spring) 0.55s both,
      wobble 3s ease-in-out 1.3s infinite;
  }
  [data-phase='reveal'] .vs span,
  [data-phase='exit'] .vs span {
    animation: vs-out 0.5s var(--smooth) forwards;
  }
  @keyframes vs-in {
    from {
      transform: scale(0) rotate(-180deg);
    }
  }
  @keyframes wobble {
    50% {
      transform: scale(1.12) rotate(10deg);
    }
  }
  @keyframes vs-out {
    to {
      transform: scale(0) rotate(180deg);
    }
  }

  /* ── Footer / misc ────────────────────────── */
  .footer {
    align-self: start;
    min-height: 48px;
    padding-top: clamp(12px, 2.5dvh, 32px);
  }
  .ghost {
    border: 2px solid var(--ink);
    background: rgba(255, 247, 238, 0.7);
    backdrop-filter: blur(6px);
    padding: 0.6em 1.2em;
    border-radius: 999px;
    font-weight: 700;
    cursor: pointer;
    animation: pop-in 0.5s var(--spring) both 0.3s;
    transition: transform 0.25s var(--spring), background 0.2s, color 0.2s;
  }
  .ghost:hover {
    transform: scale(1.06) rotate(-2deg);
    background: var(--ink);
    color: var(--paper);
  }
  .ghost.next {
    background: var(--red);
    border-color: var(--red);
    color: white;
  }

  .intro {
    grid-row: 2;
  }
  .start {
    padding: 0.55em 1.3em 0.6em;
    border: 0;
    border-radius: 999px;
    background: var(--red);
    color: white;
    font: inherit;
    font-size: clamp(26px, 4vw, 44px);
    font-weight: 800;
    letter-spacing: -0.03em;
    cursor: pointer;
    box-shadow: 0 20px 50px -12px rgba(255, 59, 92, 0.6);
    animation:
      pop-in 0.6s var(--spring) both,
      wobble 3s ease-in-out 0.8s infinite;
    transition: background 0.2s;
  }
  .start:hover {
    background: var(--ink);
  }
  .start:focus-visible {
    outline: 4px solid var(--yellow);
    outline-offset: 4px;
  }

  .message {
    grid-row: 2;
    padding: 24px 32px;
    border-radius: 24px;
    text-align: center;
    max-width: 36ch;
    animation: pop-in 0.6s var(--spring) both;
  }
  .message h2 {
    font-size: clamp(28px, 4vw, 48px);
    margin: 0 0 0.3em;
    letter-spacing: -0.03em;
  }
  code {
    background: rgba(31, 26, 36, 0.07);
    padding: 0.1em 0.4em;
    border-radius: 6px;
  }

  .loader {
    grid-row: 2;
    display: flex;
    gap: 14px;
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

  /* Tall, narrow screens: stack the posters and fly vertically. */
  @media (max-aspect-ratio: 4 / 5) {
    .stage {
      --gap: clamp(28px, 5dvh, 56px);
      /* Two stacked cards, no captions: split the row height between them. */
      --extra: 40px;
      --w: min(64vw, calc(((100cqh - var(--gap)) / 2 - var(--extra)) * 0.75), 420px);
      padding-top: 96px;
    }
    .pair {
      flex-direction: column;
    }
    .card {
      --fx: 0px;
      --fy: calc(50% + var(--gap) / 2);
      --out-x: -80vw;
    }
    .side-1 {
      --fy: calc(-50% - var(--gap) / 2);
      --out-x: 80vw;
    }
    .caption {
      display: none;
    }
    .headline {
      min-height: 3.2em;
    }
  }
</style>
