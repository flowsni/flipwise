import { type ReactNode, useEffect, useRef, useState } from 'react'
import { type ThemeSetting, useThemeSetting } from '../../app/theme'
import { db } from '../../db/db'
import { useDeckLanguages } from '../../db/hooks'
import { Button, IconButton } from '../../design/Button'
import { Field, Input, Segmented, Select, useFieldId } from '../../design/Field'
import {
  IconCheck,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconPlay,
  IconUpload,
} from '../../design/icons'
import { Sheet } from '../../design/Sheet'
import { useToast } from '../../design/Toast'
import { t } from '../../i18n/ru'
import {
  type Backup,
  BackupError,
  backupFileName,
  exportAll,
  importBackup,
  parseBackup,
} from '../../lib/backup'
import { downloadFile, pickFile } from '../../lib/files'
import { languageName } from '../../lib/languages'
import { useSetting } from '../../lib/storage'
import { PROVIDERS, type ProviderId, providerInfo } from '../ai/catalog'
import { AiError } from '../ai/errors'
import { testConnection } from '../ai/examples'
import { useAiSettings } from '../ai/settings'
import { speak, ttsSupported, voicesFor } from '../tts/speak'

export function SettingsSheet({
  open,
  focusSection,
  onClose,
}: {
  open: boolean
  focusSection?: 'ai'
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={t.settings.title} wide>
      <div className="flex flex-col gap-8">
        <Appearance />
        <AiSection autoFocus={focusSection === 'ai'} />
        <SpeechSection />
        <DataSection />
        <p className="text-center text-xs text-ink-3">Flipwise {__APP_VERSION__}</p>
      </div>
    </Sheet>
  )
}

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h3 id={id} className="text-[0.8125rem] font-semibold tracking-wider text-ink-3 uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Appearance() {
  const [theme, setTheme] = useThemeSetting()
  return (
    <Section title={t.settings.appearance} id="settings-appearance">
      <Segmented<ThemeSetting>
        label={t.settings.theme}
        value={theme}
        onChange={setTheme}
        options={[
          { value: 'system', label: t.settings.themeSystem },
          { value: 'light', label: t.settings.themeLight },
          { value: 'dark', label: t.settings.themeDark },
        ]}
      />
    </Section>
  )
}

const CUSTOM = '__custom__'

