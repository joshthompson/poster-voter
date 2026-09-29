<script lang="ts">
  import { glyphFor } from './glyphs';

  // Text spelled out in the hand-drawn pixel letters (see ./glyphs). Characters without a
  // letter image (e.g. "?") fall back to the site font at the same height.
  // `px` is screen pixels per art pixel; keep it whole so the pixels stay sharp.
  // `color` recolours the letters (any CSS colour, e.g. "white" or "var(--red)");
  // leave it out to draw the letter images as they are.
  // Lines wrap at spaces; use a non-breaking space (\u00a0) to keep words together.
  // A word too wide for the screen shrinks the whole text to the largest whole px that fits.
  // Assistive tech sees one image labelled with the whole text (role="img" + aria-label), so a
  // heading or button containing it is named by the text, not read out letter by letter.

  let { text, px, color }: { text: string; px?: number; color?: string } = $props();

  const words = $derived(text.split(' ').map((word) => word.split('').map((char) => ({ char, src: glyphFor(char) }))));

  // Natural size of each letter image, filled in as they load.
  const sizes = $state<Record<string, { w: number; h: number }>>({});
  const measure = (src: string, e: Event) => {
    const img = e.currentTarget as HTMLImageElement;
    sizes[src] = { w: img.naturalWidth, h: img.naturalHeight };
  };

  // Width of the widest word in art pixels, once every letter has loaded (fallbacks are a guess).
  const FALLBACK_W = 18;
  const widest = $derived.by(() => {
    let max = 0;
    for (const word of words) {
      let w = Math.max(0, word.length - 1);
      for (const l of word) {
        if (!l.src) w += l.char === '\u00a0' ? 6 : FALLBACK_W;
        else if (sizes[l.src]) w += sizes[l.src].w;
        else return 0;
      }
      max = Math.max(max, w);
    }
    return max;
  });

  let el: HTMLElement;
  let room = $state(Infinity); // screen width left for the text
  let base = $state(0); // the --px the page asked for
  const measureRoom = () => {
    room = document.documentElement.clientWidth - 32;
    base = parseFloat(getComputedStyle(el).getPropertyValue('--px')) || 0;
  };
  $effect(measureRoom);

  const fit = $derived.by(() => {
    if (!widest || !base || widest * base <= room) return undefined;
    const f = room / widest;
    return f >= 1 ? Math.floor(f) : Math.max(0.25, Math.floor(f * 4) / 4);
  });

  const style = $derived(
    [px && `--px: ${px}`, fit && `--px-fit: ${fit}`, color && `--color: ${color}`].filter(Boolean).join('; ')
  );
</script>

<svelte:window onresize={measureRoom} />

<span bind:this={el} class="pixel-text" class:tinted={color} style={style || undefined} role="img" aria-label={text}>
  {#each words as word}
    <span class="word" aria-hidden="true">
      {#each word as l}
        {#if l.char === '\u00a0'}
          <span class="nbsp"></span>
        {:else if l.src}
          <!-- Tinted letters use the image as a mask over --color; the img still measures it. -->
          <span class="glyph" style="--nw:{sizes[l.src]?.w ?? 0}; --nh:{sizes[l.src]?.h ?? 0}; --src:url('{l.src}')">
            <img src={l.src} alt={l.char} draggable="false" onload={(e) => measure(l.src!, e)} />
          </span>
        {:else}
          <span class="fallback">{l.char}</span>
        {/if}
      {/each}
    </span>
  {/each}
</span>

<style>
  .pixel-text {
    /* A parent can set --text-px / --text-px-sm to size all the pixel text inside it. */
    --px: var(--text-px, 2);
    --s: var(--px-fit, var(--px));
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-end;
    column-gap: calc(var(--s) * 8px);
    row-gap: calc(var(--s) * 4px);
    line-height: 0;
    vertical-align: bottom;
  }
  @media (max-width: 560px) {
    .pixel-text {
      --px: var(--text-px-sm, 1);
      --s: var(--px-fit, var(--px));
    }
  }

  .word {
    display: inline-flex;
    align-items: flex-end;
    gap: calc(var(--s) * 1px);
    white-space: nowrap;
  }

  .glyph {
    display: block;
    width: calc(var(--nw) * var(--s) * 1px);
    height: calc(var(--nh) * var(--s) * 1px);
    image-rendering: crisp-edges;
    image-rendering: pixelated;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    image-rendering: inherit;
    user-select: none;
  }
  .tinted .glyph {
    background: var(--color);
    mask: var(--src) 0 0 / 100% 100% no-repeat;
  }
  .tinted img {
    opacity: 0;
  }

  .nbsp {
    /* Matches the gap between words, minus the letter gap either side of it. */
    width: calc(var(--s) * 6px);
  }

  .fallback {
    font-size: calc(var(--s) * 30px);
    font-weight: 800;
    line-height: 0.9;
    color: var(--color, var(--ink));
  }
</style>
