import { LEVELS, type Level } from '@/db'
import { SegmentedField } from '@/design'
import { t } from '@/i18n/ru'

/** A1–C2 for AI examples. */
export function LevelPicker({ value, onChange }: { value: Level; onChange: (l: Level) => void }) {
  return (
    <SegmentedField
      label={t.examples.level}
      value={value}
      onChange={onChange}
      options={LEVELS.map((l) => ({ value: l, label: l }))}
    />
  )
}
