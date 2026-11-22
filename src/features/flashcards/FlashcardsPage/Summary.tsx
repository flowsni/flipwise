import { motion } from 'motion/react'
import { Button, CountUp, IconUndo, Ring, softSpring } from '@/design'
import { t } from '@/i18n/ru'

export function Summary({
  known,
  learning,
  onRepeat,
  onRestart,
  onUndo,
}: {
  known: number
  learning: number
  onRepeat?: () => void
  onRestart: () => void
  onUndo?: () => void
}) {
  const total = known + learning
  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={softSpring}
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 pb-safe text-center"
    >
      <Ring
        value={total ? known / total : 0}
        size={168}
        stroke={14}
        color="var(--fw-good)"
        track="var(--fw-bad-soft)"
        animateFromZero
      >
        <span className="flex flex-col items-center">
          <span className="text-4xl font-bold">
            <CountUp to={total ? Math.round((known / total) * 100) : 0} suffix="%" />
          </span>
        </span>
      </Ring>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {total && known / total >= 0.6 ? t.flash.doneTitle : t.flash.doneNeutralTitle}
        </h1>
        <p className="mt-2 flex justify-center gap-4 text-ink-2">
          <span className="font-semibold text-good">{t.flash.knowCount(known)}</span>
          <span className="font-semibold text-bad">{t.flash.learningCount(learning)}</span>
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        {onRepeat && (
          <Button variant="primary" size="lg" block onClick={onRepeat}>
            {t.flash.repeatLearning(learning)}
          </Button>
        )}
        <Button variant={onRepeat ? 'raised' : 'primary'} size="lg" block onClick={onRestart}>
          {t.flash.restart}
        </Button>
        {onUndo && (
          <Button variant="ghost" onClick={onUndo}>
            <IconUndo size={18} />
            {t.flash.undo}
          </Button>
        )}
      </div>
    </motion.main>
  )
}
