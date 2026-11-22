import type { RefObject } from 'react'
import { LEVELS, type Level } from '@/db'
import { Field, Input, Select, useFieldId } from '@/design'
import { t } from '@/i18n/ru'
import { LANGUAGES } from '@/lib'
import type { DeckMeta } from './useDeckMeta'

type Fields = Pick<DeckMeta, 'title' | 'description' | 'termLang' | 'defLang' | 'level'>

function LanguageSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (code: string) => void
}) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.name}
        </option>
      ))}
    </Select>
  )
}

/** Title, description, the two languages and the level of the deck. */
export function DeckMetaFields({
  meta,
  onChange,
  titleRef,
  autoFocusTitle,
}: {
  meta: DeckMeta
  onChange: (patch: Partial<Fields>) => void
  titleRef: RefObject<HTMLInputElement | null>
  autoFocusTitle: boolean
}) {
  const ids = {
    title: useFieldId('title'),
    description: useFieldId('description'),
    termLang: useFieldId('term-lang'),
    defLang: useFieldId('def-lang'),
    level: useFieldId('level'),
  }
  return (
    <section className="raised flex flex-col gap-4 rounded-card p-5">
      <Field
        id={ids.title}
        label={t.editor.title}
        hint={
          meta.titleError ? <span className="text-bad">{t.editor.titleRequired}</span> : undefined
        }
      >
        <Input
          ref={titleRef}
          id={ids.title}
          value={meta.title}
          autoFocus={autoFocusTitle}
          aria-invalid={meta.titleError}
          placeholder={t.editor.titlePlaceholder}
          enterKeyHint="next"
          onChange={(e) => onChange({ title: e.target.value })}
          className="text-lg font-semibold"
        />
      </Field>
      <Field id={ids.description} label={t.editor.description}>
        <Input
          id={ids.description}
          value={meta.description}
          placeholder={t.editor.descriptionPlaceholder}
          enterKeyHint="next"
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field id={ids.termLang} label={t.editor.termLang}>
          <LanguageSelect
            id={ids.termLang}
            value={meta.termLang}
            onChange={(termLang) => onChange({ termLang })}
          />
        </Field>
        <Field id={ids.defLang} label={t.editor.defLang}>
          <LanguageSelect
            id={ids.defLang}
            value={meta.defLang}
            onChange={(defLang) => onChange({ defLang })}
          />
        </Field>
        <div className="col-span-2 sm:col-span-1">
          <Field id={ids.level} label={t.editor.level}>
            <Select
              id={ids.level}
              value={meta.level}
              onChange={(e) => onChange({ level: e.target.value as Level })}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {t.levels[l]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </section>
  )
}
