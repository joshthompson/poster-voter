<script lang="ts">
  import shareIcon from '$lib/assets/share.png';
  import IconButton from '$lib/components/ui/IconButton.svelte';
  import Pill from '$lib/components/ui/Pill.svelte';
  import { i18n } from '$lib/i18n/index.svelte';
  import { withUtm } from './links';
  import { LinkSharer, type ShareOutcome } from './share.svelte';

  // Shares a poster's page (`href`, as posterHref gives it) through the device's share menu, or
  // copies the link where there isn't one, tagged as shared from a poster (see links.ts). A round
  // icon button, or with `labelled` a pill that says "Share". `onshare` hears how each share ended.

  let {
    href,
    title,
    labelled = false,
    onshare
  }: {
    href: string;
    title: string;
    labelled?: boolean;
    onshare?: (outcome: ShareOutcome) => void;
  } = $props();

  const sharer = new LinkSharer();
  let sharing = false;

  const t = $derived(i18n.t.share);

  async function share() {
    if (sharing) return;
    const url = withUtm(new URL(href, location.href).href, { source: 'poster_button', medium: 'share' });
    sharing = true;
    try {
      onshare?.(await sharer.share(url, title));
    } finally {
      sharing = false;
    }
  }
</script>

<span class="share">
  {#if labelled}
    <Pill variant="red" onclick={share}>
      <span class="labelled"><img src={shareIcon} alt="" width="24" height="24" />{t.label}</span>
    </Pill>
  {:else}
    <IconButton label={t.poster(title)} onclick={share}>
      <img src={shareIcon} alt="" width="24" height="24" />
    </IconButton>
  {/if}
  <span class="copied" class:shown={sharer.copied} role="status">{sharer.copied ? t.copied : ''}</span>
</span>

<style>
  .share {
    position: relative;
    display: inline-block;
  }
  /* The icon is drawn in black; turn it light to match the button's other icons. */
  img {
    display: block;
    image-rendering: pixelated;
    filter: invert(1);
  }
  .labelled {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  /* Taller than the text, so let it overhang rather than make the pill taller than its neighbours. */
  .labelled img {
    margin: -4px 0 -4px -4px;
  }
  .copied {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    padding: 4px 10px;
    border-radius: 99px;
    background: var(--ink);
    color: var(--paper);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transform: translate(-50%, -4px);
    transition:
      opacity 0.2s,
      transform 0.3s var(--spring);
  }
  .copied.shown {
    opacity: 1;
    transform: translate(-50%, 0);
  }
</style>
