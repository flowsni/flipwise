import { useNavigate } from 'react-router'
import { useBack } from '@/app/useBack'
import { type Deck, db, deleteDeck } from '@/db'
import { IconEdit, IconShare, IconSparkles, IconTrash, IconUpload, Menu } from '@/design'
import { t } from '@/i18n/ru'
import { backupFileName, exportDeck, shareOrDownloadJson } from '@/lib'
import { useUndoableDelete } from './useUndoableDelete'

export function DeckMenu({
  deck,
  hasCards,
  onImport,
  onBulk,
}: {
  deck: Deck
  hasCards: boolean
  onImport: () => void
  onBulk: () => void
}) {
  const navigate = useNavigate()
  const back = useBack('/')
  const deleteWithUndo = useUndoableDelete()

  const onDelete = () => deleteWithUndo(() => deleteDeck(deck.id), t.deck.deleted(deck.title), back)

  const onShare = async () => {
    const data = await exportDeck(db, deck.id)
    await shareOrDownloadJson(data, backupFileName(data), deck.title)
  }

  return (
    <Menu
      label={t.app.more}
      sections={[
        {
          items: [
            {
              label: t.deck.edit,
              icon: <IconEdit />,
              onSelect: () => navigate(`/deck/${deck.id}/edit`),
            },
            { label: t.deck.import, icon: <IconUpload />, onSelect: onImport },
            { label: t.deck.share, icon: <IconShare />, onSelect: onShare },
          ],
        },
        ...(hasCards
          ? [{ items: [{ label: t.bulk.open, icon: <IconSparkles />, onSelect: onBulk }] }]
          : []),
        {
          items: [{ label: t.deck.delete, icon: <IconTrash />, danger: true, onSelect: onDelete }],
        },
      ]}
    />
  )
}
