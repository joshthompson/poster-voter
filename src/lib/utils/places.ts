// Turning the two-letter country codes stored on votes into something to show.

/** The flag emoji for an ISO 3166 code ("SE" → 🇸🇪), built from regional indicator letters. */
export function flag(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return '🏳️';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** The country's name in `lang` ("SE" → "Sweden" / "Sverige" / "Швеция"), or the code if unknown. */
export function countryName(code: string, lang: string) {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