function AiSection({ autoFocus }: { autoFocus: boolean }) {
  const ai = useAiSettings()
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [errorText, setErrorText] = useState('')
  const providerRef = useRef<HTMLSelectElement>(null)
  const ids = {
    provider: useFieldId('provider'),
    key: useFieldId('key'),
    model: useFieldId('model'),
    custom: useFieldId('custom'),
  }

  useEffect(() => {
    if (autoFocus) providerRef.current?.focus()
  }, [autoFocus])

  const provider = ai.provider
  const info = provider ? providerInfo(provider) : null
  const storedModel = provider ? (ai.models[provider] ?? '') : ''
  const isCustom = !!info && !!storedModel && !info.models.some((m) => m.id === storedModel)
  const [customMode, setCustomMode] = useState(isCustom)

  // Reset the model picker and check status when switching providers.
  // biome-ignore lint/correctness/useExhaustiveDependencies: provider is the trigger
  useEffect(() => {
    setCustomMode(isCustom)
    setStatus('idle')
  }, [provider, isCustom])

  const check = async () => {
    if (!provider) return
    setStatus('checking')
    try {
      await testConnection({ provider, apiKey: ai.key, model: ai.model })
      setStatus('ok')
    } catch (e) {
      const code = e instanceof AiError ? e.code : 'unknown'
      setErrorText(
        t.examples.errors[code as keyof typeof t.examples.errors] ?? t.examples.errors.unknown,
      )
      setStatus('error')
    }
  }

  return (
    <Section title={t.settings.ai} id="settings-ai">
      <Field id={ids.provider} label={t.settings.provider}>
        <Select
          ref={providerRef}
          id={ids.provider}
          value={provider ?? ''}
          onChange={(e) => ai.setProvider((e.target.value || null) as ProviderId | null)}
        >
          <option value="">—</option>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
      </Field>

      {provider && info && (
        <>
          <Field
            id={ids.key}
            label={t.settings.apiKey}
            hint={
              <a
                href={info.keyUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-2 hover:underline"
              >
                {t.settings.getKey} ↗
              </a>
            }
          >
            <div className="flex gap-2">
              <Input
                id={ids.key}
                type={showKey ? 'text' : 'password'}
                value={ai.keys[provider] ?? ''}
                onChange={(e) => {
                  ai.setKey(provider, e.target.value)
                  setStatus('idle')
                }}
                placeholder={info.keyPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-[0.95rem]"
              />
              <IconButton
                label={showKey ? t.settings.hideKey : t.settings.showKey}
                variant="soft"
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? <IconEyeOff /> : <IconEye />}
              </IconButton>
            </div>
          </Field>

          <Field id={ids.model} label={t.settings.model}>
            <Select
              id={ids.model}
              value={customMode ? CUSTOM : ai.model}
              onChange={(e) => {
                setStatus('idle')
                if (e.target.value === CUSTOM) {
                  setCustomMode(true)
                } else {
                  setCustomMode(false)
                  ai.setModel(provider, e.target.value)
                }
              }}
            >
              {info.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} — {m.note === 'cheap' ? t.settings.cheap : t.settings.strong}
                </option>
              ))}
              <option value={CUSTOM}>{t.settings.customModel}</option>
            </Select>
          </Field>
          {customMode && (
            <Input
              id={ids.custom}
              aria-label={t.settings.customModelPlaceholder}
              placeholder={t.settings.customModelPlaceholder}
              value={storedModel}
              onChange={(e) => ai.setModel(provider, e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-[0.95rem]"
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="raised" disabled={!ai.key || status === 'checking'} onClick={check}>
              {status === 'checking' ? t.settings.checking : t.settings.checkKey}
            </Button>
            <span aria-live="polite" className="text-[0.9375rem]">
              {status === 'ok' && (
                <span className="inline-flex items-center gap-1.5 font-medium text-good">
                  <IconCheck size={18} /> {t.settings.keyOk}
                </span>
              )}
              {status === 'error' && <span className="text-bad">{errorText}</span>}
            </span>
          </div>
          <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-2">{t.settings.keyHint}</p>
        </>
      )}
    </Section>
  )
}

function SpeechSection() {
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

const SAMPLE: Record<string, string> = {
  en: 'Hello! Nice to meet you.',
  ru: 'Привет! Рад знакомству.',
  de: 'Hallo! Schön, dich kennenzulernen.',
  fr: 'Bonjour ! Enchanté.',
  es: '¡Hola! Encantado de conocerte.',
  it: 'Ciao! Piacere di conoscerti.',
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
          onClick={() => speak(SAMPLE[lang] ?? 'Flipwise', lang)}
        >
          <IconPlay size={18} />
        </IconButton>
      </div>
    </Field>
  )
}

function DataSection() {
  const toast = useToast()
  const [pending, setPending] = useState<Backup | null>(null)

  const onExport = async () => {
    const backup = await exportAll(db)
    downloadFile(
      new File([JSON.stringify(backup, null, 2)], backupFileName(backup), {
        type: 'application/json',
      }),
    )
    toast.show({ message: t.settings.exported })
  }

  const onImport = async () => {
    const file = await pickFile('application/json,.json')
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      // A shared single deck is simply added; a full backup asks how to import.
      if (backup.kind === 'deck') {
        const n = await importBackup(db, backup, 'merge')
        toast.show({ message: t.settings.imported(n) })
      } else {
        setPending(backup)
      }
    } catch (e) {
      if (!(e instanceof BackupError)) console.error(e)
      toast.show({ message: t.settings.importError })
    }
  }

  const finish = async (mode: 'replace' | 'merge') => {
    if (!pending) return
    const n = await importBackup(db, pending, mode)
    setPending(null)
    toast.show({ message: t.settings.imported(n) })
  }

  return (
    <Section title={t.settings.data} id="settings-data">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="raised" size="lg" onClick={onExport}>
          <IconDownload size={20} />
          {t.settings.exportAll}
        </Button>
        <Button variant="raised" size="lg" onClick={onImport}>
          <IconUpload size={20} />
          {t.settings.importFile}
        </Button>
      </div>
      {pending && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <p className="font-medium">
            {t.settings.importMode}{' '}
            <span className="text-ink-2">({t.plural.decks(pending.decks.length)})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => finish('merge')}>
              {t.settings.importMerge}
            </Button>
            <Button variant="danger" onClick={() => finish('replace')}>
              {t.settings.importReplace}
            </Button>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {t.app.cancel}
            </Button>
          </div>
        </div>
      )}
      <p className="text-sm text-ink-2">{t.settings.storageNote}</p>
    </Section>
  )
}
