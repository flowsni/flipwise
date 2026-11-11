import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Card, Deck } from '../../db/types'
import { cx } from '../../design/cx'

/**
 * One card in a list: term and definition, plus whatever actions the screen needs
 * (the deck page adds delete; search and «Трудные слова» link to the card instead).
 */
export function CardRow({
  card,
  deck,
  to,
  highlighted,
  meta,
  children,
}: {
  card: Card
  deck: Deck
  /** Makes the text a link, e.g. from search to the card in its deck. */
  to?: string
  /** Briefly marks the row the user came to find. */
  highlighted?: boolean
  /** Extra line under the definition, e.g. a mistakes counter. */
  meta?: ReactNode
  /** Action buttons on the right. */
  children?: ReactNode
}) {
  const text = (
    <>
      <span className="grid gap-0.5 sm:grid-cols-[2fr_3fr] sm:gap-4">
        <span className="font-semibold break-words" lang={deck.termLang}>
          {card.term}
        </span>
        <span className="break-words text-ink-2" lang={deck.defLang}>
          {card.definition}
        </span>
      </span>
      {meta && <span className="mt-1 block text-[0.875rem] text-ink-3">{meta}</span>}
    </>
  )
  return (
    <motion.li
      layout
      data-card={card.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      className={cx(
        'group flex scroll-my-24 items-center gap-2 rounded-2xl border py-2 pr-2 pl-4 transition-colors duration-700',
        highlighted ? 'border-sun bg-sun-soft' : 'border-line bg-surface',
      )}
    >
      {to ? (
        <Link
          to={to}
          className="-my-2 -ml-4 block min-w-0 flex-1 rounded-l-2xl py-3 pl-4 hover:text-ink"
        >
          {text}
        </Link>
      ) : (
        <div className="min-w-0 flex-1 py-1">{text}</div>
      )}
      {children}
    </motion.li>
  )
}
