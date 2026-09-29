/** A 0–1 rate as a whole percentage, e.g. 0.634 → "63%". */
export const pct = (rate: number) => `${Math.round(rate * 100)}%`;
