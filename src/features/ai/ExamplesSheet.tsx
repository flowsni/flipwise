import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettingsSheet } from '../../app/SettingsContext'
import { updateCardExamples } from '../../db/decks'
import type { Card, Deck, ExampleItem } from '../../db/types'
import { Button } from '../../design/Button'
import { cx } from '../../design/cx'
import { IconRefresh, IconSparkles, IconTrash } from '../../design/icons'
import { Sheet } from '../../design/Sheet'
import { useToast } from '../../design/Toast'
import { t } from '../../i18n/ru'
import { SpeakButton } from '../tts/SpeakButton'
import { AiError, type AiErrorCode } from './errors'
import { generateExamples } from './examples'
import { isMonolingual, parseMarked, stripMarks } from './prompt'
import { useAiSettings } from './settings'

/** Bottom sheet with AI example sentences for one card; results are cached on the card. */
export function ExamplesSheet({
  card,
  deck,
  onClose,
}: {
  card: Card | null
  deck: Deck
  onClose: () => void
}) {
  return (
    <Sheet open={!!card} onClose={onClose} title={card ? card.term : t.examples.title}>
      {card && <ExamplesBody key={card.id} card={card} deck={deck} onClose={onClose} />}
    </Sheet>
  )
}

function ExamplesBody({ card, deck, onClose }: { card: Card; deck: Deck; onClose: () => void }) {
  const ai = useAiSettings()
  const settings = useSettingsSheet()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AiErrorCode | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const examples = card.examples

  const generate = useCallback(async () => {
    if (!ai.provider || !ai.key) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const { items } = await generateExamples(
        {
          term: card.term,
          definition: card.definition,
          termLang: deck.termLang,
          defLang: deck.defLang,
          level: deck.level,
        },
        { provider: ai.provider, apiKey: ai.key, model: ai.model },
        controller.signal,
      )
      await updateCardExamples(card.id, {
        items,
        provider: ai.provider,
        model: ai.model,
        createdAt: Date.now(),
      })
    } catch (e) {
      const code = e instanceof AiError ? e.code : 'unknown'
      if (code !== 'aborted') {
        console.warn('AI examples failed', e)
        setError(code)
      }
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [ai.provider, ai.key, ai.model, card, deck])

  // First open without cached examples generates right away.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on mount
  useEffect(() => {
    if (!examples && ai.ready) generate()
    return () => abortRef.current?.abort()
  }, [])

  if (!ai.ready && !examples) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-sun-soft text-[#7a5400] dark:text-sun">
          <IconSparkles size={30} />
        </span>
        <p className="max-w-xs text-ink-2">{t.examples.noKey}</p>
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            onClose()
            settings.open('ai')
          }}
        >
          {t.examples.openSettings}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="-mt-1 text-ink-2" lang={deck.defLang}>
        {card.definition}
      </p>

      <div aria-live="polite" aria-busy={loading} className="flex flex-col gap-3">
        {loading && <Skeleton />}
        {!loading && error && (
          <div className="flex flex-col items-start gap-3 rounded-2xl bg-bad-soft p-4">
            <p className="text-bad">
              {t.examples.errors[error as keyof typeof t.examples.errors] ??
                t.examples.errors.unknown}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="raised" onClick={generate}>
                {t.examples.retry}
              </Button>
              {(error === 'auth' || error === 'model' || error === 'no-key') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onClose()
                    settings.open('ai')
                  }}
                >
                  {t.examples.openSettings}
                </Button>
              )}
            </div>
          </div>
        )}
        {!loading &&
          examples?.items.map((item, i) => (
            <ExampleRow
              key={`${examples.createdAt}-${item.text}`}
              item={item}
              index={i}
              deck={deck}
            />
          ))}
      </div>

      {examples && !loading && (
        <p className="text-xs text-ink-3">{t.examples.generatedBy(examples.model)}</p>
      )}

      <div className="flex gap-3 pt-1">
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          disabled={loading || !ai.ready}
          onClick={generate}
        >
          <IconRefresh size={20} />
          {t.examples.more}
        </Button>
        {examples && (
          <Button
            variant="soft"
            size="lg"
            aria-label={t.examples.delete}
            disabled={loading}
            onClick={async () => {
              const previous = examples
              await updateCardExamples(card.id, undefined)
              toast.show({
                message: t.examples.deleted,
                action: { label: t.app.undo, onClick: () => updateCardExamples(card.id, previous) },
              })
            }}
          >
            <IconTrash size={20} />
          </Button>
        )}
      </div>
    </div>
  )
}

function ExampleRow({ item, index, deck }: { item: ExampleItem; index: number; deck: Deck }) {
  const [open, setOpen] = useState(false)
  const mono = isMonolingual(deck)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: index * 0.07, type: 'spring', stiffness: 380, damping: 30 },
      }}
      className="flex items-start gap-1 rounded-2xl border border-line bg-surface-2/50 py-1 pr-1 pl-1"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="min-h-12 flex-1 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2"
      >
        <span lang={deck.termLang} className="block text-[1.0625rem] leading-relaxed">
          <Marked text={item.text} />
        </span>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.span
              key="tr"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              lang={mono ? deck.termLang : deck.defLang}
              className="block overflow-hidden pt-1.5 text-ink-2"
            >
              <Marked text={item.translation} />
            </motion.span>
          ) : (
            <motion.span
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="block pt-1 text-sm text-ink-3"
            >
              {mono ? t.examples.showExplanation : t.examples.showTranslation}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <SpeakButton text={stripMarks(item.text)} lang={deck.termLang} />
    </motion.div>
  )
}

/** Renders [[marked]] words as <mark>; model output is always treated as text, never HTML. */
function Marked({ text }: { text: string }) {
  return (
    <>
      {parseMarked(text).map((seg, i) =>
        seg.mark ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static segments
          <mark key={i} className="font-semibold">
            {seg.text}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: static segments
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  )
}

function Skeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className={cx('flex flex-col gap-2 rounded-2xl border border-line p-4')}>
          <div className="skeleton h-4 w-[92%]" />
          <div className="skeleton h-4 w-[64%]" />
        </div>
      ))}
    </>
  )
}
