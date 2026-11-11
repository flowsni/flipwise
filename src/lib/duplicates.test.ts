import { describe, expect, it } from 'vitest'
import { findDuplicates, splitDuplicates } from './duplicates'

const rows = (...terms: string[]) => terms.map((term) => ({ term }))

describe('findDuplicates', () => {
  it('points each repeat to the first card with that term', () => {
    expect(findDuplicates(rows('Apple', 'board', ' apple ', 'apple!'), 'en')).toEqual([
      -1, -1, 0, 0,
    ])
  })

  it('ignores blank terms', () => {
    expect(findDuplicates(rows('', ' ', ''), 'en')).toEqual([-1, -1, -1])
  })

  it('treats ё as е', () => {
    expect(findDuplicates(rows('ёж', 'еж'), 'ru')).toEqual([-1, 0])
  })

  it('matches across articles and diacritics — only a warning, the user decides', () => {
    expect(findDuplicates(rows('der See', 'die See'), 'de')).toEqual([-1, 0])
    expect(findDuplicates(rows('the apple', 'apple'), 'en')).toEqual([-1, 0])
    expect(findDuplicates(rows('café', 'cafe'), 'fr')).toEqual([-1, 0])
  })
})

describe('splitDuplicates', () => {
  it('separates cards already in the deck and repeats inside the import', () => {
    const incoming = [
      { term: 'Luggage', definition: 'багаж' },
      { term: 'ticket', definition: 'билет' },
      { term: 'Ticket', definition: 'проездной' },
    ]
    const { fresh, duplicates } = splitDuplicates(incoming, ['luggage', ''], 'en')
    expect(fresh.map((c) => c.definition)).toEqual(['билет'])
    expect(duplicates.map((c) => c.definition)).toEqual(['багаж', 'проездной'])
  })
})
