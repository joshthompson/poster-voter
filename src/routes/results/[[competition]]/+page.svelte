<script lang="ts">
  import { page } from '$app/state';
  import Page from '$lib/components/layout/Page.svelte';
  import ResultsView from '$lib/features/results/ResultsView.svelte';
</script>

<!-- /results is the active competition; /results/<slug> is any competition, usually an archived one. -->
<Page width="wide">
  <ResultsView slug={page.params.competition} />
</Page>
