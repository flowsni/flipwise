import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../design/Button'
import { cx } from '../../design/cx'
import { Checkbox, Input, inputClass, Segmented } from '../../design/Field'
import { Sheet } from '../../design/Sheet'
import { t } from '../../i18n/ru'
import { findDuplicates } from '../../lib/duplicates'
import {
  type CardSeparator,
  guessOptions,
  type ParsedCard,
  parseImport,
  type TermSeparator,
} from '../../lib/importParser'

type TermKind = 'tab' | 'comma' | 'custom'
type CardKind = 'newline' | 'semicolon' | 'custom'

function termKind(sep: TermSeparator): TermKind {
  return typeof sep === 'string' ? sep : 'custom'
}
function cardKind(sep: CardSeparator): CardKind {
  return typeof sep === 'string' ? sep : 'custom'
}

export function ImportSheet({
  open,
  onClose,
  onImport,
  initialText = '',
  existingTerms = [],
  lang,
}: {
  open: boolean
  onClose: () => void
  onImport: (cards: ParsedCard[]) => void
  initialText?: string
  /** Terms already in the deck, to warn about and optionally skip duplicates. */
  existingTerms?: readonly string[]
  /** Term language, for article-aware duplicate matching. */
  lang?: string
}) {
  const [text, setText] = useState(initialText)
  const [termSep, setTermSep] = useState<TermKind>('tab')
  const [termCustom, setTermCustom] = useState(' - ')
  const [cardSep, setCardSep] = useState<CardKind>('newline')
  const [cardCustom, setCardCustom] = useState('\\n\\n')
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  useEffect(() => {
    if (!open) return
    setText(initialText)
    if (initialText) {
      const g = guessOptions(initialText)
      setTermSep(termKind(g.termSep))
      if (typeof g.termSep !== 'string') setTermCustom(g.termSep.custom)
      setCardSep(cardKind(g.cardSep))
    }
  }, [open, initialText])

  const result = useMemo(
    () =>
      parseImport(text, {
        termSep: termSep === 'custom' ? { custom: termCustom } : termSep,
        cardSep: cardSep === 'custom' ? { custom: cardCustom } : cardSep,
      }),
    [text, termSep, termCustom, cardSep, cardCustom],
  )

  const onTextChange = (value: string) => {
    if (!text && value) {
      const g = guessOptions(value)
      setTermSep(termKind(g.termSep))
      if (typeof g.termSep !== 'string') setTermCustom(g.termSep.custom)
      setCardSep(cardKind(g.cardSep))
    }
    setText(value)
  }

  // A card is a duplicate when its term is already in the deck or earlier in the import.
  const isDuplicate = findDuplicates([...existingTerms, ...result.cards.map((c) => c.term)], lang)
    .slice(existingTerms.length)
    .map((first) => first >= 0)
  const duplicateCount = isDuplicate.filter(Boolean).length
  const toImport = skipDuplicates ? result.cards.filter((_, i) => !isDuplicate[i]) : result.cards
  const count = toImport.length

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.import.title}
      wide
      footer={
        <Button
          variant="primary"
          size="lg"
          block
          disabled={!count}
          onClick={() => {
            onImport(toImport)
            onClose()
          }}
        >
          {count ? t.import.submit(count) : t.import.nothing}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-[0.9375rem] text-ink-2">{t.import.hint}</p>
        <textarea
          data-autofocus
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={t.import.placeholder}
          aria-label={t.import.title}
          rows={6}
          spellCheck={false}
          className={`${inputClass} min-h-36 resize-y font-mono text-[0.9375rem] leading-relaxed`}
          onKeyDown={(e) => {
            // Let users type real tabs, like in a spreadsheet.
            if (e.key === 'Tab' && !e.shiftKey && termSep === 'tab') {
              e.preventDefault()
              const el = e.currentTarget
              const { selectionStart: s, selectionEnd: end } = el
              const next = `${text.slice(0, s)}\t${text.slice(end)}`
              setText(next)
              requestAnimationFrame(() => el.setSelectionRange(s + 1, s + 1))
            }
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-[0.9375rem] font-medium text-ink-2">{t.import.termSep}</span>
            <Segmented
              label={t.import.termSep}
              value={termSep}
              onChange={setTermSep}
              options={[
                { value: 'tab', label: t.import.tab },
                { value: 'comma', label: t.import.comma },
                { value: 'custom', label: t.import.custom },
              ]}
            />
            {termSep === 'custom' && (
              <Input
                aria-label={t.import.termSep}
                value={termCustom}
                onChange={(e) => setTermCustom(e.target.value)}
                placeholder={t.import.customPlaceholder}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[0.9375rem] font-medium text-ink-2">{t.import.cardSep}</span>
            <Segmented
              label={t.import.cardSep}
              value={cardSep}
              onChange={setCardSep}
              options={[
                { value: 'newline', label: t.import.newline },
                { value: 'semicolon', label: ';' },
                { value: 'custom', label: t.import.custom },
              ]}
            />
            {cardSep === 'custom' && (
              <Input
                aria-label={t.import.cardSep}
                value={cardCustom}
                onChange={(e) => setCardCustom(e.target.value)}
              />
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-baseline gap-x-2" aria-live="polite">
            <span className="font-semibold">{t.import.found(result.cards.length)}</span>
            {result.skipped.length > 0 && (
              <span className="text-[0.9375rem] text-ink-3">
                · {t.import.skipped(result.skipped.length)}
              </span>
            )}
            {duplicateCount > 0 && (
              <span className="text-[0.9375rem] text-sun-ink">
                · {t.import.duplicates(duplicateCount)}
              </span>
            )}
          </div>
          {duplicateCount > 0 && (
            <Checkbox checked={skipDuplicates} onChange={setSkipDuplicates}>
              {t.import.skipDuplicates}
            </Checkbox>
          )}
          {result.cards.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-xl border border-line">
              <table className="w-full text-left text-[0.9375rem]">
                <thead className="sticky top-0 bg-surface-2 text-ink-2">
                  <tr>
                    <th className="w-10 px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">{t.editor.term}</th>
                    <th className="px-3 py-2 font-medium">{t.editor.definition}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cards.slice(0, 200).map((c, i) => (
                    <tr
                      // biome-ignore lint/suspicious/noArrayIndexKey: preview rows have no identity
                      key={i}
                      className={cx(
                        'border-t border-line align-top',
                        skipDuplicates && isDuplicate[i] && 'text-ink-3 line-through',
                      )}
                    >
                      <td className="px-3 py-2 text-ink-3 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2 break-words">{c.term}</td>
                      <td className="px-3 py-2 break-words text-ink-2">{c.definition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}
