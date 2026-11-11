import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { NotFound } from '../../app/RouteError'
import { createDeck, getDeckCards, saveDeck } from '../../db/decks'
import { useDeck } from '../../db/hooks'
import { type Deck, LEVELS, type Level } from '../../db/types'
import { Button, IconButton } from '../../design/Button'
import { Field, Input, inputClass, Select, useFieldId } from '../../design/Field'
import { IconChevronLeft, IconGrip, IconPlus, IconUpload, IconX } from '../../design/icons'
import { useToast } from '../../design/Toast'
import { TopBar } from '../../design/TopBar'
import { t } from '../../i18n/ru'
import { findDuplicates } from '../../lib/duplicates'
import { newId } from '../../lib/ids'
import type { ParsedCard } from '../../lib/importParser'
import { LANGUAGES } from '../../lib/languages'
import { getSetting, setSetting } from '../../lib/storage'
import { ImportSheet } from './ImportSheet'

interface Row {
  key: string
  id?: string
  term: string
  definition: string
}

const emptyRow = (): Row => ({ key: newId(), term: '', definition: '' })

export function DeckEditor() {
  const { deckId } = useParams()
  const deck = useDeck(deckId)
  if (deckId && deck === null) return <NotFound />
  if (deckId && !deck) return null
  return <EditorForm key={deckId ?? 'new'} deck={deck ?? undefined} />
}

