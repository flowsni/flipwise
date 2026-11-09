import { expect, it } from 'vitest'
import { plural } from './plural'

it('picks Russian plural forms', () => {
  const f = ['карточка', 'карточки', 'карточек'] as const
  expect([1, 2, 5, 11, 12, 21, 22, 25, 111, 101].map((n) => plural(n, f))).toEqual([
    'карточка',
    'карточки',
    'карточек',
    'карточек',
    'карточек',
    'карточка',
    'карточки',
    'карточек',
    'карточек',
    'карточка',
  ])
})
