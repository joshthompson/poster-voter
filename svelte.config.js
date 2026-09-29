import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // GitHub Pages: static files + 404.html fallback for client-side routing.
    adapter: adapter({ fallback: '404.html' }),
    // Empty for the custom domain (postervote.com); e.g. BASE_PATH=/postervote for
    // https://<user>.github.io/postervote. A lone "/" (GitHub variables can't be empty) means root.
    paths: { base: (process.env.BASE_PATH ?? '').replace(/\/+$/, '') }
  }
};

export default config;
