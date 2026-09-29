<script lang="ts">
  import { i18n } from '$lib/i18n/index.svelte';
  import { posterSrc } from '$lib/utils/images';
  import ResultSticker from './ResultSticker.svelte';
  import Sparks from './Sparks.svelte';
  import type { Poster } from './types';

  // One poster to vote for. It flies in from the centre, tilts towards the pointer while
  // voting is open, and after a vote shows its share of the crowd. `side` 0 is left (or top),
  // 1 is right (or bottom). Sized by --w and spaced by --gap, both set by the stage.

  let {
    poster,
    side,
    chosen,
    rejected,
    leaving,
    disabled,
    share,
    winner,
    onclick
  }: {
    poster: Poster;
    side: 0 | 1;
    chosen: boolean;
    rejected: boolean;
    /** The pair is flying out. */
    leaving: boolean;
    disabled: boolean;
    /** This poster's share of the votes, once revealed. */
    share?: number;
    winner?: boolean;
    onclick: () => void;
  } = $props();
</script>

<button
  class="card side-{side}"
  class:chosen
  class:rejected
  class:leaving
  {disabled}
  {onclick}
  aria-label={i18n.t.vote.voteFor(poster.title)}
>
  <div class="float">
    <div class="frame">
      <img src={posterSrc(poster.image)} alt={poster.title} draggable="false" />
      {#if share !== undefined}
        <div class="bar"><i style="width: {share}%"></i></div>
      {/if}
    </div>
    {#if share !== undefined}
      <ResultSticker
        pct={share}
        winner={!!winner}
        label={chosen ? i18n.t.vote.yourPick : i18n.t.vote.ofVoters}
        side={side === 0 ? 'left' : 'right'}
      />
    {/if}
    <div class="caption legible">{poster.title}</div>
  </div>
  {#if chosen}<Sparks />{/if}
</button>

<style>
  .card {
    --rot: -3deg;
    /* Where it flies in from (the centre of the pair) and out to. */
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
  .card:focus-visible {
    outline: none;
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

  /* Leaving: the pick soars away, the other shrinks back into the centre; a skip flings both. */
  .leaving {
    animation: fling 0.6s cubic-bezier(0.6, -0.3, 0.7, 0.4) forwards;
  }
  .leaving.rejected {
    animation: sink 0.6s var(--smooth) forwards;
  }
  .leaving.chosen {
    animation: soar 0.7s cubic-bezier(0.6, -0.3, 0.7, 0.4) forwards;
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
    --pad: clamp(6px, 0.9vw, 12px);
    position: relative;
    width: var(--w);
    aspect-ratio: 3 / 4;
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
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 2px;
    user-select: none;
    background: #f3ebe2;
  }

  .card:not(:disabled):hover .frame,
  .card:not(:disabled):focus-visible .frame {
    transform: scale(1.045) rotate(calc(var(--rot) * -1));
    box-shadow:
      0 0 0 5px var(--red),
      0 30px 70px -14px rgba(255, 59, 92, 0.55);
  }
  .card:not(:disabled):active .frame {
    transform: scale(0.97);
  }
  .chosen .frame {
    transform: scale(1.06) rotate(calc(var(--rot) * -1));
    box-shadow:
      0 0 0 7px var(--red),
      0 30px 80px -10px rgba(255, 59, 92, 0.6);
  }
  .rejected .frame {
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

  /* The crowd's share, floating over the bottom of the poster clear of the frame's border. */
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
    transform-origin: left;
    animation: grow 1.1s var(--smooth) both;
  }
  @keyframes grow {
    from {
      transform: scaleX(0);
    }
  }

  /* Stacked on tall, narrow screens: fly vertically, and skip the captions. */
  @media (max-aspect-ratio: 4 / 5) {
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
  }
</style>
