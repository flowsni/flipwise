import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Field,
  IconButton,
  IconCheck,
  IconEye,
  IconEyeOff,
  Input,
  Select,
  useFieldId,
} from '@/design'
import { PROVIDERS, type ProviderId, providerInfo } from '@/features/ai/catalog'
import { useAiSettings } from '@/features/ai/settings'
import { t } from '@/i18n/ru'
import { Section } from './Section'
import { useKeyCheck } from './useKeyCheck'

const CUSTOM = '__custom__'

export function AiSection({ autoFocus }: { autoFocus: boolean }) {
  const ai = useAiSettings()
  const [showKey, setShowKey] = useState(false)
  const { status, errorText, check, reset } = useKeyCheck(ai)
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
    reset()
  }, [provider, isCustom])

  return (
    <Section title={t.settings.ai} id="settings-ai">
      <Field
        id={ids.provider}
        label={t.settings.provider}
        hint={provider ? undefined : t.settings.providerHint}
      >
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
                  reset()
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
                reset()
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
          <p className="rounded-xl bg-surface-2 p-3 text-[0.9375rem] text-ink-2">
            {t.settings.keyHint}
          </p>
        </>
      )}
    </Section>
  )
}
