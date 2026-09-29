<script lang="ts">
  import CountUp from '$lib/components/ui/CountUp.svelte';

  // The round "63% your pick" badge stuck on a poster's top corner after a vote.
  // Red for the side that won the pair.

  let { pct, label, winner, side }: { pct: number; label: string; winner: boolean; side: 'left' | 'right' } =
    $props();
</script>

<div class="sticker {side}" class:winner>
  <strong><CountUp value={pct} duration={1100} suffix="%" /></strong>
  <small>{label}</small>
</div>

<style>
  .sticker {
    position: absolute;
    top: -22px;
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
  .left {
    left: -22px;
  }
  .right {
    right: -22px;
  }
  .winner {
    background: var(--red);
  }
  strong {
    font-size: clamp(22px, 2.6vw, 36px);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  small {
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
</style>
