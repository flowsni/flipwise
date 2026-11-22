import { useReducer } from 'react'
import type { Deck, Level } from '@/db'
import { getSetting } from '@/lib'

export interface DeckMeta {
  title: string
  description: string
  termLang: string
  defLang: string
  level: Level
  titleError: boolean
  dirty: boolean
}

type Fields = Pick<DeckMeta, 'title' | 'description' | 'termLang' | 'defLang' | 'level'>

type Action = { type: 'set'; patch: Partial<Fields> } | { type: 'titleMissing' }

function reducer(s: DeckMeta, a: Action): DeckMeta {
  switch (a.type) {
    case 'set':
      // Typing in the title takes the «название обязательно» error away.
      return {
        ...s,
        ...a.patch,
        titleError: 'title' in a.patch ? false : s.titleError,
        dirty: true,
      }
    case 'titleMissing':
      return { ...s, titleError: true }
  }
}

/** The deck's own fields; a new deck starts with the languages and level of the last one saved. */
export function useDeckMeta(deck?: Deck) {
  const [meta, dispatch] = useReducer(reducer, deck, (d): DeckMeta => {
    const last = getSetting<{ termLang: string; defLang: string; level: Level }>('lastDeckLangs', {
      termLang: 'en',
      defLang: 'ru',
      level: 'B1',
    })
    return {
      title: d?.title ?? '',
      description: d?.description ?? '',
      termLang: d?.termLang ?? last.termLang,
      defLang: d?.defLang ?? last.defLang,
      level: d?.level ?? last.level,
      titleError: false,
      dirty: false,
    }
  })
  return {
    meta,
    set: (patch: Partial<Fields>) => dispatch({ type: 'set', patch }),
    flagMissingTitle: () => dispatch({ type: 'titleMissing' }),
  }
}
