<script lang="ts">
  import PixelText from '$lib/PixelText.svelte';
  import { i18n } from '$lib/i18n.svelte';
</script>

<svelte:head>
  <title>{i18n.t.about.title} · {i18n.t.brand}</title>
</svelte:head>

<div class="page">
  <h1><PixelText text={i18n.t.about.title} color="var(--red)" /></h1>

  <section class="card">
    <p class="label">{i18n.t.about.madeBy}</p>
    <p class="names"><PixelText text={i18n.t.about.names} color="var(--ink)" /></p>
  </section>
</div>

<style>
  .page {
    max-width: 640px;
    margin: 0 auto;
    padding: clamp(120px, 18dvh, 170px) 16px 96px;
    text-align: center;
  }
  h1 {
    --text-px: 4;
    --text-px-sm: 2;
    /* Flex so a heading wider than the column overflows evenly on both sides. */
    display: flex;
    justify-content: center;
    margin: 0 0 clamp(28px, 5vw, 48px);
    animation: rise 0.8s var(--spring) both;
  }
  .card {
    padding: clamp(24px, 4vw, 40px);
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(10px);
    border-radius: 26px;
    box-shadow: 0 16px 40px -22px rgba(31, 26, 36, 0.45);
    animation: rise 0.8s var(--spring) 0.15s both;
  }
  .label {
    margin: 0 0 6px;
    color: var(--muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 13px;
  }
  .names {
    /* Half the usual pixel-text size. On phones that's half a CSS px per art px, which is
       still one whole device pixel on the 2x+ screens they have. */
    --text-px: 1;
    --text-px-sm: 0.5;
    margin: 0;
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.9);
    }
  }
</style>
