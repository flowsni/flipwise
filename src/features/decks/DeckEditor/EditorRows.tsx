import { AnimatePresence, Reorder } from 'motion/react'
import { useMemo } from 'react'
import { SearchField } from '@/design'
import { t } from '@/i18n/ru'
import { findDuplicates, matchesQuery } from '@/lib'
import { EditorRow } from './EditorRow'
import type { Row } from './useDeckRows'

/** The filter field appears once the set has this many cards. */
const FILTER_FROM = 10

export function EditorRows({
  rows,
  loaded,
  filled,
  query,
  onQuery,
  termLang,
  defLang,
  onUpdate,
  onRemove,
  onReorder,
  onAdd,
  onPasteImport,
}: {
  rows: Row[]
  loaded: boolean
  /** Rows that have text; decides whether the filter is worth showing. */
  filled: number
  query: string
  onQuery: (q: string) => void
  termLang: string
  defLang: string
  onUpdate: (key: string, patch: Partial<Row>) => void
  onRemove: (key: string) => void
  onReorder: (rows: Row[]) => void
  onAdd: () => void
  /** Several lines were pasted into a field: offer to import them (replacing `rowKey` if blank). */
  onPasteImport: (text: string, rowKey?: string) => void
}) {
  const filtering = query.trim() !== ''
  // Matches are fixed when the query changes, not on every keystroke in a row: otherwise
  // fixing a word so that it no longer matches would make the row vanish while typing.
  // biome-ignore lint/correctness/useExhaustiveDependencies: recomputed only when the query changes
  const matchedKeys = useMemo(
    () => new Set(rows.filter((r) => matchesQuery(r.term, r.definition, query)).map((r) => r.key)),
    [query],
  )
  const isShown = (r: Row) => !filtering || matchedKeys.has(r.key)
  // Counted from the live rows: deleting a match must update the number.
  const shownCount = rows.filter(isShown).length
  const lastShown = rows.findLastIndex(isShown)
  const duplicates = findDuplicates(
    rows.map((r) => r.term),
    termLang,
  )
  const duplicateHint = (i: number) => {
    const j = duplicates[i]!
    return j < 0 ? undefined : t.editor.duplicateOf(j + 1, rows[j]!.definition.trim())
  }

  const onPaste = (row: Row) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length >= 2 || text.includes('\t')) {
      e.preventDefault()
      onPasteImport(text, row.term || row.definition ? undefined : row.key)
    }
  }

  if (!loaded) return null
  return (
    <>
      {(filled >= FILTER_FROM || query !== '') && (
        <div className="mb-3">
          <SearchField
            aria-label={t.editor.filterPlaceholder}
            placeholder={t.editor.filterPlaceholder}
            value={query}
            onChange={onQuery}
            onKeyDown={(e) => {
              // The field lives inside the form: Enter must not save it.
              if (e.key === 'Enter') e.preventDefault()
              if (e.key === 'Escape') onQuery('')
            }}
            clearLabel={t.editor.filterClear}
            onClear={() => onQuery('')}
          />
          {filtering && (
            <p className="mt-2 px-1 text-[0.9375rem] text-ink-2" aria-live="polite">
              {shownCount ? t.editor.filterFound(shownCount) : t.editor.filterEmpty(query.trim())}
            </p>
          )}
        </div>
      )}

      <Reorder.Group axis="y" values={rows} onReorder={onReorder} className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {rows.map((row, i) => (
            <EditorRow
              key={row.key}
              row={row}
              index={i}
              termLang={termLang}
              defLang={defLang}
              duplicateOf={duplicateHint(i)}
              hidden={!isShown(row)}
              draggable={!filtering}
              onChange={(patch) => onUpdate(row.key, patch)}
              onRemove={() => onRemove(row.key)}
              onPaste={onPaste(row)}
              // Enter adds a card in the last row you can see (with a filter, not the deck's last one).
              onEnterLast={i === lastShown ? onAdd : undefined}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </>
  )
}
