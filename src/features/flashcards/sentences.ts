import type { Card, Deck, ExampleItem } from '@/db'
import { t } from '@/i18n/ru'
import type { Rng } from '@/lib'
import type { CardSide } from './SwipeCard'

export type FlashContent = 'words' | 'sentences'

/**
 * One random example per card for a round. Cards without examples are left out, so callers
 * pass cards that were already filtered with `hasExamples`.
 */
export function pickSentences(
  cardIds: readonly string[],
  cardsById: ReadonlyMap<string, Pick<Card, 'examples'>>,
  rng: Rng = Math.random,
): Map<string, number> {
  const picked = new Map<string, number>()
  for (const id of cardIds) {
    const items = cardsById.get(id)?.examples?.items
    if (items?.length) picked.set(id, Math.floor(rng() * items.length))
  }
  return picked
}

/**
 * The picked example of a card. Examples regenerated mid-round may be fewer than before: an
 * index that is out of range (or missing) falls back to the first one.
 */
export function sentenceOf(
  card: Pick<Card, 'examples'> | undefined,
  index: number | undefined,
): ExampleItem | undefined {
  const items = card?.examples?.items
  if (!items?.length) return undefined
  return items[index ?? 0] ?? items[0]
}

export function sidesOf(
  card: Card,
  opts: {
    deck: Pick<Deck, 'termLang' | 'defLang'>
    content: FlashContent
    picked: ReadonlyMap<string, number>
    front: 'term' | 'definition'
  },
): { front: CardSide; back: CardSide } {
  const { deck, content, picked, front } = opts
  const sentence = content === 'sentences' && sentenceOf(card, picked.get(card.id))
  if (sentence) {
    // A translation without [[ ]] simply shows unmarked: guessing the word form is unreliable.
    return {
      front: {
        text: sentence.translation,
        lang: deck.defLang,
        label: t.flash.sentenceFront,
        sentence: true,
      },
      back: {
        text: sentence.text,
        lang: deck.termLang,
        label: t.flash.sentenceBack,
        sentence: true,
      },
    }
  }
  const term = { text: card.term, lang: deck.termLang, label: t.study.termSide }
  const definition = { text: card.definition, lang: deck.defLang, label: t.study.definitionSide }
  return front === 'term' ? { front: term, back: definition } : { front: definition, back: term }
}
