import { useSettingsSheet } from '../../app/SettingsContext'
import { Button } from '../../design/Button'
import { IconSparkles } from '../../design/icons'
import { t } from '../../i18n/ru'

/** Shown instead of AI features until a provider key is set; leads to the AI settings. */
export function NoKey({ onClose }: { onClose: () => void }) {
  const settings = useSettingsSheet()
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-sun-soft text-sun-ink">
        <IconSparkles size={30} />
      </span>
      <p className="max-w-xs text-ink-2">{t.examples.noKey}</p>
      <Button
        variant="primary"
        size="lg"
        onClick={() => {
          onClose()
          settings.open('ai')
        }}
      >
        {t.examples.openSettings}
      </Button>
    </div>
  )
}
