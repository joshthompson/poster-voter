// Whether this tab has been in the background for a while. Live queries skip themselves while
// it has, so a tab left open isn't sent every update; they catch up as soon as it's shown again.
// A short wait first, so flicking between tabs doesn't unsubscribe and refetch each time.

const AWAY_AFTER_MS = 60_000;

class Visibility {
  away = $state(false);
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      clearTimeout(this.#timer);
      if (document.visibilityState === 'hidden') this.#timer = setTimeout(() => (this.away = true), AWAY_AFTER_MS);
      else this.away = false;
    });
  }
}

export const visibility = new Visibility();
