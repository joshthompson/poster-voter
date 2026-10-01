<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import ButtonRow from '$lib/components/ui/ButtonRow.svelte';
  import { i18n, LANGUAGES, type Lang } from '$lib/i18n/index.svelte';
  import { track } from '$lib/services/analytics';

  // One button per language, each named in itself so it's findable whichever one is showing.

  const langs = Object.entries(LANGUAGES) as [Lang, (typeof LANGUAGES)[Lang]][];

  function choose(lang: Lang) {
    const previous = i18n.lang;
    if (lang === previous) return;
    i18n.set(lang);
    track('language_changed', { previous_language: previous });
  }
</script>

<ButtonRow>
  {#each langs as [lang, { name }]}
    <Button label={name} variant="ink" px={1} pressed={i18n.lang === lang} onclick={() => choose(lang)} />
  {/each}
</ButtonRow>
