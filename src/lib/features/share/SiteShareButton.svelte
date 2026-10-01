<script lang="ts">
  import shareIcon from '$lib/assets/share-site.png';
  import CornerButton from '$lib/components/layout/CornerButton.svelte';
  import { i18n } from '$lib/i18n/index.svelte';
  import { track } from '$lib/services/analytics';
  import { SITE, withUtm } from './links';
  import { LinkSharer } from './share.svelte';

  // Shares the site itself from the bottom-right corner, mirroring the coffee button on the left.
  // Always the live site's address, wherever this is running, tagged as shared from here.

  const url = withUtm(SITE, { source: 'site_button', medium: 'share' });

  const sharer = new LinkSharer();
  let sharing = false;

  const t = $derived(i18n.t.share);

  async function share() {
    if (sharing) return;
    sharing = true;
    try {
      track('site_shared', { outcome: await sharer.share(url, i18n.t.brand) });
    } finally {
      sharing = false;
    }
  }
</script>

<CornerButton corner="right" label={sharer.copied ? t.copied : t.label} onclick={share}>
  <img src={shareIcon} alt="" width="24" height="24" />
</CornerButton>
<!-- The tooltip shows "Link copied"; this says it to screen readers. -->
<span class="status" role="status">{sharer.copied ? t.copied : ''}</span>

<style>
  img {
    display: block;
    image-rendering: pixelated;
  }
  .status {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
