import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { NotFound } from '@/app/RouteError'
import { useBack } from '@/app/useBack'
import { createDeck, type Deck, saveDeck, useDeck } from '@/db'
import {
  Button,
  IconButton,
  IconChevronLeft,
  IconPlus,
  IconUpload,
  SectionHeader,
  TopBar,
  useToast,
} from '@/design'
import { ImportSheet } from '@/features/decks/ImportSheet'
import { t } from '@/i18n/ru'
import { MAX_CARDS, type ParsedCard, setSetting } from '@/lib'
import { DeckMetaFields } from './DeckMetaFields'
import { EditorRows } from './EditorRows'
import { useDeckMeta } from './useDeckMeta'
import { useDeckRows } from './useDeckRows'

export function DeckEditor() {
  const { deckId } = useParams()
  const deck = useDeck(deckId)
  if (deckId && deck === null) return <NotFound />
  if (deckId && !deck) return null
  return <EditorForm key={deckId ?? 'new'} deck={deck ?? undefined} />
}

function EditorForm({ deck }: { deck?: Deck }) {
  const navigate = useNavigate()
  const back = useBack(deck ? `/deck/${deck.id}` : '/')
  const toast = useToast()
  const { meta, set: setMeta, flagMissingTitle } = useDeckMeta(deck)
  const rows = useDeckRows(deck)
  const [importState, setImportState] = useState<{ open: boolean; text: string; rowKey?: string }>({
    open: false,
    text: '',
  })
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)
  const dirty = meta.dirty || rows.dirty

  const addRow = () => {
    if (rows.full) return
    // A new row would be hidden by an active filter.
    setQuery('')
    rows.add()
  }

  const importRows = (cards: ParsedCard[], replaceKey?: string) => {
    setQuery('')
    rows.importCards(cards, replaceKey)
    toast.show({ message: t.import.added(cards.length) })
  }

  // Enter must never submit the form (it would save and close the editor mid-typing):
  // it moves to the next visible field instead. The last definition adds a row itself.
  const onEnter = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const el = e.target
    // Only the editor's own fields: the import sheet sits inside the form too.
    if (e.key !== 'Enter' || e.defaultPrevented || !(el instanceof HTMLInputElement)) return
    if (el.type !== 'text' || !el.closest('main')) return
    e.preventDefault()
    const fields = [...e.currentTarget.querySelectorAll<HTMLInputElement>('main input')].filter(
      (f) => f.type === 'text' && !f.closest('[hidden]'),
    )
    fields[fields.indexOf(el) + 1]?.focus()
  }

  const goBack = () => {
    if (dirty && !window.confirm(t.editor.unsaved)) return
    back()
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rows.loaded || saving) return
    if (!meta.title.trim()) {
      flagMissingTitle()
      titleRef.current?.focus()
      return
    }
    setSaving(true)
    const { termLang, defLang, level } = meta
    const input = {
      title: meta.title.trim(),
      description: meta.description.trim() || undefined,
      termLang,
      defLang,
      level,
    }
    const cards = rows.rows
      .map((r) => ({ id: r.id, term: r.term.trim(), definition: r.definition.trim() }))
      .filter((r) => r.term || r.definition)
    setSetting('lastDeckLangs', { termLang, defLang, level })
    try {
      if (deck) {
        await saveDeck(deck.id, input, cards)
        back()
      } else {
        const id = await createDeck(input, cards)
        navigate(`/deck/${id}`, { replace: true })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSave} onKeyDown={onEnter} noValidate>
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
          <Button type="submit" variant="primary" size="sm" disabled={saving || !rows.loaded}>
            {deck ? t.editor.save : t.editor.create}
          </Button>
        }
      />
      <main className="mx-auto max-w-3xl px-4 pt-2 pb-8 sm:px-6">
        <DeckMetaFields meta={meta} onChange={setMeta} titleRef={titleRef} autoFocusTitle={!deck} />

        <SectionHeader
          title={t.plural.cards(rows.filled)}
          className="mt-8 mb-3"
          action={
            <Button
              size="sm"
              variant="soft"
              onClick={() => setImportState({ open: true, text: '' })}
            >
              <IconUpload size={16} />
              {t.editor.import}
            </Button>
          }
        />

        <EditorRows
          rows={rows.rows}
          loaded={rows.loaded}
          filled={rows.filled}
          query={query}
          onQuery={setQuery}
          termLang={meta.termLang}
          defLang={meta.defLang}
          onUpdate={rows.update}
          onRemove={rows.remove}
          onReorder={rows.reorder}
          onAdd={addRow}
          onPasteImport={(text, rowKey) => setImportState({ open: true, text, rowKey })}
        />
      </main>

      {/* Sticky, not fixed: fixed bars jump around the iOS keyboard. */}
      <div className="sticky bottom-0 z-20 bg-bg/85 px-safe pt-3 pb-safe backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Button variant="raised" size="lg" block disabled={rows.full} onClick={addRow}>
            <IconPlus size={20} />
            {rows.full ? t.editor.rowsFull : t.editor.addRow}
          </Button>
        </div>
      </div>

      <ImportSheet
        open={importState.open}
        initialText={importState.text}
        existingTerms={rows.rows.map((r) => r.term)}
        lang={meta.termLang}
        room={MAX_CARDS - rows.filled}
        onClose={() => setImportState((s) => ({ ...s, open: false }))}
        onImport={(cards) => importRows(cards, importState.rowKey)}
      />
    </form>
  )
}
