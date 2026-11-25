import { motion, Reorder, useDragControls } from 'motion/react'
import { IconButton, IconGrip, IconX, inputClass } from '@/design'
import { t } from '@/i18n/ru'
import type { Row } from './useDeckRows'

export function EditorRow({
  row,
  index,
  termLang,
  defLang,
  duplicateOf,
  onChange,
  onRemove,
  onPaste,
  onEnterLast,
  hidden,
  draggable,
}: {
  row: Row
  index: number
  termLang: string
  defLang: string
  duplicateOf?: string
  onChange: (patch: Partial<Row>) => void
  onRemove: () => void
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void
  onEnterLast?: () => void
  /** Filtered out: kept mounted (focus and typed text survive) but not shown. */
  hidden?: boolean
  draggable?: boolean
}) {
  const controls = useDragControls()
  const hintId = `dup-${row.key}`
  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      data-row={row.key}
      hidden={hidden}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      whileDrag={{ scale: 1.02, boxShadow: 'var(--fw-shadow-float)' }}
      className="relative flex scroll-mb-28 items-stretch gap-1 rounded-2xl border border-line bg-surface p-2"
    >
      {draggable !== false && (
        <button
          type="button"
          aria-label={`${t.editor.dragRow} ${index + 1}`}
          className="flex w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 active:cursor-grabbing"
          onPointerDown={(e) => controls.start(e)}
        >
          <IconGrip size={18} />
        </button>
      )}
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
        <input
          aria-label={`${t.editor.term} ${index + 1}`}
          placeholder={t.editor.term}
          lang={termLang}
          enterKeyHint="next"
          autoCapitalize="none"
          autoCorrect="off"
          value={row.term}
          aria-describedby={duplicateOf ? hintId : undefined}
          onChange={(e) => onChange({ term: e.target.value })}
          onPaste={onPaste}
          className={`${inputClass} border-transparent bg-surface-2 font-medium`}
        />
        <input
          aria-label={`${t.editor.definition} ${index + 1}`}
          placeholder={t.editor.definition}
          lang={defLang}
          enterKeyHint="next"
          autoCapitalize="none"
          autoCorrect="off"
          value={row.definition}
          onChange={(e) => onChange({ definition: e.target.value })}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnterLast) {
              e.preventDefault()
              onEnterLast()
            }
          }}
          className={`${inputClass} border-transparent bg-surface-2`}
        />
        {duplicateOf && (
          <p id={hintId} className="px-1 text-[0.875rem] text-sun-ink sm:col-span-2">
            {duplicateOf}
          </p>
        )}
      </div>
      <motion.div className="flex items-center">
        <IconButton size="sm" label={`${t.editor.removeRow} ${index + 1}`} onClick={onRemove}>
          <IconX size={18} />
        </IconButton>
      </motion.div>
    </Reorder.Item>
  )
}
