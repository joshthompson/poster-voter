<script lang="ts">
  import { glyphFor } from './glyphs';

  // Text spelled out in the hand-drawn pixel letters (see ./glyphs). Characters without a
  // letter image (e.g. "?") fall back to the site font at the same height.
  // `px` is screen pixels per art pixel; keep it whole so the pixels stay sharp.
  // `color` recolours the letters (any CSS colour, e.g. "white" or "var(--red)");
  // leave it out to draw the letter images as they are.
  // Lines wrap at spaces; use a non-breaking space (\u00a0) to keep words together.
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

  const style = $derived([px && `--px: ${px}`, color && `--color: ${color}`].filter(Boolean).join('; '));
</script>

<span class="pixel-text" class:tinted={color} style={style || undefined} role="img" aria-label={text}>
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
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-end;
    column-gap: calc(var(--px) * 8px);
    row-gap: calc(var(--px) * 4px);
    line-height: 0;
    vertical-align: bottom;
  }
  @media (max-width: 560px) {
    .pixel-text {
      --px: var(--text-px-sm, 1);
    }
  }

  .word {
    display: inline-flex;
    align-items: flex-end;
    gap: calc(var(--px) * 1px);
    white-space: nowrap;
  }

  .glyph {
    display: block;
    width: calc(var(--nw) * var(--px) * 1px);
    height: calc(var(--nh) * var(--px) * 1px);
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
    width: calc(var(--px) * 6px);
  }

  .fallback {
    font-size: calc(var(--px) * 30px);
    font-weight: 800;
    line-height: 0.9;
    color: var(--color, var(--ink));
  }
</style>
