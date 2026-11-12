import { describe, expect, it } from 'vitest'
import type { Card, Deck } from '../db/types'
import { groupByDeck, matchesQuery, searchCards } from './search'

const deck = (id: string): Deck => ({
  id,
  title: id,
  termLang: 'en',
  defLang: 'ru',
  level: 'B1',
  createdAt: 0,
  updatedAt: 0,
})

let n = 0
const card = (deckId: string, term: string, definition: string): Card => ({
  id: `c${n}`,
  deckId,
  position: n++,
  term,
  definition,
  createdAt: 0,
  updatedAt: 0,
})

const decks = [deck('travel'), deck('food')]
const cards = [
  card('travel', 'boarding pass', 'посадочный талон'),
  card('travel', 'pass', 'пропуск'),
  card('food', 'Passion fruit', 'маракуйя'),
  card('food', 'compass', 'компас'),
  card('food', 'hedgehog', 'Ёж'),
  card('ghost', 'pass', 'orphan'),
]

describe('searchCards', () => {
  it('ranks exact, then prefix, then substring matches', () => {
    expect(searchCards(cards, decks, 'pass').map((h) => h.card.term)).toEqual([
      'pass',
      'Passion fruit',
      'boarding pass',
      'compass',
    ])
  })

  it('ignores case, ё/е and punctuation', () => {
    expect(searchCards(cards, decks, 'еж').map((h) => h.card.term)).toEqual(['hedgehog'])
    expect(searchCards(cards, decks, 'PASSION-fruit').map((h) => h.card.term)).toEqual([
      'Passion fruit',
    ])
  })

  it('searches definitions too', () => {
    expect(searchCards(cards, decks, 'талон').map((h) => h.card.term)).toEqual(['boarding pass'])
  })

  it('returns nothing for an empty query and skips cards of missing decks', () => {
    expect(searchCards(cards, decks, '  ')).toEqual([])
    expect(searchCards(cards, decks, 'orphan')).toEqual([])
  })
})

describe('groupByDeck', () => {
  it('puts the deck with the best hit first', () => {
    const groups = groupByDeck(searchCards(cards, decks, 'pass'))
    expect(groups.map((g) => [g.deck.id, g.hits.length])).toEqual([
      ['travel', 2],
      ['food', 2],
    ])
  })
})

describe('matchesQuery', () => {
  it('matches term or definition, ignoring case and ё/е', () => {
    expect(matchesQuery('Boarding pass', 'посадочный талон', 'BOARD')).toBe(true)
    expect(matchesQuery('pass', 'ёлка', 'елк')).toBe(true)
    expect(matchesQuery('pass', 'пропуск', 'талон')).toBe(false)
  })

  it('matches everything for an empty query', () => {
    expect(matchesQuery('a', 'б', '  ')).toBe(true)
  })
})