function EditorForm({ deck }: { deck?: Deck }) {
  const navigate = useNavigate()
  const toast = useToast()
  const lastLangs = getSetting<{ termLang: string; defLang: string; level: Level }>(
    'lastDeckLangs',
    {
      termLang: 'en',
      defLang: 'ru',
      level: 'B1',
    },
  )
  const [title, setTitle] = useState(deck?.title ?? '')
  const [description, setDescription] = useState(deck?.description ?? '')
  const [termLang, setTermLang] = useState(deck?.termLang ?? lastLangs.termLang)
  const [defLang, setDefLang] = useState(deck?.defLang ?? lastLangs.defLang)
  const [level, setLevel] = useState<Level>(deck?.level ?? lastLangs.level)
  const [rows, setRows] = useState<Row[]>(() => (deck ? [] : [emptyRow(), emptyRow(), emptyRow()]))
  const [loaded, setLoaded] = useState(!deck)
  const [dirty, setDirty] = useState(false)
  const [titleError, setTitleError] = useState(false)
  const [importState, setImportState] = useState<{ open: boolean; text: string; rowKey?: string }>({
    open: false,
    text: '',
  })
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const focusKey = useRef<string | null>(null)

  const ids = {
    title: useFieldId('title'),
    description: useFieldId('description'),
    termLang: useFieldId('term-lang'),
    defLang: useFieldId('def-lang'),
    level: useFieldId('level'),
  }

  useEffect(() => {
    if (!deck) return
    getDeckCards(deck.id).then((cards) => {
      setRows(
        cards.length
          ? cards.map((c) => ({ key: c.id, id: c.id, term: c.term, definition: c.definition }))
          : [emptyRow()],
      )
      setLoaded(true)
    })
  }, [deck])

  useEffect(() => {
    if (!focusKey.current) return
    const input = document.querySelector<HTMLInputElement>(`[data-row="${focusKey.current}"] input`)
    input?.focus()
    // Keep the new row above the sticky «Добавить карточку» bar.
    input?.scrollIntoView({ block: 'nearest' })
    focusKey.current = null
  })

  const touch = () => setDirty(true)

  const updateRow = (key: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    touch()
  }

  const addRow = () => {
    const row = emptyRow()
    focusKey.current = row.key
    setRows((rs) => [...rs, row])
    touch()
  }

  const removeRow = (key: string) => {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [emptyRow()]))
    touch()
  }

  const importRows = (cards: ParsedCard[], replaceKey?: string) => {
    const incoming = cards.map((c) => ({ key: newId(), term: c.term, definition: c.definition }))
    setRows((rs) => {
      // Drop the row the text was pasted into and trailing blank rows, then append.
      const kept = rs.filter((r) => r.key !== replaceKey && (r.term.trim() || r.definition.trim()))
      return [...kept, ...incoming]
    })
    toast.show({ message: t.import.added(cards.length) })
    touch()
  }

  const onPaste = (row: Row) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length >= 2 || text.includes('\t')) {
      e.preventDefault()
      setImportState({ open: true, text, rowKey: row.term || row.definition ? undefined : row.key })
    }
  }

  const goBack = () => {
    if (dirty && !window.confirm(t.editor.unsaved)) return
    navigate(deck ? `/deck/${deck.id}` : '/')
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    // Saving before the cards are loaded would wipe them (rows is still empty).
    if (!loaded || saving) return
    if (!title.trim()) {
      setTitleError(true)
      titleRef.current?.focus()
      return
    }
    setSaving(true)
    const input = {
      title: title.trim(),
      description: description.trim() || undefined,
      termLang,
      defLang,
      level,
    }
    const cards = rows
      .map((r) => ({ id: r.id, term: r.term.trim(), definition: r.definition.trim() }))
      .filter((r) => r.term || r.definition)
    setSetting('lastDeckLangs', { termLang, defLang, level })
    try {
      if (deck) {
        await saveDeck(deck.id, input, cards)
        navigate(`/deck/${deck.id}`, { replace: true })
      } else {
        const id = await createDeck(input, cards)
        navigate(`/deck/${id}`, { replace: true })
      }
    } finally {
      setSaving(false)
    }
  }

  const filled = rows.filter((r) => r.term.trim() || r.definition.trim()).length
  const duplicates = findDuplicates(rows, termLang)

  return (
    <form onSubmit={onSave} noValidate>
      <TopBar
        left={
          <IconButton label={t.app.back} onClick={goBack}>
            <IconChevronLeft />
          </IconButton>
        }
        center={
          <p className="truncate text-center font-semibold">
            {deck ? t.editor.editTitle : t.editor.newTitle}
          </p>
        }
        right={
          <Button type="submit" variant="primary" size="sm" disabled={saving || !loaded}>
            {deck ? t.editor.save : t.editor.create}
          </Button>
        }
      />
      <main className="mx-auto max-w-3xl px-4 pt-2 pb-8 sm:px-6">
        <section className="raised flex flex-col gap-4 rounded-card p-5">
          <Field
            id={ids.title}
            label={t.editor.title}
            hint={
              titleError ? <span className="text-bad">{t.editor.titleRequired}</span> : undefined
            }
          >
            <Input
              ref={titleRef}
              id={ids.title}
              value={title}
              autoFocus={!deck}
              aria-invalid={titleError}
              placeholder={t.editor.titlePlaceholder}
              onChange={(e) => {
                setTitle(e.target.value)
                setTitleError(false)
                touch()
              }}
              className="text-lg font-semibold"
            />
          </Field>
          <Field id={ids.description} label={t.editor.description}>
            <Input
              id={ids.description}
              value={description}
              placeholder={t.editor.descriptionPlaceholder}
              onChange={(e) => {
                setDescription(e.target.value)
                touch()
              }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field id={ids.termLang} label={t.editor.termLang}>
              <Select
                id={ids.termLang}
                value={termLang}
                onChange={(e) => {
                  setTermLang(e.target.value)
                  touch()
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id={ids.defLang} label={t.editor.defLang}>
              <Select
                id={ids.defLang}
                value={defLang}
                onChange={(e) => {
                  setDefLang(e.target.value)
                  touch()
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="col-span-2 sm:col-span-1">
              <Field id={ids.level} label={t.editor.level}>
                <Select
                  id={ids.level}
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value as Level)
                    touch()
                  }}
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

        <div className="mt-8 mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">{t.plural.cards(filled)}</h2>
          <Button size="sm" variant="soft" onClick={() => setImportState({ open: true, text: '' })}>
            <IconUpload size={16} />
            {t.editor.import}
          </Button>
        </div>

        {loaded && (
          <Reorder.Group
            axis="y"
            values={rows}
            onReorder={(r) => {
              setRows(r)
              touch()
            }}
            className="flex flex-col gap-2.5"
          >
            <AnimatePresence initial={false}>
              {rows.map((row, i) => (
                <EditorRow
                  key={row.key}
                  row={row}
                  index={i}
                  termLang={termLang}
                  defLang={defLang}
                  duplicateOf={
                    duplicates[i]! >= 0
                      ? t.editor.duplicateOf(
                          duplicates[i]! + 1,
                          rows[duplicates[i]!]!.definition.trim(),
                        )
                      : undefined
                  }
                  onChange={(patch) => updateRow(row.key, patch)}
                  onRemove={() => removeRow(row.key)}
                  onPaste={onPaste(row)}
                  onEnterLast={i === rows.length - 1 ? addRow : undefined}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </main>

      {/* Sticky, not fixed: fixed bars jump around the iOS keyboard. */}
      <div className="sticky bottom-0 z-20 bg-bg/85 px-safe pt-3 pb-safe backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Button variant="raised" size="lg" block onClick={addRow}>
            <IconPlus size={20} />
            {t.editor.addRow}
          </Button>
        </div>
      </div>

      <ImportSheet
        open={importState.open}
        initialText={importState.text}
        existingTerms={rows.filter((r) => r.key !== importState.rowKey).map((r) => r.term)}
        lang={termLang}
        onClose={() => setImportState((s) => ({ ...s, open: false }))}
        onImport={(cards) => importRows(cards, importState.rowKey)}
      />
    </form>
  )
}

function EditorRow({
  row,
  index,
  termLang,
  defLang,
  duplicateOf,
  onChange,
  onRemove,
  onPaste,
  onEnterLast,
}: {
  row: Row
  index: number
  termLang: string
  defLang: string
  /** Warning when an earlier row has the same term; saving is not blocked. */
  duplicateOf?: string
  onChange: (patch: Partial<Row>) => void
  onRemove: () => void
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void
  onEnterLast?: () => void
}) {
  const controls = useDragControls()
  const hintId = `dup-${row.key}`
  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      data-row={row.key}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      whileDrag={{ scale: 1.02, boxShadow: 'var(--fw-shadow-float)' }}
      className="relative flex scroll-mb-28 items-stretch gap-1 rounded-2xl border border-line bg-surface p-2"
    >
      <button
        type="button"
        aria-label={`${t.editor.dragRow} ${index + 1}`}
        className="flex w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 active:cursor-grabbing"
        onPointerDown={(e) => controls.start(e)}
      >
        <IconGrip size={18} />
      </button>
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
        <input
          aria-label={`${t.editor.term} ${index + 1}`}
          placeholder={t.editor.term}
          lang={termLang}
          value={row.term}
          aria-describedby={duplicateOf ? hintId : undefined}
          onChange={(e) => onChange({ term: e.target.value })}
          onPaste={onPaste}
          className={`${inputClass} border-transparent bg-surface-2 font-medium`}
        />
        <input
          aria-label={`${t.editor.definition} ${index + 1}`}
          placeholder={t.editor.definition}
          lang={defLang}
          value={row.definition}
          onChange={(e) => onChange({ definition: e.target.value })}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnterLast) {
              e.preventDefault()
              onEnterLast()
            }
          }}
          className={`${inputClass} border-transparent bg-surface-2`}
        />
        {duplicateOf && (
          <p id={hintId} className="px-1 text-[0.875rem] text-sun-ink sm:col-span-2">
            {duplicateOf}
          </p>
        )}
      </div>
      <motion.div className="flex items-center">
        <IconButton size="sm" label={`${t.editor.removeRow} ${index + 1}`} onClick={onRemove}>
          <IconX size={18} />
        </IconButton>
      </motion.div>
    </Reorder.Item>
  )
}
