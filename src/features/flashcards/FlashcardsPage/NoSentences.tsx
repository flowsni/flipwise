import { motion } from 'motion/react'
import { Button, IconSparkles, softSpring } from '@/design'
import { t } from '@/i18n/ru'

export function NoSentences({
  onGenerate,
  onWords,
}: {
  onGenerate: () => void
  onWords: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
      className="flex flex-1 flex-col items-center justify-center gap-4 pb-16 text-center"
    >
      <span className="grid size-16 place-items-center rounded-2xl bg-sun-soft text-sun-ink">
        <IconSparkles size={30} />
      </span>
      <h1 className="text-xl font-bold tracking-tight">{t.flash.noSentencesTitle}</h1>
      <p className="max-w-xs text-ink-2">{t.flash.noSentences}</p>
      <div className="flex flex-col items-center gap-2">
        <Button variant="primary" size="lg" onClick={onGenerate}>
          <IconSparkles size={20} />
          {t.flash.generate}
        </Button>
        <Button variant="ghost" onClick={onWords}>
          {t.flash.toWords}
        </Button>
      </div>
    </motion.div>
  )
}
