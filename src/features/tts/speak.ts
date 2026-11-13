import { getSetting } from '../../lib/storage'

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// macOS novelty voices; their localized names differ, the voiceURI's last segment does not.
const NOVELTY = new Set(
  'Albert BadNews Bahh Bells Boing Bubbles Cellos Deranged GoodNews Hysterical Jester Organ Superstar Trinoids Whisper Wobble Zarvox Grandma Grandpa'.split(
    ' ',
  ),
)
const isNovelty = (v: SpeechSynthesisVoice) => NOVELTY.has(v.voiceURI.split('.').pop() ?? '')

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
