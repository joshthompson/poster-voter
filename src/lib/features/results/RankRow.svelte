<script lang="ts">
  import type { Snippet } from 'svelte';
  import { posterSrc } from '$lib/utils/images';

  // One row of a ranked list: rank, thumbnail, title with `children` under it, and a big number
  // with a caption on the right. `top` colours the rank for the leaders.

  let {
    rank,
    image,
    title,
    value,
    caption,
    top = false,
    children
  }: {
    rank: number;
    image: string;
    title: string;
    value: string | number;
    caption: string;
    top?: boolean;
    children: Snippet;
  } = $props();
</script>

<div class="row">
  <span class="rank" class:top>{rank}</span>
  <img src={posterSrc(image)} alt="" loading="lazy" />
  <div class="info">
    <strong>{title}</strong>
    {@render children()}
  </div>
  <div class="nums">
    <span class="value">{value}</span>
    <span class="caption">{caption}</span>
  </div>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 44px 54px 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 10px 18px 10px 12px;
    background: var(--glass);
    backdrop-filter: blur(8px);
    border-radius: 18px;
    box-shadow: 0 8px 20px -16px rgba(31, 26, 36, 0.5);
    transition:
      transform 0.3s var(--spring),
      box-shadow 0.3s;
  }
  .row:hover {
    transform: scale(1.015) rotate(-0.4deg);
    box-shadow: 0 14px 30px -16px rgba(255, 59, 92, 0.5);
  }
  .rank {
    font-weight: 800;
    font-size: 22px;
    text-align: center;
    color: var(--muted);
  }
  .rank.top {
    color: var(--red);
  }
  img {
    width: 54px;
    height: 72px;
    object-fit: cover;
    border-radius: 6px;
  }
  .info {
    min-width: 0;
  }
  strong {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 8px;
  }
  .nums {
    text-align: right;
  }
  .value {
    display: block;
    font-weight: 800;
    font-size: 22px;
    letter-spacing: -0.03em;
  }
  .caption {
    color: var(--muted);
    font-size: 13px;
    white-space: nowrap;
  }

  @media (max-width: 560px) {
    .row {
      grid-template-columns: 30px 44px 1fr auto;
      gap: 10px;
      padding: 8px 12px 8px 8px;
    }
    img {
      width: 44px;
      height: 58px;
    }
    .rank,
    .value {
      font-size: 18px;
    }
  }
</style>
