import { type RefObject, useEffect, useRef, useState } from 'react'
import { useSettingsSheet } from '../../app/SettingsContext'
import { setExamplesIfUnchanged } from '../../db/decks'
import type { Card, Deck, Level } from '../../db/types'
import { Button } from '../../design/Button'
import { Segmented } from '../../design/Field'
import { IconSparkles } from '../../design/icons'
import { ProgressBar } from '../../design/Progress'
import { Sheet } from '../../design/Sheet'
import { useToast } from '../../design/Toast'
import { t } from '../../i18n/ru'
import { batchCount, generateDeckExamples } from './bulk'
import type { AiErrorCode } from './errors'
import { LevelPicker } from './LevelPicker'
import { NoKey } from './NoKey'
import { useAiSettings } from './settings'

type Which = 'missing' | 'all'

/** «Примеры для всей колоды»: generates examples for many cards at once. */
export function BulkExamplesSheet({
  open,
  deck,
  cards,
  onClose,
}: {
  open: boolean
  deck: Deck
  /** Live cards of the deck. */
  cards: Card[]
  onClose: () => void
}) {
  const abortRef = useRef<AbortController | null>(null)
  // Closing the sheet stops the run right away; finished batches are already saved.
  const close = () => {
    abortRef.current?.abort()
    onClose()
  }
  return (
    <Sheet open={open} onClose={close} title={t.bulk.title}>
      <BulkBody deck={deck} cards={cards} onClose={close} abortRef={abortRef} />
    </Sheet>
  )
}

function BulkBody({
  deck,
  cards,
  onClose,
  abortRef,
}: {
  deck: Deck
  cards: Card[]
  onClose: () => void
  abortRef: RefObject<AbortController | null>
}) {
  const ai = useAiSettings()
  const settings = useSettingsSheet()
  const toast = useToast()
  const missingCount = cards.filter((c) => !c.examples?.items.length).length
  const [which, setWhich] = useState<Which>(missingCount ? 'missing' : 'all')
  const [level, setLevel] = useState<Level>(deck.level)
  const [run, setRun] = useState<{ saved: number; total: number } | null>(null)
  const [error, setError] = useState<{ code: AiErrorCode; saved: number } | null>(null)
  // Leaving the page while generating stops too.
  useEffect(() => () => abortRef.current?.abort(), [abortRef])

  if (!ai.ready || !ai.provider) return <NoKey onClose={onClose} />
  const provider = ai.provider

  const targetCount = which === 'all' ? cards.length : missingCount

  const start = async () => {
    const targets = which === 'all' ? cards : cards.filter((c) => !c.examples?.items.length)
    // «Все заново» replaces examples: keep the old ones for «Отменить».
    const snapshot =
      which === 'all'
        ? targets.map(({ id, term, definition, examples }) => ({ id, term, definition, examples }))
        : null
    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    setRun({ saved: 0, total: targets.length })
    const result = await generateDeckExamples(
      targets,
      deck,
      { provider, apiKey: ai.key, model: ai.model },
      {
        level,
        signal: controller.signal,
        onProgress: (saved, total) => setRun({ saved, total }),
      },
    )
    if (abortRef.current === controller) abortRef.current = null
    setRun(null)

    const undo =
      snapshot && result.saved
        ? {
            label: t.app.undo,
            onClick: () => {
              for (const { examples, ...card } of snapshot) setExamplesIfUnchanged(card, examples)
            },
          }
        : undefined

    if (result.error === 'aborted') {
      if (result.saved) toast.show({ message: t.bulk.stopped(result.saved), action: undo })
      return
    }
    if (result.error) {
      setError({ code: result.error, saved: result.saved })
      if (undo) toast.show({ message: t.bulk.savedSoFar(result.saved), action: undo })
      return
    }
    toast.show({
      message: result.failed
        ? t.bulk.partial(result.saved, result.failed)
        : t.bulk.done(result.saved),
      action: undo,
    })
    onClose()
  }

  if (run) {
    return (
      <div className="flex flex-col gap-4 pt-2" aria-live="polite">
        <p className="text-[1.0625rem] font-semibold">{t.bulk.progress(run.saved, run.total)}</p>
        <ProgressBar
          value={run.total ? run.saved / run.total : 0}
          label={t.bulk.progress(run.saved, run.total)}
        />
        <p className="text-[0.9375rem] text-ink-3">{t.bulk.closeHint}</p>
        <Button variant="raised" size="lg" block onClick={() => abortRef.current?.abort()}>
          {t.bulk.stop}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-[0.9375rem] font-medium text-ink-2">{t.bulk.which}</span>
        <Segmented
          label={t.bulk.which}
          value={which}
          onChange={setWhich}
          options={[
            {
              value: 'missing',
              label: t.bulk.missing,
              detail: String(missingCount),
              disabled: !missingCount,
            },
            { value: 'all', label: t.bulk.all, detail: String(cards.length) },
          ]}
        />
      </div>

      <LevelPicker value={level} onChange={setLevel} />

      {error && (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-bad-soft p-4" role="alert">
          <p className="text-bad">
            {t.examples.errors[error.code as keyof typeof t.examples.errors] ??
              t.examples.errors.unknown}
          </p>
          {error.saved > 0 && <p className="text-ink-2">{t.bulk.savedSoFar(error.saved)}</p>}
          {(error.code === 'auth' || error.code === 'model' || error.code === 'no-key') && (
            <Button
              size="sm"
              variant="raised"
              onClick={() => {
                onClose()
                settings.open('ai')
              }}
            >
              {t.examples.openSettings}
            </Button>
          )}
        </div>
      )}

      <p className="text-[0.9375rem] text-ink-3">
        {targetCount ? t.bulk.requests(targetCount, batchCount(targetCount)) : t.bulk.nothing}
      </p>

      <Button variant="primary" size="lg" block disabled={!targetCount} onClick={start}>
        <IconSparkles size={20} />
        {t.bulk.start}
      </Button>
    </div>
  )
}
