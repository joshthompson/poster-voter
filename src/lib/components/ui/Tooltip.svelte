<script lang="ts">
  import type { Snippet } from 'svelte';

  // A small black label that shows beside what it wraps while that's hovered or has keyboard focus.
  // It's only seen, not read out, so give the wrapped element the same text as its name (e.g. an
  // aria-label) for screen readers. `side` is where it shows: above by default.

  let {
    text,
    side = 'top',
    children
  }: { text: string; side?: 'top' | 'right' | 'bottom' | 'left'; children: Snippet } = $props();
</script>

<span class="tooltip">
  {@render children()}
  <span class="tip {side}" aria-hidden="true">{text}</span>
</span>

<style>
  .tooltip {
    position: relative;
    display: inline-block;
    vertical-align: top;
  }

  .tip {
    position: absolute;
    z-index: 20;
    padding: 6px 12px;
    border-radius: 99px;
    background: var(--ink);
    color: var(--paper);
    font-weight: 700;
    font-size: 14px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    /* Slides out a little from what it names: from --from to --at. */
    transform: var(--from);
    transition:
      opacity 0.2s,
      transform 0.25s var(--spring);
  }
  /* Global, as what it wraps belongs to the component that passed it in. */
  .tooltip:hover > .tip,
  .tooltip:has(:global(:focus-visible)) > .tip {
    opacity: 1;
    transform: var(--at);
  }

  .top {
    bottom: calc(100% + 12px);
    left: 50%;
    --at: translate(-50%, 0);
    --from: translate(-50%, 6px);
  }
  .bottom {
    top: calc(100% + 12px);
    left: 50%;
    --at: translate(-50%, 0);
    --from: translate(-50%, -6px);
  }
  .right {
    left: calc(100% + 12px);
    top: 50%;
    --at: translate(0, -50%);
    --from: translate(-6px, -50%);
  }
  .left {
    right: calc(100% + 12px);
    top: 50%;
    --at: translate(0, -50%);
    --from: translate(6px, -50%);
  }
</style>
