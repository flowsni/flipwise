import { LEVELS, type Level } from '@/db'
import { Segmented } from '@/design'
import { t } from '@/i18n/ru'

/** A1–C2 for AI examples. */
export function LevelPicker({ value, onChange }: { value: Level; onChange: (l: Level) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.9375rem] font-medium text-ink-2">{t.examples.level}</span>
      <Segmented
        label={t.examples.level}
        value={value}
        onChange={onChange}
        options={LEVELS.map((l) => ({ value: l, label: l }))}
      />
    </div>
  )
}
