export interface Language {
  code: string
  name: string
}

/** Languages offered for decks, with Russian names. */
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'Английский' },
  { code: 'ru', name: 'Русский' },
  { code: 'de', name: 'Немецкий' },
  { code: 'fr', name: 'Французский' },
  { code: 'es', name: 'Испанский' },
  { code: 'it', name: 'Итальянский' },
  { code: 'pt', name: 'Португальский' },
  { code: 'nl', name: 'Нидерландский' },
  { code: 'pl', name: 'Польский' },
  { code: 'uk', name: 'Украинский' },
  { code: 'tr', name: 'Турецкий' },
  { code: 'sr', name: 'Сербский' },
  { code: 'cs', name: 'Чешский' },
  { code: 'el', name: 'Греческий' },
  { code: 'ka', name: 'Грузинский' },
  { code: 'he', name: 'Иврит' },
  { code: 'ar', name: 'Арабский' },
  { code: 'zh', name: 'Китайский' },
  { code: 'ja', name: 'Японский' },
  { code: 'ko', name: 'Корейский' },
]

export function languageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code
}

/** English names are used inside AI prompts. */
const ENGLISH: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  pl: 'Polish',
  uk: 'Ukrainian',
  tr: 'Turkish',
  sr: 'Serbian',
  cs: 'Czech',
  el: 'Greek',
  ka: 'Georgian',
  he: 'Hebrew',
  ar: 'Arabic',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
}

export function englishLanguageName(code: string): string {
  return ENGLISH[code] ?? code
}
