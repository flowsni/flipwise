import { type ThemeSetting, useThemeSetting } from '@/app/theme'
import { Segmented, Sheet } from '@/design'
import { t } from '@/i18n/ru'
import { AiSection } from './AiSection'
import { DataSection } from './DataSection'
import { Section } from './Section'
import { SpeechSection } from './SpeechSection'

export function SettingsSheet({
  open,
  focusSection,
  onClose,
}: {
  open: boolean
  focusSection?: 'ai'
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={t.settings.title} wide>
      <div className="flex flex-col gap-8">
        <Appearance />
        <AiSection autoFocus={focusSection === 'ai'} />
        <SpeechSection />
        <DataSection />
        <p className="text-center text-[0.8125rem] text-ink-3">Flipwise {__APP_VERSION__}</p>
      </div>
    </Sheet>
  )
}

function Appearance() {
  const [theme, setTheme] = useThemeSetting()
  return (
    <Section title={t.settings.appearance} id="settings-appearance">
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
    </Section>
  )
}
