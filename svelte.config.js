import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // GitHub Pages: static files + 404.html fallback for client-side routing.
    adapter: adapter({ fallback: '404.html' }),
    // e.g. BASE_PATH=/poster-voter for https://<user>.github.io/poster-voter
    paths: { base: process.env.BASE_PATH ?? '' }
  }
};

export default config;
