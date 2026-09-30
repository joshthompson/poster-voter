<script lang="ts">
  import Page from '$lib/components/layout/Page.svelte';
  import PosterView from '$lib/features/results/PosterView.svelte';
  import type { PageProps } from './$types';

  let { params }: PageProps = $props();
</script>

<!-- /poster/<competition slug>/<poster name>: one poster's own page, to link to. -->
<Page width="wide">
  <PosterView competition={params.competition} name={params.name} />
</Page>
