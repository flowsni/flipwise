import { Button, IconButton, IconUndo } from '@/design'
import type { SwipeDir } from '@/features/flashcards/SwipeCard'
import { t } from '@/i18n/ru'

export function FlashControls({
  canUndo,
  onSwipe,
  onUndo,
}: {
  canUndo: boolean
  onSwipe: (dir: SwipeDir) => void
  onUndo: () => void
}) {
  return (
    <>
      <div className="mt-6 mb-2 flex items-center justify-center gap-3 sm:mt-8">
        <Button
          variant="raised"
          size="lg"
          className="max-w-48 flex-1 !text-bad"
          onClick={() => onSwipe(-1)}
        >
          {t.flash.learning}
        </Button>
        <IconButton
          label={t.flash.undo}
          variant="soft"
          size="lg"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <IconUndo />
        </IconButton>
        <Button
          variant="raised"
          size="lg"
          className="max-w-48 flex-1 !text-good"
          onClick={() => onSwipe(1)}
        >
          {t.flash.know}
        </Button>
      </div>
      <p className="mb-3 hidden text-center text-[0.8125rem] text-ink-3 md:block">{t.flash.keys}</p>
    </>
  )
}
