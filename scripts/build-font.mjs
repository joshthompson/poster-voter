#!/usr/bin/env node
// Build the Pixel Letters web font from the hand-drawn letters in src/lib/assets/chars/<set>/*.png
// into src/lib/assets/fonts/. Both outputs are committed:
//
//   pixel-letters.woff2  the font: every dark, opaque pixel of a drawing becomes a square of ink
//   pixel-letters.json   each character's advance and ink height in art pixels, for layout code
//
//   pnpm font   → rebuild after adding or changing a drawing (`pnpm build` and the deploy run it too)
//
// Name a drawing after its character ("a.png", "ж.png", "7.png"), or, for characters that
// filenames can't hold, after a name in NAMED ("question.png"). A letter also covers its capital.
// One em is 32 art pixels, which is one line of text; every drawing stands on the bottom edge.
// Letters are 1 art pixel apart and words 8, as they were when the letters were separate images.
// The same drawings always build the same bytes, so rebuilding never adds noise to the diff.

import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import opentype from 'opentype.js';
import { PNG } from 'pngjs';

const root = path.resolve(import.meta.dirname, '..');
const SRC = path.join(root, 'src/lib/assets/chars');
const OUT = path.join(root, 'src/lib/assets/fonts');
const FAMILY = 'Pixel Letters';
const UNIT = 32; // font units per art pixel
const EM = 32; // art pixels per em
const GAP = 1; // art pixels after each letter, part of its advance
const SPACE = 7; // advance of a space; with the gap before it, words are 8 art pixels apart
const CREATED = Date.UTC(2026, 8, 30) / 1000; // a fixed date keeps the output reproducible

// Characters that URLs, macOS or Windows won't take in a filename.
const NAMED = {
  percent: '%',
  question: '?',
  exclamation: '!',
  hash: '#',
  dot: '.',
  period: '.',
  comma: ',',
  slash: '/',
  backslash: '\\',
  colon: ':',
  asterisk: '*',
  quote: '"',
  lt: '<',
  gt: '>',
  pipe: '|'
};

async function readDrawings() {
  const files = (await fs.readdir(SRC, { recursive: true })).filter((f) => f.endsWith('.png')).sort();
  const drawings = new Map();
  for (const file of files) {
    // macOS can store filenames decomposed (й as и + combining breve), so compare in NFC.
    const name = path.basename(file, '.png').normalize('NFC');
    const char = NAMED[name] ?? name;
    if ([...char].length !== 1) throw new Error(`${file}: name it after a single character, or add its name to NAMED`);
    if (drawings.has(char)) throw new Error(`${file}: "${char}" is already drawn by ${drawings.get(char).file}`);
    drawings.set(char, { file, ...PNG.sync.read(await fs.readFile(path.join(SRC, file))) });
  }
  return drawings;
}

// Dark, opaque pixels are ink; anything else is background.
const isInk = (data, i) => data[i + 3] >= 128 && data[i] + data[i + 1] + data[i + 2] < 384;

// How far a drawing's ink reaches up from its bottom edge, in art pixels.
function inkHeight({ width, height, data }) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) if (isInk(data, (y * width + x) * 4)) return height - y;
  }
  return 0;
}

// The outline of a drawing's ink, as closed contours of corner points in art pixels (y up from the
// bottom edge). Every edge between ink and background runs with the ink on its left, so outer
// contours go anticlockwise and holes clockwise. Where two ink pixels touch only at a corner the
// contour turns left, which keeps them as separate shapes.
function trace({ width: w, height: h, data }) {
  const ink = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const i = ((h - 1 - y) * w + x) * 4;
    return isInk(data, i);
  };
  const edges = new Map(); // "x,y" → directions of the edges leaving that corner
  const add = (x, y, dx, dy) => {
    const key = `${x},${y}`;
    if (!edges.has(key)) edges.set(key, []);
    edges.get(key).push([dx, dy]);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!ink(x, y)) continue;
      if (!ink(x, y - 1)) add(x, y, 1, 0);
      if (!ink(x + 1, y)) add(x + 1, y, 0, 1);
      if (!ink(x, y + 1)) add(x + 1, y + 1, -1, 0);
      if (!ink(x - 1, y)) add(x, y + 1, 0, -1);
    }
  }

  const contours = [];
  for (const [start, leaving] of edges) {
    while (leaving.length) {
      const [x0, y0] = start.split(',').map(Number);
      const [dx0, dy0] = leaving.pop();
      let [x, y, dx, dy] = [x0 + dx0, y0 + dy0, dx0, dy0];
      const points = [];
      while (x !== x0 || y !== y0) {
        const options = edges.get(`${x},${y}`);
        const turn = [[-dy, dx], [dx, dy], [dy, -dx]] // left, straight on, right
          .map(([tx, ty]) => options.findIndex(([ex, ey]) => ex === tx && ey === ty))
          .find((i) => i >= 0);
        const [nx, ny] = options.splice(turn, 1)[0];
        if (nx !== dx || ny !== dy) points.push([x, y]);
        [dx, dy] = [nx, ny];
        [x, y] = [x + dx, y + dy];
      }
      if (dx !== dx0 || dy !== dy0) points.push([x0, y0]);
      contours.push(points);
    }
  }
  return contours;
}

