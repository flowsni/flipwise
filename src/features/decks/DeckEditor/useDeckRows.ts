import { useEffect, useReducer, useRef } from 'react'
import { type Deck, getDeckCards } from '@/db'
import { MAX_CARDS, newId, type ParsedCard } from '@/lib'

/** A card row of the editor. `key` identifies the row, `id` the stored card (absent when new). */
export interface Row {
  key: string
  id?: string
  term: string
  definition: string
}

export const emptyRow = (): Row => ({ key: newId(), term: '', definition: '' })

const isFilled = (r: Row) => !!(r.term.trim() || r.definition.trim())

interface State {
  rows: Row[]
  /** Saving before the cards are loaded would wipe them (rows is still empty). */
  loaded: boolean
  dirty: boolean
}

type Action =
  | { type: 'loaded'; rows: Row[] }
  | { type: 'updated'; key: string; patch: Partial<Row> }
  | { type: 'added'; row: Row }
  | { type: 'removed'; key: string; fallback: Row }
  | { type: 'imported'; incoming: Row[]; replaceKey?: string }
  | { type: 'reordered'; rows: Row[] }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'loaded':
      return { ...s, rows: a.rows, loaded: true }
    case 'updated':
      return {
        ...s,
        rows: s.rows.map((r) => (r.key === a.key ? { ...r, ...a.patch } : r)),
        dirty: true,
      }
    case 'added':
      return { ...s, rows: [...s.rows, a.row], dirty: true }
    case 'removed':
      return {
        ...s,
        rows: s.rows.length > 1 ? s.rows.filter((r) => r.key !== a.key) : [a.fallback],
        dirty: true,
      }
    case 'imported': {
      // Drop the row the text was pasted into and trailing blank rows, then append.
      const kept = s.rows.filter((r) => r.key !== a.replaceKey && isFilled(r))
      return { ...s, rows: [...kept, ...a.incoming], dirty: true }
    }
    case 'reordered':
      return { ...s, rows: a.rows, dirty: true }
  }
}

export function useDeckRows(deck?: Deck) {
  const [state, dispatch] = useReducer(
    reducer,
    deck,
    (d): State => ({
      rows: d ? [] : [emptyRow(), emptyRow(), emptyRow()],
      loaded: !d,
      dirty: false,
    }),
  )
  const focusKey = useRef<string | null>(null)

  useEffect(() => {
    if (!deck) return
    getDeckCards(deck.id).then((cards) => {
      const rows = cards.length
        ? cards.map((c) => ({ key: c.id, id: c.id, term: c.term, definition: c.definition }))
        : [emptyRow()]
      dispatch({ type: 'loaded', rows })
    })
  }, [deck])

  // Focus the row added by «Добавить карточку» once it is on screen.
  useEffect(() => {
    if (!focusKey.current) return
    const row = document.querySelector<HTMLElement>(`[data-row="${focusKey.current}"]`)
    // Scroll the row, not the input: the row's scroll-margin keeps it above the sticky
    // «Добавить карточку» bar, and the input's own scroll would ignore that margin.
    row?.querySelector('input')?.focus({ preventScroll: true })
    row?.scrollIntoView({ block: 'nearest' })
    focusKey.current = null
  })

  const { rows } = state
  return {
    rows,
    loaded: state.loaded,
    dirty: state.dirty,
    filled: rows.filter(isFilled).length,
    full: rows.length >= MAX_CARDS,
    update: (key: string, patch: Partial<Row>) => dispatch({ type: 'updated', key, patch }),
    add: () => {
      if (rows.length >= MAX_CARDS) return
      const row = emptyRow()
      focusKey.current = row.key
      dispatch({ type: 'added', row })
    },
    remove: (key: string) => dispatch({ type: 'removed', key, fallback: emptyRow() }),
    importCards: (cards: ParsedCard[], replaceKey?: string) =>
      dispatch({
        type: 'imported',
        incoming: cards.map((c) => ({ key: newId(), term: c.term, definition: c.definition })),
        replaceKey,
      }),
    reorder: (next: Row[]) => dispatch({ type: 'reordered', rows: next }),
  }
}
