import { Segmented } from '../../design/Field'
import { t } from '../../i18n/ru'
import { useSetting } from '../../lib/storage'
import { STUDY_LIMITS, STUDY_SCOPES, type StudyLimit, type StudyScope } from './scope'

export const scopeLabels: Record<StudyScope, string> = {
  all: t.scope.all,
  unknown: t.scope.unknown,
  starred: t.scope.starred,
}

/** The remembered scope and session size, shared by all study modes. */
export function useStudyScope() {
  const [scope, setScope] = useSetting<StudyScope>('study.scope', 'all')
  const [limit, setLimit] = useSetting<StudyLimit>('study.limit', 0)
  return {
    scope: STUDY_SCOPES.includes(scope) ? scope : 'all',
    setScope,
    limit: STUDY_LIMITS.includes(limit) ? limit : 0,
    setLimit,
  }
}

/** «Все / Незнакомые / Избранные» with counters; empty scopes are disabled. */
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
      <div className="flex flex-col gap-2">
        <span className="text-[0.9375rem] font-medium text-ink-2">{t.scope.which}</span>
        <Segmented
          label={t.scope.which}
          value={scope}
          onChange={onScope}
          options={STUDY_SCOPES.map((s) => ({
            value: s,
            label: scopeLabels[s],
            detail: String(counts[s]),
            disabled: counts[s] === 0,
          }))}
        />
      </div>
      {limit !== undefined && onLimit && (
        <div className="flex flex-col gap-2">
          <span className="text-[0.9375rem] font-medium text-ink-2">{t.scope.size}</span>
          <Segmented
            label={t.scope.size}
            value={limit}
            onChange={onLimit}
            options={STUDY_LIMITS.map((l) => ({
              value: l,
              label: l ? String(l) : t.scope.sizeAll,
            }))}
          />
        </div>
      )}
    </div>
  )
}
