import { afterEach, describe, expect, it, vi } from 'vitest'
import { voicesFor } from './speak'

afterEach(() => vi.unstubAllGlobals())

describe('voicesFor', () => {
  it('drops macOS novelty voices by voiceURI, whatever their localized name', () => {
    const voice = (name: string, voiceURI: string) => ({ name, voiceURI, lang: 'en-US' })
    vi.stubGlobal('window', { speechSynthesis: {} })
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [
        voice('Орган', 'com.apple.speech.synthesis.voice.Organ'),
        voice('Бабушка', 'com.apple.eloquence.en-US.Grandma'),
        voice('Пузырьки', 'Пузырьки'),
        voice('Grandpa (английский (США))', 'Grandpa (английский (США))'),
        voice('Bad News', 'Bad News'),
        voice('Samantha', 'com.apple.voice.compact.en-US.Samantha'),
      ],
    })
    expect(voicesFor('en').map((v) => v.name)).toEqual(['Samantha'])
  })
})
