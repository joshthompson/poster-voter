<script lang="ts">
  // A thin horizontal bar filled to `value` percent (0–100).
  // `fill` is any CSS background; the default runs yellow to red.

  let { value, fill = 'linear-gradient(90deg, var(--yellow), var(--red))' }: { value: number; fill?: string } =
    $props();
</script>

<div class="meter"><i style="width: {value}%; background: {fill}"></i></div>

<style>
  .meter {
    height: 8px;
    border-radius: 99px;
    background: rgba(31, 26, 36, 0.08);
    overflow: hidden;
  }
  i {
    display: block;
    height: 100%;
    border-radius: inherit;
    transform-origin: left;
    transition: width 0.8s var(--smooth);
    animation: fill 1.2s var(--smooth) both 0.4s;
  }
  @keyframes fill {
    from {
      transform: scaleX(0);
    }
  }
</style>
