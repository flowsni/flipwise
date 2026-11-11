import { type RefObject, useEffect, useRef, useState } from 'react'
import { setExamplesIfUnchanged } from '../../db/decks'
import type { Card, Deck, Level } from '../../db/types'
import { Button } from '../../design/Button'
import { Segmented } from '../../design/Field'
import { IconSparkles } from '../../design/icons'
import { ProgressBar } from '../../design/Progress'
import { Sheet } from '../../design/Sheet'
import { useToast } from '../../design/Toast'
import { t } from '../../i18n/ru'
import { hasExamples } from '../../lib/examples'
import { AiErrorBox } from './AiErrorBox'
import { type BulkProgress, batchCount, generateDeckExamples } from './bulk'
import type { AiErrorCode } from './errors'
import { LevelPicker } from './LevelPicker'
import { NoKey } from './NoKey'
import { useAiSettings } from './settings'

type Which = 'missing' | 'all'

const STOP_GUARD_MS = 600

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
  const toast = useToast()
  const missingCount = cards.filter((c) => !hasExamples(c)).length
  const [picked, setWhich] = useState<Which>('missing')
  // «Без примеров» stops making sense once every card has examples (e.g. after a run).
  const which: Which = picked === 'missing' && !missingCount ? 'all' : picked
  const [level, setLevel] = useState<Level>(deck.level)
  const [run, setRun] = useState<BulkProgress | null>(null)
  const [error, setError] = useState<{ code: AiErrorCode; saved: number } | null>(null)
  // The run this body started. On unmount (e.g. leaving the page) only that one is stopped: the
  // body unmounts after the sheet's exit animation, when a reopened sheet may have a new run.
  const ownRun = useRef<AbortController | null>(null)
  useEffect(() => () => ownRun.current?.abort(), [])
  // «Остановить» appears where «Сгенерировать» was: a double tap must not stop the run at once.
  const startedAt = useRef(0)

  if (!ai.ready || !ai.provider) return <NoKey onClose={onClose} />
  const provider = ai.provider

  const targetCount = which === 'all' ? cards.length : missingCount

  const start = async () => {
    const targets = which === 'all' ? cards : cards.filter((c) => !hasExamples(c))
    // «Все заново» replaces examples: keep the old ones for «Отменить».
    const snapshot =
      which === 'all'
        ? targets.map(({ id, term, definition, examples }) => ({
            card: { id, term, definition },
            examples,
          }))
        : null
    const controller = new AbortController()
    abortRef.current = controller
    ownRun.current = controller
    startedAt.current = Date.now()
    setError(null)
    setRun({ saved: 0, done: 0, total: targets.length })
    const result = await generateDeckExamples(
      targets,
      deck,
      { provider, apiKey: ai.key, model: ai.model },
      {
        level,
        signal: controller.signal,
        onProgress: setRun,
      },
    )
    if (abortRef.current === controller) abortRef.current = null
    if (ownRun.current === controller) ownRun.current = null
    setRun(null)

    const undo =
      snapshot && result.saved
        ? {
            label: t.app.undo,
            onClick: () => {
              // Only cards still holding this run's examples: newer ones made since stay.
              setExamplesIfUnchanged(snapshot, { replacing: result.createdAt }).catch((e) =>
                console.warn('Restoring examples failed', e),
              )
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
        <p className="text-[1.0625rem] font-semibold">{t.bulk.progress(run.done, run.total)}</p>
        <ProgressBar
          value={run.total ? run.done / run.total : 0}
          label={t.bulk.progress(run.done, run.total)}
        />
        <p className="text-[0.9375rem] text-ink-3">{t.bulk.closeHint}</p>
        <Button
          variant="raised"
          size="lg"
          block
          onClick={() => {
            if (Date.now() - startedAt.current > STOP_GUARD_MS) abortRef.current?.abort()
          }}
        >
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
        <AiErrorBox code={error.code} onClose={onClose}>
          {error.saved > 0 && <p className="text-ink-2">{t.bulk.savedSoFar(error.saved)}</p>}
        </AiErrorBox>
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
