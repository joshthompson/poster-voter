import { storage } from '$lib/services/storage';
import { en } from './locales/en';
import { ru } from './locales/ru';
import { sv } from './locales/sv';

// The UI language: the visitor's choice from Settings (remembered), otherwise the
// first language their browser asks for that we have, otherwise English.
// Read text as `i18n.t.section.key`; it's reactive, so switching language updates everything.

export const LANGUAGES = {
  en: { name: 'English', messages: en },
  ru: { name: 'Русский', messages: ru },
  sv: { name: 'Svenska', messages: sv }
};

export type Lang = keyof typeof LANGUAGES;

const KEY = 'lang';
const isLang = (l: unknown): l is Lang => typeof l === 'string' && l in LANGUAGES;

function initial(): Lang {
  const saved = storage.get(KEY);
  if (isLang(saved)) return saved;
  const preferred = typeof navigator === 'undefined' ? [] : navigator.languages;
  return preferred.map((l) => l.split('-')[0].toLowerCase()).find(isLang) ?? 'en';
}

class I18n {
  lang = $state<Lang>(initial());

  constructor() {
    this.apply();
  }

  get t() {
    return LANGUAGES[this.lang].messages;
  }

  set(lang: Lang) {
    this.lang = lang;
    this.apply();
    storage.set(KEY, lang);
  }

  /** Format a number the way the current language writes it. */
  num(n: number, options?: Intl.NumberFormatOptions) {
    return n.toLocaleString(this.lang, options);
  }

  private apply() {
    if (typeof document !== 'undefined') document.documentElement.lang = this.lang;
  }
}

export const i18n = new I18n();
