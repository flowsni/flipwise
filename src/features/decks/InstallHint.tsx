import { AnimatePresence, motion } from 'motion/react'
import { Button } from '../../design/Button'
import { IconShare } from '../../design/icons'
import { t } from '../../i18n/ru'
import { useSetting } from '../../lib/storage'

function isIosBrowser(): boolean {
  const ua = navigator.userAgent
  const ios =
    /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  return ios && !standalone
}

/**
 * Safari may wipe site data after 7 days without a visit unless the app is on the Home Screen.
 * A gentle, dismissible hint for iPhone/iPad users.
 */
export function InstallHint() {
  const [dismissed, setDismissed] = useSetting('installHintDismissed', false)
  const show = !dismissed && isIosBrowser()
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="mb-5 flex items-start gap-3 rounded-2xl bg-sun-soft p-4 text-[0.95rem]">
            <IconShare size={20} className="mt-0.5 shrink-0 text-[#7a5400] dark:text-sun" />
            <p className="flex-1">{t.home.installHint}</p>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              {t.home.installDismiss}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
