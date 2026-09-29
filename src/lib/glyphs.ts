// Hand-drawn pixel letters from ./assets/chars/<set>/ (latin, cyrillic, numbers, punctuation),
// keyed by character ("a", "ж", "7", "!", …). Drop another PNG named after its character into
// any set folder and it's picked up automatically.
// Characters that break URLs or filenames (%, ?, #, …) use a name from NAMED instead.

const NAMED: Record<string, string> = {
  percent: '%',
  question: '?',
  exclamation: '!',
  hash: '#',
  dot: '.',
  period: '.',
  comma: ',',
  slash: '/'
};

const files = import.meta.glob('./assets/chars/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

// macOS can store filenames decomposed (й as и + combining breve), so compare in NFC.
export const glyphs: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => {
    const name = path.split('/').pop()!.replace('.png', '').normalize('NFC');
    return [NAMED[name] ?? name, url];
  })
);

export const glyphFor = (char: string): string | undefined => glyphs[char.normalize('NFC').toLowerCase()];
