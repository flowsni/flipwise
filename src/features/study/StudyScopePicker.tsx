import { useSearchParams } from 'react-router'
import { SegmentedField } from '@/design'
import { t } from '@/i18n/ru'
import { useSetting } from '@/lib'
import { STUDY_LIMITS, STUDY_SCOPES, type StudyLimit, type StudyScope } from './scope'

export const scopeLabels: Record<StudyScope, string> = {
  all: t.scope.all,
  unknown: t.scope.unknown,
  starred: t.scope.starred,
  hard: t.scope.hard,
}

/** "?scope=" (the deck page's hard-words buttons) wins over the remembered scope, for this visit only. */
export function useStudyScope() {
  const [params, setParams] = useSearchParams()
  const [saved, setSaved] = useSetting<StudyScope>('study.scope', 'all')
  const [limit, setLimit] = useSetting<StudyLimit>('study.limit', 0)
  const scope = (params.get('scope') as StudyScope | null) ?? saved
  const setScope = (s: StudyScope) => {
    setSaved(s)
    if (params.has('scope'))
      setParams(
        (p) => {
          p.delete('scope')
          return p
        },
        { replace: true, preventScrollReset: true },
      )
  }
  return {
    scope: STUDY_SCOPES.includes(scope) ? scope : 'all',
    setScope,
    limit: STUDY_LIMITS.includes(limit) ? limit : 0,
    setLimit,
  }
}

export function StudyScopePicker({
  counts,
  scope,
  onScope,
  limit,
  onLimit,
}: {
  counts: Readonly<Record<StudyScope, number>>
  scope: StudyScope
  onScope: (s: StudyScope) => void
  /** Leave out to hide the session size (Test has its own question count). */
  limit?: StudyLimit
  onLimit?: (l: StudyLimit) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <SegmentedField
        label={t.scope.which}
        grid
        value={scope}
        onChange={onScope}
        options={STUDY_SCOPES.map((s) => ({
          value: s,
          label: scopeLabels[s],
          detail: String(counts[s]),
          disabled: counts[s] === 0,
        }))}
      />
      {limit !== undefined && onLimit && (
        <SegmentedField
          label={t.scope.size}
          value={limit}
          onChange={onLimit}
          options={STUDY_LIMITS.map((l) => ({
            value: l,
            label: l ? String(l) : t.scope.sizeAll,
          }))}
        />
      )}
    </div>
  )
}
