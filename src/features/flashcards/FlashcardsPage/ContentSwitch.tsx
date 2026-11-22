import { Segmented } from '@/design'
import type { FlashContent } from '@/features/flashcards/sentences'
import { t } from '@/i18n/ru'

export function ContentSwitch({
  value,
  onChange,
  mono,
}: {
  value: FlashContent
  onChange: (c: FlashContent) => void
  mono: boolean
}) {
  return (
    <div className="mx-auto mb-3 w-full max-w-xs">
      <Segmented
        label={t.flash.content}
        value={value}
        onChange={onChange}
        options={[
          { value: 'words', label: t.flash.words },
          { value: 'sentences', label: t.flash.sentences, disabled: mono },
        ]}
      />
      {mono && (
        <p className="mt-1.5 text-center text-[0.8125rem] text-ink-3">{t.flash.monolingual}</p>
      )}
    </div>
  )
}
