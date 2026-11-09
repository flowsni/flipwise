import { describe, expect, it } from 'vitest'
import { guessOptions, parseImport } from './importParser'

describe('parseImport', () => {
  it('parses Quizlet default export (tab + newline)', () => {
    const text = 'apple\tяблоко\r\nboard\tдоска\n\n  cat \t кошка  \n'
    expect(parseImport(text, { termSep: 'tab', cardSep: 'newline' })).toEqual({
      cards: [
        { term: 'apple', definition: 'яблоко' },
        { term: 'board', definition: 'доска' },
        { term: 'cat', definition: 'кошка' },
      ],
      skipped: [],
    })
  })

  it('splits on the first term separator only', () => {
    const { cards } = parseImport('to run, бежать, бегать', {
      termSep: 'comma',
      cardSep: 'newline',
    })
    expect(cards).toEqual([{ term: 'to run', definition: 'бежать, бегать' }])
  })

  it('supports semicolon and custom separators', () => {
    const { cards } = parseImport('a - б; в - г;', {
      termSep: { custom: ' - ' },
      cardSep: 'semicolon',
    })
    expect(cards).toEqual([
      { term: 'a', definition: 'б' },
      { term: 'в', definition: 'г' },
    ])
  })

  it('accepts a literal \\n as a custom card separator', () => {
    const { cards } = parseImport('x\ty\n\nz\tw', {
      termSep: 'tab',
      cardSep: { custom: '\\n\\n' },
    })
    expect(cards).toHaveLength(2)
  })

  it('reports chunks without a separator', () => {
    const r = parseImport('ok\tок\nbroken line\n\tno term', { termSep: 'tab', cardSep: 'newline' })
    expect(r.cards).toHaveLength(1)
    expect(r.skipped).toEqual(['broken line', 'no term'])
  })
})

describe('guessOptions', () => {
  it('prefers tab when present', () => {
    expect(guessOptions('a\tb\nc\td')).toEqual({ termSep: 'tab', cardSep: 'newline' })
  })
  it('detects dash lists', () => {
    expect(guessOptions('a - b\nc - d').termSep).toEqual({ custom: ' - ' })
  })
})
