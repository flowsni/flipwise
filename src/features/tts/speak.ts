import { getSetting } from '../../lib/storage'

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// macOS novelty voices. Safari's voiceURI ends with the English id; Chrome's voiceURI equals the
// localized name, so the name (before « (») is matched too.
// shortcut: English and Russian names only, other system languages keep these voices; add names on request.
const NOVELTY = new Set([
  ...['Albert', 'BadNews', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Deranged', 'GoodNews'],
  ...['Hysterical', 'Jester', 'Organ', 'Superstar', 'Trinoids', 'Whisper', 'Wobble', 'Zarvox'],
  ...['Grandma', 'Grandpa'],
  ...['Альберт', 'Бах', 'Виолончель', 'Воббл', 'Зарвокс', 'Колокольчик', 'Орган', 'Прыг-скок'],
  ...['Плохие новости', 'Хорошие новости', 'Пузырьки', 'Суперзвезда', 'Триноид', 'Шепот', 'Шутник'],
])
const isNovelty = (v: SpeechSynthesisVoice) =>
  [v.voiceURI.split('.').pop(), v.name.split(' (')[0]].some((n) => NOVELTY.has(n ?? ''))

export function voicesFor(lang: string): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return []
  const base = lang.toLowerCase()
  return speechSynthesis
    .getVoices()
    .filter((v) => !isNovelty(v))
    .filter((v) => v.lang.toLowerCase().replace('_', '-').split('-')[0] === base)
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = voicesFor(lang)
  const chosen = getSetting<Record<string, string>>('tts.voice', {})[lang]
  return (
    voices.find((v) => v.voiceURI === chosen) ??
    voices.find((v) => v.localService && /premium|enhanced|natural/i.test(v.name)) ??
    voices.find((v) => v.default) ??
    voices[0]
  )
}

/** Speaks text with a voice matching the language (Web Speech API). */
export function speak(text: string, lang: string): void {
  if (!ttsSupported() || !text.trim()) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/\[\[|\]\]/g, ''))
  u.lang = lang
  const voice = pickVoice(lang)
  if (voice) u.voice = voice
  u.rate = 0.95
  speechSynthesis.speak(u)
}
