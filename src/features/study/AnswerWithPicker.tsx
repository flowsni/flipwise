import type { AnswerSide } from '@/db'
import { SegmentedField } from '@/design'
import { t } from '@/i18n/ru'

export function AnswerWithPicker({
  value,
  onChange,
}: {
  value: AnswerSide
  onChange: (side: AnswerSide) => void
}) {
  return (
    <SegmentedField
      label={t.study.answerWith}
      value={value}
      onChange={onChange}
      options={[
        { value: 'definition', label: t.study.withDefinition },
        { value: 'term', label: t.study.withTerm },
      ]}
    />
  )
}
