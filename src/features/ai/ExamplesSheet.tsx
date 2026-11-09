import type { Card, Deck } from '../../db/types'
import { Sheet } from '../../design/Sheet'
import { t } from '../../i18n/ru'

/** Placeholder until AI examples land. */
export function ExamplesSheet({
  card,
  onClose,
}: {
  card: Card | null
  deck: Deck
  onClose: () => void
}) {
  return (
    <Sheet open={!!card} onClose={onClose} title={t.examples.title}>
      <p className="text-ink-2">Скоро.</p>
    </Sheet>
  )
}
