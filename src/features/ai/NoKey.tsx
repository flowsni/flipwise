import { useSettingsSheet } from '@/app/SettingsContext'
import { Button, EmptyState, IconSparkles } from '@/design'
import { t } from '@/i18n/ru'

export function NoKey({ onClose }: { onClose: () => void }) {
  const settings = useSettingsSheet()
  return (
    <EmptyState
      className="py-6"
      icon={<IconSparkles size={30} />}
      text={t.examples.noKey}
      actions={
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
      }
    />
  )
}
