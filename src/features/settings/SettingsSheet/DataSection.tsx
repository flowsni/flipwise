import { useState } from 'react'
import { clearQueryCache, db } from '@/db'
import { Button, IconDownload, IconUpload, useToast } from '@/design'
import { t } from '@/i18n/ru'
import {
  type Backup,
  BackupError,
  backupFileName,
  exportAll,
  importBackup,
  parseBackup,
  pickFile,
  shareOrDownloadJson,
} from '@/lib'
import { Section } from './Section'

export function DataSection() {
  const toast = useToast()
  const [pending, setPending] = useState<Backup | null>(null)

  const onExport = async () => {
    const backup = await exportAll(db)
    // The share sheet on phones: iOS PWAs download files poorly.
    const result = await shareOrDownloadJson(backup, backupFileName(backup), t.settings.exportAll)
    if (result !== 'cancelled') toast.show({ message: t.settings.exported })
  }

  const onImport = async () => {
    const file = await pickFile('application/json,.json')
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      // A shared single deck is simply added; a full backup asks how to import.
      if (backup.kind === 'deck') {
        const n = await importBackup(db, backup, 'merge')
        clearQueryCache()
        toast.show({ message: t.settings.imported(n) })
      } else {
        setPending(backup)
      }
    } catch (e) {
      if (!(e instanceof BackupError)) console.error(e)
      toast.show({ message: t.settings.importError })
    }
  }

  const finish = async (mode: 'replace' | 'merge') => {
    if (!pending) return
    const n = await importBackup(db, pending, mode)
    // Forms copy their first value from the cache into state: it must not predate the restore.
    clearQueryCache()
    setPending(null)
    toast.show({ message: t.settings.imported(n) })
  }

  return (
    <Section title={t.settings.data} id="settings-data">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="raised" size="lg" onClick={onExport}>
          <IconDownload size={20} />
          {t.settings.exportAll}
        </Button>
        <Button variant="raised" size="lg" onClick={onImport}>
          <IconUpload size={20} />
          {t.settings.importFile}
        </Button>
      </div>
      {pending && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <p className="font-medium">
            {t.settings.importMode}{' '}
            <span className="text-ink-2">({t.plural.decks(pending.decks.length)})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => finish('merge')}>
              {t.settings.importMerge}
            </Button>
            <Button variant="danger" onClick={() => finish('replace')}>
              {t.settings.importReplace}
            </Button>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {t.app.cancel}
            </Button>
          </div>
        </div>
      )}
      <p className="text-[0.9375rem] text-ink-2">{t.settings.storageNote}</p>
    </Section>
  )
}
