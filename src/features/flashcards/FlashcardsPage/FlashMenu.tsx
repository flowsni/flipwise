import { IconRefresh, IconShuffle, Menu } from '@/design'
import type { FlashContent } from '@/features/flashcards/sentences'
import { t } from '@/i18n/ru'

export function FlashMenu({
  content,
  shuffled,
  onShuffle,
  front,
  onFront,
  onRestart,
}: {
  content: FlashContent
  shuffled: boolean
  onShuffle: () => void
  front: 'term' | 'definition'
  onFront: (side: 'term' | 'definition') => void
  onRestart: () => void
}) {
  return (
    <Menu
      label={t.study.options}
      sections={[
        {
          items: [
            {
              label: t.study.shuffle,
              icon: <IconShuffle />,
              checked: shuffled,
              onSelect: onShuffle,
            },
          ],
        },
        // Sentences always go translation → original.
        ...(content === 'words'
          ? [
              {
                title: t.study.showFirst,
                items: [
                  {
                    label: t.study.termSide,
                    checked: front === 'term',
                    onSelect: () => onFront('term'),
                  },
                  {
                    label: t.study.definitionSide,
                    checked: front === 'definition',
                    onSelect: () => onFront('definition'),
                  },
                ],
              },
            ]
          : []),
        { items: [{ label: t.flash.restart, icon: <IconRefresh />, onSelect: onRestart }] },
      ]}
    />
  )
}
