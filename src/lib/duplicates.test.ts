import { describe, expect, it } from 'vitest'
import { findDuplicates } from './duplicates'

describe('findDuplicates', () => {
  it('points each repeat to the first term like it', () => {
    expect(findDuplicates(['Apple', 'board', ' apple ', 'apple!'], 'en')).toEqual([-1, -1, 0, 0])
  })

  it('ignores blank terms', () => {
    expect(findDuplicates(['', ' ', ''], 'en')).toEqual([-1, -1, -1])
  })

  it('treats ё as е', () => {
    expect(findDuplicates(['ёж', 'еж'], 'ru')).toEqual([-1, 0])
  })

  it('matches across articles and diacritics — only a warning, the user decides', () => {
    expect(findDuplicates(['der See', 'die See'], 'de')).toEqual([-1, 0])
    expect(findDuplicates(['the apple', 'apple'], 'en')).toEqual([-1, 0])
    expect(findDuplicates(['café', 'cafe'], 'fr')).toEqual([-1, 0])
  })
})
