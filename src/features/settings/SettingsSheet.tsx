import { type ThemeSetting, useThemeSetting } from '../../app/theme'
import { Segmented } from '../../design/Field'
import { Sheet } from '../../design/Sheet'
import { t } from '../../i18n/ru'

export function SettingsSheet({
  open,
  onClose,
}: {
  open: boolean
  focusSection?: 'ai'
  onClose: () => void
}) {
  const [theme, setTheme] = useThemeSetting()
  return (
    <Sheet open={open} onClose={onClose} title={t.settings.title}>
      <Segmented<ThemeSetting>
        label={t.settings.theme}
        value={theme}
        onChange={setTheme}
        options={[
          { value: 'system', label: t.settings.themeSystem },
          { value: 'light', label: t.settings.themeLight },
          { value: 'dark', label: t.settings.themeDark },
        ]}
      />
    </Sheet>
  )
}
