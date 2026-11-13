import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Card, Deck } from '../../db/types'
import { cx } from '../../design/cx'
import { IconSparkles } from '../../design/icons'
import { t } from '../../i18n/ru'
import { hasExamples } from '../../lib/examples'

/** The block that holds a list of `CardRow`s; its corners must match the first/last row's. */
export const cardListClass = 'flex flex-col rounded-2xl border border-line bg-surface'

/**
 * One card in a list: term and definition, plus whatever actions the screen needs
 * (the deck page opens examples on tap and adds actions; search and «Трудные слова» link to the
 * card instead). The rows of a list are separated by dividers inside one rounded block, which the
 * parent `<ul>` draws.
 */
export function CardRow({
  card,
  deck,
  to,
  onSelect,
  highlighted,
  meta,
  children,
}: {
  card: Card
  deck: Deck
  /** Makes the text a link, e.g. from search to the card in its deck. */
  to?: string
  /** Makes the text a button, e.g. to open the card's examples. */
  onSelect?: () => void
  /** Briefly marks the row the user came to find. */
  highlighted?: boolean
  /** Extra line under the definition, e.g. a mistakes counter. */
  meta?: ReactNode
  /** Action buttons on the right. */
  children?: ReactNode
}) {
  const has = hasExamples(card)
  const text = (
    <>
      <span className="grid gap-0.5 sm:grid-cols-[2fr_3fr] sm:gap-4">
        <span className="font-semibold break-words" lang={deck.termLang}>
          {card.term}
          <IconSparkles
            size={14}
            role="img"
            aria-hidden={false}
            aria-label={has ? t.examples.has : t.examples.none}
            fill={has ? 'currentColor' : 'none'}
            className={cx('ml-1.5 inline-block align-[-1px]', has ? 'text-primary' : 'text-ink-3')}
          />
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
        'flex scroll-my-24 items-center border-t border-line py-2 pr-2 pl-4 transition-colors duration-700 first:rounded-t-2xl first:border-t-0 last:rounded-b-2xl',
        highlighted && 'bg-sun-soft',
      )}
    >
      {to ? (
        <Link
          to={to}
          className="-my-2 -ml-4 block min-w-0 flex-1 rounded-l-2xl py-3 pl-4 hover:text-ink"
        >
          {text}
        </Link>
      ) : onSelect ? (
        // Not a <button>: its text can't be selected. No press animation or `active:` style either:
        // they would flash when a scroll starts on the row. Dragging to select text must not open the
        // sheet (a double click still does: its first click arrives before anything is selected).
        // biome-ignore lint/a11y/useSemanticElements: a <button> can't have its text selected
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!window.getSelection()?.toString()) onSelect()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect()
            }
          }}
          className="-my-2 -ml-4 block min-w-0 flex-1 cursor-pointer rounded-l-2xl py-3 pl-4 text-left select-text hover:text-ink"
        >
          {text}
        </div>
      ) : (
        <div className="min-w-0 flex-1 py-1">{text}</div>
      )}
      {children}
    </motion.li>
  )
}
