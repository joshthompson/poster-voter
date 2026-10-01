<script lang="ts">
  import Page from '$lib/components/layout/Page.svelte';
  import PageTitle from '$lib/components/ui/PageTitle.svelte';
  import DesignerChoice from '$lib/features/designer/DesignerChoice.svelte';
  import LanguagePicker from '$lib/features/settings/LanguagePicker.svelte';
  import SettingsSection from '$lib/features/settings/SettingsSection.svelte';
  import VoteHistory from '$lib/features/settings/VoteHistory.svelte';
  import { i18n } from '$lib/i18n/index.svelte';
  import { track } from '$lib/services/analytics';

  const t = $derived(i18n.t.settings);
</script>

<svelte:head>
  <title>{t.title} · {i18n.t.brand}</title>
</svelte:head>

<Page>
  <PageTitle text={t.title} />
  <div class="sections">
    <SettingsSection title={i18n.t.designerQuestion} hint={t.designerHint} delay={0.12}>
      <DesignerChoice px={1} showAnswer onchoose={() => track('designer_question_answered', { placement: 'settings' })} />
    </SettingsSection>
    <SettingsSection title={t.language} delay={0.24}>
      <LanguagePicker />
    </SettingsSection>
    <SettingsSection title={t.yourVotes} delay={0.36}>
      <VoteHistory />
    </SettingsSection>
  </div>
</Page>

<style>
  .sections {
    display: grid;
    gap: 18px;
  }
</style>
