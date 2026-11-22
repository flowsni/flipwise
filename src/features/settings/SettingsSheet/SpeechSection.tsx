import { useEffect, useState } from 'react'
import { useDeckLanguages } from '@/db'
import { Field, IconButton, IconPlay, Select, useFieldId } from '@/design'
import { speak, ttsSupported, voicesFor } from '@/features/tts/speak'
import { t } from '@/i18n/ru'
import { languageName, speechSample, useSetting } from '@/lib'
import { Section } from './Section'

export function SpeechSection() {
  const langs = useDeckLanguages()
  const [voices, setVoices] = useSetting<Record<string, string>>('tts.voice', {})
  const [, force] = useState(0)

  useEffect(() => {
    if (!ttsSupported()) return
    // Voices load asynchronously in Chrome.
    const onChange = () => force((n) => n + 1)
    speechSynthesis.addEventListener('voiceschanged', onChange)
    return () => speechSynthesis.removeEventListener('voiceschanged', onChange)
  }, [])

  if (!ttsSupported()) return null

  return (
    <Section title={t.settings.speech} id="settings-speech">
      {langs.length === 0 && <p className="text-ink-2">{t.settings.noVoices}</p>}
      {langs.map((lang) => (
        <VoiceRow
          key={lang}
          lang={lang}
          value={voices[lang] ?? ''}
          onChange={(v) => setVoices({ ...voices, [lang]: v })}
        />
      ))}
    </Section>
  )
}

function VoiceRow({
  lang,
  value,
  onChange,
}: {
  lang: string
  value: string
  onChange: (v: string) => void
}) {
  const id = useFieldId('voice')
  const list = voicesFor(lang)
  return (
    <Field id={id} label={t.settings.voiceFor(languageName(lang))}>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{t.settings.voiceAuto}</option>
            {list.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
              </option>
            ))}
          </Select>
        </div>
        <IconButton
          label={`${t.settings.test}: ${languageName(lang)}`}
          variant="soft"
          onClick={() => speak(speechSample(lang), lang)}
        >
          <IconPlay size={18} />
        </IconButton>
      </div>
    </Field>
  )
}
