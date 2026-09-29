<script lang="ts">
  import VoteStage from '$lib/features/vote/VoteStage.svelte';
  import { i18n } from '$lib/i18n/index.svelte';
</script>

<svelte:head>
  <title>{i18n.t.brand}</title>
</svelte:head>

<VoteStage />