function makeGlyph(char, codePoints, drawing) {
  const outline = new opentype.Path();
  for (const points of trace(drawing)) {
    points.forEach(([x, y], i) => (i ? outline.lineTo(x * UNIT, y * UNIT) : outline.moveTo(x * UNIT, y * UNIT)));
    outline.close();
  }
  return new opentype.Glyph({
    name: `uni${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
    unicode: codePoints[0],
    unicodes: codePoints,
    advanceWidth: (drawing.width + GAP) * UNIT,
    path: outline
  });
}

// opentype.js stamps `modified` with the current time. Copy the fixed `created` time over it,
// then redo the checksums that covers.
function stampModified(otf) {
  const sum = (from, to) => {
    let s = 0;
    for (let i = from; i < to; i += 4) s = (s + otf.readUInt32BE(i)) >>> 0;
    return s;
  };
  for (let record = 12; record < 12 + 16 * otf.readUInt16BE(4); record += 16) {
    if (otf.toString('latin1', record, record + 4) !== 'head') continue;
    const head = otf.readUInt32BE(record + 8);
    otf.copy(otf, head + 28, head + 20, head + 28);
    otf.writeUInt32BE(0, head + 8);
    otf.writeUInt32BE(sum(head, head + 56), record + 4); // the 54-byte table, zero-padded
    otf.writeUInt32BE((0xb1b0afba - sum(0, otf.length)) >>> 0, head + 8);
  }
}

// WOFF2 with no table transforms: the header, a table directory, then every table in one Brotli
// stream. Tags with an index here are written as that index; any other tag is spelled out.
const KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF '];

function toWoff2(otf) {
  const tables = Array.from({ length: otf.readUInt16BE(4) }, (_, i) => {
    const record = 12 + 16 * i;
    const offset = otf.readUInt32BE(record + 8);
    return { tag: otf.toString('latin1', record, record + 4), data: otf.subarray(offset, offset + otf.readUInt32BE(record + 12)) };
  });
  const base128 = (n) => {
    const bytes = [n & 0x7f];
    while ((n = Math.floor(n / 128))) bytes.unshift(0x80 | (n & 0x7f));
    return bytes;
  };
  const directory = Buffer.from(
    tables.flatMap(({ tag, data }) => {
      const known = KNOWN_TAGS.indexOf(tag);
      return [...(known >= 0 ? [known] : [63, ...Buffer.from(tag, 'latin1')]), ...base128(data.length)];
    })
  );
  const stream = Buffer.concat(tables.map((t) => t.data));
  const compressed = zlib.brotliCompressSync(stream, {
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_FONT,
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: stream.length
    }
  });
  const length = Math.ceil((48 + directory.length + compressed.length) / 4) * 4;
  const header = Buffer.alloc(48);
  header.write('wOF2', 0, 'latin1');
  header.write('OTTO', 4, 'latin1'); // CFF outlines
  header.writeUInt32BE(length, 8);
  header.writeUInt16BE(tables.length, 12);
  header.writeUInt32BE(12 + 16 * tables.length + tables.reduce((n, t) => n + Math.ceil(t.data.length / 4) * 4, 0), 16);
  header.writeUInt32BE(compressed.length, 20);
  header.writeUInt16BE(1, 24); // font version 1.0
  return Buffer.concat([header, directory, compressed], length);
}

const drawings = await readDrawings();
const space = { advance: SPACE, height: 0 };
const metrics = { ' ': space, '\u00a0': space };
const glyphs = [
  new opentype.Glyph({ name: '.notdef', advanceWidth: SPACE * UNIT, path: new opentype.Path() }),
  new opentype.Glyph({ name: 'space', unicode: 0x20, unicodes: [0x20, 0xa0], advanceWidth: SPACE * UNIT, path: new opentype.Path() })
];
let tallest = 0;
for (const [char, drawing] of [...drawings].sort(([a], [b]) => a.codePointAt(0) - b.codePointAt(0))) {
  // The character itself, then its other case unless that has a drawing of its own.
  const chars = [...new Set([char, char.toUpperCase(), char.toLowerCase()])].filter(
    (c) => [...c].length === 1 && (c === char || !drawings.has(c))
  );
  for (const c of chars) metrics[c] = { advance: drawing.width + GAP, height: inkHeight(drawing) };
  glyphs.push(makeGlyph(char, chars.map((c) => c.codePointAt(0)), drawing));
  tallest = Math.max(tallest, drawing.height);
}

const font = new opentype.Font({
  familyName: FAMILY,
  styleName: 'Regular',
  unitsPerEm: EM * UNIT,
  ascender: EM * UNIT,
  descender: 0,
  createdTimestamp: CREATED,
  fsSelection: 0x40 | 0x80, // regular; use the ascender and descender below on Windows too
  glyphs,
  // Version 4 defines that Windows flag. The Windows ascent leaves room for drawings taller than a
  // line, so Windows doesn't clip them.
  tables: { os2: { version: 4, usWinAscent: Math.max(EM, tallest) * UNIT, usWinDescent: 0 } }
});
const otf = Buffer.from(font.toArrayBuffer());
stampModified(otf);
const woff2 = toWoff2(otf);

await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, 'pixel-letters.woff2'), woff2);
// One character per line, with the invisible non-breaking space spelled out.
const jsonKey = (c) => JSON.stringify(c).replace('\u00a0', '\\u00a0');
const entries = Object.entries(metrics).map(([c, m]) => `  ${jsonKey(c)}: ${JSON.stringify(m)}`);
await fs.writeFile(path.join(OUT, 'pixel-letters.json'), `{\n${entries.join(',\n')}\n}\n`);
console.log(
  `${FAMILY}: ${drawings.size} drawings, ${entries.length} characters, ` +
    `pixel-letters.woff2 ${(woff2.length / 1024).toFixed(1)} KB`
);
if (tallest > EM) console.warn(`  ! the tallest drawing is ${tallest} art px, taller than a line (${EM}); it will overlap the line above`);
