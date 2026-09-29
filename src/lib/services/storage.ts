// Everything the site remembers lives in localStorage under "postervote:<key>".
// Storage can be missing or blocked (private mode, disabled cookies), so every call is safe:
// reads fall back to null and writes quietly do nothing.

const PREFIX = 'postervote:';

export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string) {
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch {
      // Not remembered this time; fine.
    }
  },

  getJSON<T>(key: string, fallback: T): T {
    try {
      const raw = this.get(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },

  setJSON(key: string, value: unknown) {
    this.set(key, JSON.stringify(value));
  },

  /** Forget everything the site keeps (voter id, designer answer, seen posters, sound, language). */
  clear() {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    } catch {
      // Nothing stored; fine.
    }
  }
};
