<script lang="ts">
  import { i18n } from '$lib/i18n/index.svelte';

  // Shown instead of the site when there's no Convex URL to talk to.

  const body = $derived(i18n.t.header.setupBody);
</script>

<div class="setup">
  <div class="panel legible">
    <h1>{i18n.t.header.setupTitle}</h1>
    <p>{body[0]}<code>.env.local</code>{body[1]}<code>pnpm dev</code>{body[2]}</p>
  </div>
</div>

<style>
  .setup {
    min-height: 100dvh;
    display: grid;
    place-content: center;
    padding: 16px;
  }
  .panel {
    text-align: center;
    padding: 28px 36px;
    border-radius: 24px;
  }
  h1 {
    font-size: clamp(36px, 6vw, 72px);
    margin: 0;
  }
</style>
