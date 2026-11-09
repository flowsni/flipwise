import { t } from '../i18n/ru'

export interface Language {
  code: string
  name: string
}

/** Languages offered for decks; display names live in i18n. */
export const LANGUAGES: Language[] = (Object.keys(t.languages) as (keyof typeof t.languages)[]).map(
  (code) => ({
    code,
    name: t.languages[code],
  }),
)

export function languageName(code: string): string {
  return t.languages[code as keyof typeof t.languages] ?? code
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

/** Short phrases in each language to preview a speech voice. */
const SPEECH_SAMPLES: Record<string, string> = {
  en: 'Hello! Nice to meet you.',
  ru: 'Привет! Рад знакомству.',
  de: 'Hallo! Schön, dich kennenzulernen.',
  fr: 'Bonjour ! Enchanté.',
  es: '¡Hola! Encantado de conocerte.',
  it: 'Ciao! Piacere di conoscerti.',
}

export function speechSample(code: string): string {
  return SPEECH_SAMPLES[code] ?? 'Flipwise'
}
