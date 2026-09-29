<script lang="ts">
  import Page from '$lib/components/layout/Page.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageTitle from '$lib/components/ui/PageTitle.svelte';
  import PixelText from '$lib/components/pixel/PixelText.svelte';
  import { i18n } from '$lib/i18n/index.svelte';

  const t = $derived(i18n.t.about);
</script>

<svelte:head>
  <title>{t.title} · {i18n.t.brand}</title>
</svelte:head>

<Page>
  <PageTitle text={t.title} color="var(--red)" />
  <Card delay={0.15}>
    <div>
      <p class="label">{t.madeBy}</p>
      <p class="names"><PixelText text={t.names} color="var(--ink)" /></p>
    </div>
  </Card>
</Page>

<style>
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
</style>
