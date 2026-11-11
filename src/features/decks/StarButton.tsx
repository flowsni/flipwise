import { IconButton } from '../../design/Button'
import { cx } from '../../design/cx'
import { IconStar } from '../../design/icons'
import { t } from '../../i18n/ru'

export function StarButton({
  term,
  starred,
  onToggle,
  size = 'sm',
  className,
}: {
  term: string
  starred: boolean
  onToggle: () => void
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <IconButton
      label={starred ? t.deck.unstar(term) : t.deck.star(term)}
      aria-pressed={starred}
      size={size}
      className={cx(starred && 'text-sun-ink hover:text-sun-ink', className)}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      <IconStar size={size === 'sm' ? 18 : 22} filled={starred} />
    </IconButton>
  )
}
