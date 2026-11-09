import { IconButton } from '../../design/Button'
import { IconVolume } from '../../design/icons'
import { t } from '../../i18n/ru'
import { speak, ttsSupported } from './speak'

export function SpeakButton({
  text,
  lang,
  size = 'sm',
  className,
}: {
  text: string
  lang: string
  size?: 'sm' | 'md'
  className?: string
}) {
  if (!ttsSupported()) return null
  return (
    <IconButton
      label={t.deck.speak(text.replace(/\[\[|\]\]/g, ''))}
      size={size}
      className={className}
      onClick={(e) => {
        e.stopPropagation()
        speak(text, lang)
      }}
    >
      <IconVolume size={size === 'sm' ? 18 : 22} />
    </IconButton>
  )
}
