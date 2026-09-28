// Hand-drawn pixel letters from ./assets/chars, keyed by character ("a", "7", "!", …).
// Drop in another PNG named after its character and it's picked up automatically.
// Characters that break URLs (%, ?, #, …) can't be filenames, so they use a name from NAMED.

const NAMED: Record<string, string> = {
  percent: '%',
  question: '?',
  hash: '#',
  period: '.',
  comma: ',',
  slash: '/'
};

const files = import.meta.glob('./assets/chars/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

export const glyphs: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => {
    const name = path.split('/').pop()!.replace('.png', '');
    return [NAMED[name] ?? name, url];
  })
);

export const glyphFor = (char: string): string | undefined => glyphs[char.toLowerCase()];
