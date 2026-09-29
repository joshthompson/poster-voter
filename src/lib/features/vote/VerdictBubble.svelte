<script lang="ts">
  // A big white circle with the post-vote verdict, floating over the stage so it never moves
  // the posters. Centred halfway between the middle and the bottom-right corner, kept on screen.

  let { text, detail, leaving = false }: { text: string; detail?: string; leaving?: boolean } = $props();
</script>

<p class="verdict" class:leaving>
  <span>{text}</span>
  {#if detail}<small>{detail}</small>{/if}
</p>

<style>
  .verdict {
    --size: clamp(190px, 21vw, 280px);
    --edge: 20px;
    position: absolute;
    left: min(75%, 100% - var(--size) / 2 - var(--edge));
    top: min(75%, 100% - var(--size) / 2 - var(--edge));
    z-index: 5;
    width: var(--size);
    height: var(--size);
    translate: -50% -50%;
    margin: 0;
    padding: calc(var(--size) * 0.16);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.5em;
    overflow: hidden;
    border-radius: 50%;
    text-align: center;
    background: white;
    color: var(--ink);
    font-size: calc(var(--size) * 0.085);
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
    box-shadow:
      0 2px 4px rgba(31, 26, 36, 0.06),
      0 24px 60px -18px rgba(31, 26, 36, 0.45);
    pointer-events: none;
    animation: bubble-in 0.7s var(--spring) both 0.25s;
  }
  @media (max-aspect-ratio: 4 / 5) {
    .verdict {
      --size: clamp(160px, 44vw, 220px);
      --edge: 12px;
    }
  }
  .leaving {
    animation: bubble-out 0.4s var(--smooth) forwards;
  }
  small {
    font-size: 0.6em;
    font-weight: 500;
    letter-spacing: 0;
    color: var(--muted);
  }
  @keyframes bubble-in {
    from {
      transform: scale(0) rotate(-30deg);
    }
    to {
      transform: scale(1) rotate(-6deg);
    }
  }
  @keyframes bubble-out {
    from {
      transform: scale(1) rotate(-6deg);
    }
    to {
      transform: scale(0) rotate(20deg);
      opacity: 0;
    }
  }
</style>
