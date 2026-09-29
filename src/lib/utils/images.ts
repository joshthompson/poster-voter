import { asset } from '$app/paths';

type AssetPath = Parameters<typeof asset>[0];

/** Resolve a poster image stored as a path relative to the site root (or an absolute URL). */
export function posterSrc(image: string) {
  if (/^https?:\/\//.test(image)) return image;
  return asset(`/${image}` as AssetPath);
}

/** Resolves once the image has loaded (or failed), so it can be shown without a flash. */
export function preload(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}
