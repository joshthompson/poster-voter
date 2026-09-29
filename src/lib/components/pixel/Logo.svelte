<script lang="ts">
  import { onMount } from 'svelte';
  import { glyphFor } from './glyphs';

  // Text (default "POSTER VOTE!") spelled out in the hand-drawn pixel letters (see ./glyphs).
  // Each letter drifts gently on its own path. Positions are snapped to whole device pixels
  // every frame so the pixel art is never resampled (no blur, no shimmer).
  // `px` fixes the screen pixels per art pixel; omit it to use the responsive default.

  let { text = 'POSTER VOTE!', px }: { text?: string; px?: number } = $props();

  // The text is fixed for the component's lifetime, so only its initial value is needed.
  const letters = $state(
    // svelte-ignore state_referenced_locally
    text.split('').map((char) => ({
      char,
      src: glyphFor(char),
      size: { w: 0, h: 0 }
    }))
  );

  let logo: HTMLElement;
  const imgs: HTMLImageElement[] = [];

  onMount(() => {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paths = letters.map(() => ({
      fx: 0.5 + Math.random() * 0.5,
      fy: 0.6 + Math.random() * 0.6,
      px: Math.random() * Math.PI * 2,
      py: Math.random() * Math.PI * 2
    }));
    let bases: { x: number; y: number }[] = [];
    let amplitude = 2;
    let frame = 0;

    function measure() {
      const artPx = parseFloat(getComputedStyle(logo).getPropertyValue('--px')) || 1;
      amplitude = artPx * 1.1;
      bases = imgs.map((img) => {
        if (!img) return { x: 0, y: 0 };
        img.style.translate = '0px 0px';
        const r = img.getBoundingClientRect();
        return { x: r.left, y: r.top };
      });
    }

    function tick(time: number) {
      const t = time / 1000;
      const dpr = window.devicePixelRatio || 1;
      const snap = (n: number) => Math.round(n * dpr) / dpr;
      imgs.forEach((img, i) => {
        if (!img || !bases[i]) return;
        const p = paths[i];
        const b = bases[i];
        const drift = reduceMotion ? 0 : amplitude;
        const x = snap(b.x + Math.sin(t * p.fx + p.px) * drift) - b.x;
        const y = snap(b.y + Math.sin(t * p.fy + p.py) * drift) - b.y;
        img.style.translate = `${x}px ${y}px`;
      });
      if (!reduceMotion) frame = requestAnimationFrame(tick);
    }

    // Re-measure whenever layout could shift the letters (resize, images loading).
    const observer = new ResizeObserver(() => {
      measure();
      if (reduceMotion) tick(0);
    });
    observer.observe(logo);
    window.addEventListener('resize', measure);
    measure();
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  });
</script>

<span class="logo" bind:this={logo} role="img" aria-label={text} style={px ? `--px: ${px}` : undefined}>
  {#each letters as l, i}
    {#if l.src}
      <img
        bind:this={imgs[i]}
        src={l.src}
        alt={l.char}
        aria-hidden="true"
        draggable="false"
        bind:naturalWidth={l.size.w}
        bind:naturalHeight={l.size.h}
        style="--nw:{l.size.w}; --nh:{l.size.h}"
      />
    {:else}
      <span class="space"></span>
    {/if}
  {/each}
</span>

<style>
  .logo {
    /* Screen pixels per art pixel. Keep it a whole number so pixels stay square and sharp. */
    --px: 2;
    display: inline-flex;
    align-items: flex-end;
    gap: calc(var(--px) * 1px);
    line-height: 0;
  }
  @media (max-width: 560px) {
    .logo {
      --px: 1;
    }
  }

  .space {
    width: calc(var(--px) * 8px);
  }

  img {
    display: block;
    width: calc(var(--nw) * var(--px) * 1px);
    height: calc(var(--nh) * var(--px) * 1px);
    image-rendering: crisp-edges;
    image-rendering: pixelated;
    user-select: none;
  }
</style>
