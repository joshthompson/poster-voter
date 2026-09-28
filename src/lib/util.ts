import { asset } from '$app/paths';

type AssetPath = Parameters<typeof asset>[0];

/** Resolve a poster image stored as a path relative to the site root (or an absolute URL). */
export function posterSrc(image: string) {
  if (/^https?:\/\//.test(image)) return image;
  return asset(`/${image}` as AssetPath);
}

/** Anonymous id so we can count distinct voters. */
export function voterId() {
  const KEY = 'poster-voter:id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}

/** Forget everything this site keeps in localStorage (voter id, designer answer, seen posters, mute). */
export function clearStorage() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('poster-voter:'))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing stored; fine.
  }
}

export function preload(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

/** Tween a number towards a target; returns a stop function. */
export function tween(from: number, to: number, ms: number, onUpdate: (n: number) => void) {
  const start = performance.now();
  let frame = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    onUpdate(from + (to - from) * eased);
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}
