import { motion } from 'motion/react'
import { Button, EmptyState, IconSparkles, softSpring } from '@/design'
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
      className="flex flex-1 flex-col"
    >
      <EmptyState
        className="flex-1 justify-center pb-16"
        icon={<IconSparkles size={30} />}
        title={t.flash.noSentencesTitle}
        text={t.flash.noSentences}
        actions={
          <div className="flex flex-col items-center gap-2">
            <Button variant="primary" size="lg" onClick={onGenerate}>
              <IconSparkles size={20} />
              {t.flash.generate}
            </Button>
            <Button variant="ghost" onClick={onWords}>
              {t.flash.toWords}
            </Button>
          </div>
        }
      />
    </motion.div>
  )
}
