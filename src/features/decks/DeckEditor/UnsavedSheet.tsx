import { Button, Sheet } from '@/design'
import { t } from '@/i18n/ru'

export function UnsavedSheet({
  open,
  canSave,
  onClose,
  onSave,
  onDiscard,
}: {
  open: boolean
  canSave: boolean
  onClose: () => void
  onSave: () => void
  onDiscard: () => void
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.editor.unsavedTitle}
      footer={
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            block
            disabled={!canSave}
            onClick={onSave}
            data-autofocus
          >
            {t.editor.saveAndLeave}
          </Button>
          <Button type="button" variant="danger" block onClick={onDiscard}>
            {t.editor.leaveWithoutSaving}
          </Button>
        </div>
      }
    >
      <p className="text-ink-2">{t.editor.unsaved}</p>
    </Sheet>
  )
}
