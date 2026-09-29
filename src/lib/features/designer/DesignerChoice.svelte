<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import ButtonRow from '$lib/components/ui/ButtonRow.svelte';
  import { designer } from '$lib/state/designer.svelte';
  import { i18n } from '$lib/i18n/index.svelte';

  // Yes / No buttons for "Are you a designer?". Saves the answer, then calls `onchoose`.
  // `showAnswer` highlights the saved answer (for changing it later in Settings);
  // `staggered` pops the buttons in one after the other (for the first-visit question).

  let {
    px,
    showAnswer = false,
    staggered = false,
    onchoose
  }: { px?: number; showAnswer?: boolean; staggered?: boolean; onchoose?: (isDesigner: boolean) => void } =
    $props();

  const options = $derived([
    { value: true, label: i18n.t.yes },
    { value: false, label: i18n.t.no }
  ]);

  function choose(isDesigner: boolean) {
    designer.set(isDesigner);
    onchoose?.(isDesigner);
  }
</script>

<ButtonRow>
  {#each options as o, i}
    <span class:pop={staggered} style:--i={i + 1}>
      <Button
        label={o.label}
        variant="ink"
        {px}
        pressed={showAnswer ? designer.value === o.value : undefined}
        onclick={() => choose(o.value)}
      />
    </span>
  {/each}
</ButtonRow>

<style>
  .pop {
    display: inline-block;
    animation: pop-in 0.6s var(--spring) both;
    animation-delay: calc(var(--i) * 0.12s);
  }
</style>
