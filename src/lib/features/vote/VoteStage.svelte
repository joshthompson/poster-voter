<script lang="ts">
  import { useConvexClient } from 'convex-svelte';
  import { resolve } from '$app/paths';
  import { api } from '$convex/api';
  import Button from '$lib/components/ui/Button.svelte';
  import Loader from '$lib/components/ui/Loader.svelte';
  import MessageCard from '$lib/components/ui/MessageCard.svelte';
  import Pill from '$lib/components/ui/Pill.svelte';
  import PixelText from '$lib/components/pixel/PixelText.svelte';
  import DesignerChoice from '$lib/features/designer/DesignerChoice.svelte';
  import { designer } from '$lib/state/designer.svelte';
  import { sound } from '$lib/services/sound.svelte';
  import { location } from '$lib/services/location';
  import { usePosters } from '$lib/services/posters.svelte';
  import { voterId } from '$lib/services/voter';
  import { i18n } from '$lib/i18n/index.svelte';
  import PosterCard from './PosterCard.svelte';
  import VerdictBubble from './VerdictBubble.svelte';
  import VsBadge from './VsBadge.svelte';
  import { VoteSession } from './session.svelte';
  import { verdictFor } from './verdict';
  import type { Poster } from './types';

  // The voting screen: asks the designer question on a first visit, waits for a click to start
  // (which also starts the music), then shows pair after pair.

  const me = voterId();
  location(); // start the lookup now so it's ready by the first vote
  const client = useConvexClient();
  const posters = usePosters(() => undefined);
  // The pairs you've voted on, fetched once: the session remembers the ones you vote on from here.
  let myVotes = $state<{ keys: string[] | null; failed: boolean }>({ keys: null, failed: false });
  client.query(api.votes.mine, { voterId: me }).then(
    (keys) => (myVotes = { keys, failed: false }),
    (e) => {
      console.error(e);
      myVotes = { keys: [], failed: true };
    }
  );

  const list = $derived((posters.data ?? []) as Poster[]);
  const votedKeys = $derived(new Set(myVotes.keys ?? []));

  const session = new VoteSession({
    posters: () => list,
    votedKeys: () => votedKeys,
    cast: async (winner, loser) =>
      client.mutation(api.votes.cast, {
        winnerId: winner._id,
        loserId: loser._id,
        voterId: me,
        designer: designer.value ?? undefined,
        ...(await location())
      })
  });

  // Skip the start button if the music is already going, e.g. arriving via "Keep voting".
  let started = $state(sound.unlocked);

  $effect(() => {
    if (started && myVotes.keys) session.refresh();
  });

  function start() {
    sound.unlock();
    started = true;
  }

  function vote(i: number) {
    if (!session.canVote) return;
    sound.vote();
    session.vote(i);
  }

  function onKey(e: KeyboardEvent) {
    if (session.canVote) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') vote(0);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') vote(1);
    } else if (session.revealed && session.result && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      session.advance();
    }
  }

  const t = $derived(i18n.t.vote);
  const leaving = $derived(session.phase === 'exit');
  const showingResult = $derived(session.phase === 'reveal' || leaving);
  const verdict = $derived(
    showingResult
      ? verdictFor(t, { error: session.error, result: session.result, chosen: session.chosen, streak: session.streak })
      : ''
  );
</script>

<svelte:window onkeydown={onKey} />

<section class="stage">
  {#if posters.error}
    <MessageCard title={t.vaultError}><p>{posters.error.message}</p></MessageCard>
  {:else if !posters.isLoading && list.length < 2}
    <MessageCard title={t.noPosters}>
      <p>{t.noPostersBody[0]}<code>posters/</code>{t.noPostersBody[1]}<code>pnpm posters:sync</code>{t.noPostersBody[2]}</p>
    </MessageCard>
  {:else if designer.value === null}
    <div class="intro">
      <h2 class="question"><PixelText text={i18n.t.designerQuestion} /></h2>
      <DesignerChoice staggered onchoose={start} />
    </div>
  {:else if !started}
    <div class="intro">
      <span class="wobbly"><Button label={t.start} onclick={start} /></span>
    </div>
  {:else if session.phase === 'done'}
    <MessageCard title={t.doneTitle}>
      <p>{t.doneBody(session.totalPairs)}</p>
      <Pill variant="red" href={resolve('/results')}>{t.seeRankings}</Pill>
    </MessageCard>
  {:else if !session.pair}
    <Loader />
  {:else}
    {#key session.round}
      <div class="pair">
        {#each session.pair as poster, i (poster._id)}
          <PosterCard
            {poster}
            side={i === 0 ? 0 : 1}
            chosen={session.chosen === i}
            rejected={session.chosen !== null && session.chosen !== i}
            {leaving}
            disabled={session.phase !== 'choose'}
            share={session.result?.pct[i]}
            winner={session.result ? session.result.pct[i] >= session.result.pct[1 - i] : false}
            onclick={() => vote(i)}
          />
          {#if i === 0}<VsBadge hidden={showingResult} />{/if}
        {/each}
      </div>
    {/key}

    <div class="footer">
      {#if session.phase === 'choose'}
        <span class="appear"><Pill onclick={() => session.skip()}>{t.skip}</Pill></span>
      {:else if session.revealed}
        <span class="appear"><Pill variant="red" onclick={() => session.advance()}>{t.next}</Pill></span>
      {/if}
    </div>

    {#key session.round}
      {#if verdict}
        <VerdictBubble
          text={verdict}
          detail={session.result ? t.votesOnPair(session.result.total) : undefined}
          {leaving}
        />
      {/if}
    {/key}
  {/if}
</section>

<style>
  .stage {
    --gap: clamp(20px, 5vw, 90px);
    /* Room a card needs beyond its 3:4 frame: caption, bob and tilt. */
    --extra: 80px;
    /* Poster width, sized from the pair row's height (cqh, see .pair) so the footer always fits. */
    --w: min(34vw, calc((100cqh - var(--extra)) * 0.75), 440px);
    position: relative;
    height: 100dvh;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    justify-items: center;
    align-items: center;
    padding: clamp(76px, 12dvh, 112px) 16px 24px;
    overflow: hidden;
  }

  .pair {
    /* Fills the first row; its height drives --w via cqh. */
    container-type: size;
    align-self: stretch;
    justify-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--gap);
    position: relative;
  }

  .footer {
    align-self: start;
    min-height: 48px;
    padding-top: clamp(12px, 2.5dvh, 32px);
  }
  .appear {
    display: inline-block;
    animation: pop-in 0.5s var(--spring) both 0.3s;
  }

  .intro {
    display: grid;
    justify-items: center;
    gap: clamp(24px, 4dvh, 40px);
    text-align: center;
  }
  .question {
    margin: 0;
    animation: pop-in 0.6s var(--spring) both;
  }
  .wobbly {
    display: inline-block;
    animation:
      pop-in 0.6s var(--spring) both,
      nudge 3s ease-in-out 0.8s infinite;
  }
  /* A gentler wobble than the "vs" badge's; a wide button tilting 10° looks off. */
  @keyframes nudge {
    50% {
      transform: scale(1.04) rotate(-2deg);
    }
  }

  /* Tall, narrow screens: stack the posters. */
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
  }
</style>
