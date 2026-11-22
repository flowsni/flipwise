import { Button, IconChevronDown, Sheet } from '@/design'
import { StudyScopePicker, scopeLabels } from '@/features/study/StudyScopePicker'
import type { ScopeOptions } from '@/features/study/scope'
import { t } from '@/i18n/ru'

type Counts = Parameters<typeof StudyScopePicker>[0]['counts']

/** The chip above the card that shows the current scope and opens the sheet. */
export function ScopeChip({
  scope,
  count,
  onClick,
}: {
  scope: ScopeOptions['scope']
  count: number
  onClick: () => void
}) {
  const label = t.scope.chip(scopeLabels[scope], count)
  return (
    <div className="mb-3 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={t.scope.change(label)}
        className="inline-flex min-h-11 items-center gap-1 rounded-full bg-surface-2 px-3.5 text-[0.875rem] font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
      >
        {label}
        <IconChevronDown size={14} />
      </button>
    </div>
  )
}

export function ScopeSheet({
  open,
  onClose,
  counts,
  scope,
  limit,
  onChange,
}: {
  open: boolean
  onClose: () => void
  counts: Counts
  scope: ScopeOptions['scope']
  limit: ScopeOptions['limit']
  onChange: (options: ScopeOptions) => void
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.scope.title}
      footer={
        <Button variant="primary" size="lg" block onClick={onClose}>
          {t.app.done}
        </Button>
      }
    >
      <StudyScopePicker
        counts={counts}
        scope={scope}
        onScope={(s) => onChange({ scope: s, limit })}
        limit={limit}
        onLimit={(l) => onChange({ scope, limit: l })}
      />
    </Sheet>
  )
}
