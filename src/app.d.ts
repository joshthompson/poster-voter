// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Id } from '$convex/dataModel';

declare global {
  namespace App {
    interface PageState {
      /** The poster open in the rankings' detail modal, while its own page's URL is showing. */
      poster?: Id<'posters'>;
    }
  }
}

export {};
