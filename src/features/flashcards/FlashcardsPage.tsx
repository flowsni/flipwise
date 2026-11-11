import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { NotFound } from '../../app/RouteError'
import { db } from '../../db/db'
import { useDeckProgress } from '../../db/hooks'
import { setFlash, toggleStar, updateProgress } from '../../db/progress'
import type { Card, Deck, FlashStatus } from '../../db/types'
import { Button, IconButton } from '../../design/Button'
import { IconRefresh, IconShuffle, IconUndo } from '../../design/icons'
import { Menu } from '../../design/Menu'
import { enterSpring, softSpring } from '../../design/motion'
import { CountUp, Ring } from '../../design/Progress'
import { StudyBar, shortcutsBlocked } from '../../design/StudyBar'
import { t } from '../../i18n/ru'
import { shuffle } from '../../lib/shuffle'
import { useSetting } from '../../lib/storage'
import { ExamplesSheet } from '../ai/ExamplesSheet'
import { useStudyDeck } from '../study/useStudyDeck'
import { SwipeCard, type SwipeCardHandle, type SwipeDir } from './SwipeCard'

interface HistoryEntry {
  cardId: string
  /** Queue position the card was shown at, so undo returns exactly there. */
  index: number
  dir: SwipeDir
  prev: FlashStatus
}

export function FlashcardsPage() {
  const { deckId } = useParams()
  const { deck, cards, cardsById, loading } = useStudyDeck(deckId)
  if (!loading && (!deck || !cards?.length)) return <NotFound />
  if (loading || !deck || !cards) return null
  return <Flashcards key={deck.id} deck={deck} initialCards={cards} cardsById={cardsById} />
}

function Flashcards({
  deck,
  initialCards,
  cardsById,
}: {
  deck: Deck
  initialCards: Card[]
  cardsById: Map<string, Card>
}) {
  const navigate = useNavigate()
  const deckId = deck.id
  const [shuffled, setShuffled] = useSetting('flash.shuffle', false)
  const [front, setFront] = useSetting<'term' | 'definition'>('flash.front', 'term')
  const order = useCallback((ids: string[]) => (shuffled ? shuffle(ids) : ids), [shuffled])
  const [queue, setQueue] = useState(() => order(initialCards.map((c) => c.id)))
  const [index, setIndex] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [enterFrom, setEnterFrom] = useState<SwipeDir | undefined>()
  const [examplesFor, setExamplesFor] = useState<Card | null>(null)
  const [announce, setAnnounce] = useState('')
  const progress = useDeckProgress(deckId)
  const cardRef = useRef<SwipeCardHandle>(null)
  const busy = useRef(false)

  const done = index >= queue.length
  const currentId = queue[index]
  const current = currentId ? cardsById.get(currentId) : undefined
  const next = queue[index + 1] ? cardsById.get(queue[index + 1]!) : undefined

  // Skip cards deleted mid-session.
  useEffect(() => {
    if (!done && currentId && !cardsById.has(currentId)) setIndex((i) => i + 1)
  }, [done, currentId, cardsById])

  const historyRef = useRef(history)
  historyRef.current = history

  // Swipe and undo share one lock so a fast Backspace can't interleave with a pending write.
  const onSwiped = useCallback(
    async (dir: SwipeDir) => {
      if (!currentId || busy.current) return
      busy.current = true
      try {
        const prev = (await db.progress.get(currentId))?.flash ?? 'new'
        await setFlash(currentId, deckId, dir === 1 ? 'known' : 'learning')
        const entry = { cardId: currentId, index, dir, prev }
        historyRef.current = [...historyRef.current, entry]
        setHistory(historyRef.current)
        setAnnounce(dir === 1 ? t.flash.announceKnow : t.flash.announceLearning)
        setEnterFrom(undefined)
        setIndex(index + 1)
      } finally {
        busy.current = false
      }
    },
    [currentId, deckId, index],
  )

  const undo = useCallback(async () => {
    const last = historyRef.current.at(-1)
    if (!last || busy.current) return
    busy.current = true
    try {
      historyRef.current = historyRef.current.slice(0, -1)
      setHistory(historyRef.current)
      await updateProgress(last.cardId, deckId, () => ({ flash: last.prev }))
      setEnterFrom(last.dir)
      setIndex(last.index)
    } finally {
      busy.current = false
    }
  }, [deckId])

  const restart = (ids: string[]) => {
    setQueue(order(ids))
    setIndex(0)
    setHistory([])
    setEnterFrom(undefined)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shortcutsBlocked(e)) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Backspace') {
        e.preventDefault()
        undo()
      } else if (done) {
        return
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        cardRef.current?.flip()
      } else if (e.key === 'ArrowRight') {
        cardRef.current?.swipe(1)
      } else if (e.key === 'ArrowLeft') {
        cardRef.current?.swipe(-1)
      } else if (e.key.toLowerCase() === 's' || e.code === 'KeyS') {
        e.preventDefault()
        if (currentId) toggleStar(currentId, deckId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, done, currentId, deckId])

  // Results of the current round (latest verdict per card).
  const verdicts = new Map(history.map((h) => [h.cardId, h.dir]))
  const known = [...verdicts.values()].filter((d) => d === 1).length
  const learning = queue.filter((id) => verdicts.get(id) === -1)

  return (
    <div className="flex min-h-dvh flex-col">
      <StudyBar
        onClose={() => navigate(`/deck/${deckId}`)}
        progress={queue.length ? index / queue.length : 0}
        label={done ? undefined : t.study.progress(Math.min(index + 1, queue.length), queue.length)}
        menu={
          <Menu
            label={t.study.options}
            sections={[
              {
                items: [
                  {
                    label: t.study.shuffle,
                    icon: <IconShuffle />,
                    checked: shuffled,
                    onSelect: () => {
                      const on = !shuffled
                      setShuffled(on)
                      // Reorder the rest of the round without touching cards already seen.
                      setQueue((q) => [
                        ...q.slice(0, index),
                        ...(on
                          ? shuffle(q.slice(index))
                          : sortByPosition(q.slice(index), cardsById)),
                      ])
                    },
                  },
                ],
              },
              {
                title: t.study.showFirst,
                items: [
                  {
                    label: t.study.termSide,
                    checked: front === 'term',
                    onSelect: () => setFront('term'),
                  },
                  {
                    label: t.study.definitionSide,
                    checked: front === 'definition',
                    onSelect: () => setFront('definition'),
                  },
                ],
              },
              {
                items: [
                  {
                    label: t.flash.restart,
                    icon: <IconRefresh />,
                    onSelect: () => restart(initialCards.map((c) => c.id)),
                  },
                ],
              },
            ]}
          />
        }
      />

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {done ? (
        <Summary
          known={known}
          learning={learning.length}
          onRepeat={learning.length ? () => restart(learning) : undefined}
          onRestart={() => restart(initialCards.map((c) => c.id))}
          onUndo={history.length ? undo : undefined}
        />
      ) : (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-3 pb-safe sm:pt-8">
          <div className="relative flex-1">
            <div className="relative mx-auto aspect-[3/4] max-h-[min(62dvh,560px)] w-full sm:aspect-[4/3]">
              {/* Next card peeks from behind for depth. */}
              {next && (
                <motion.div
                  key={`peek-${next.id}`}
                  aria-hidden="true"
                  initial={{ scale: 0.9, y: 22, opacity: 0 }}
                  animate={{ scale: 0.94, y: 16, opacity: 1 }}
                  className="raised absolute inset-0 rounded-[2rem]"
                />
              )}
              <AnimatePresence initial={false}>
                {current && (
                  <motion.div
                    key={`${current.id}-${index}`}
                    className="absolute inset-0"
                    initial={enterFrom ? false : { scale: 0.94, y: 16 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.05 } }}
                    transition={enterSpring}
                  >
                    <SwipeCard
                      ref={cardRef}
                      card={current}
                      deck={deck}
                      front={front}
                      enterFrom={enterFrom}
                      starred={!!progress?.get(current.id)?.starred}
                      onSwiped={onSwiped}
                      onExamples={() => setExamplesFor(current)}
                      onStar={() => toggleStar(current.id, deckId)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-6 mb-2 flex items-center justify-center gap-3 sm:mt-8">
            <Button
              variant="raised"
              size="lg"
              className="max-w-48 flex-1 !text-bad"
              onClick={() => cardRef.current?.swipe(-1)}
            >
              {t.flash.learning}
            </Button>
            <IconButton
              label={t.flash.undo}
              variant="soft"
              size="lg"
              disabled={!history.length}
              onClick={undo}
            >
              <IconUndo />
            </IconButton>
            <Button
              variant="raised"
              size="lg"
              className="max-w-48 flex-1 !text-good"
              onClick={() => cardRef.current?.swipe(1)}
            >
              {t.flash.know}
            </Button>
          </div>
          <p className="mb-3 hidden text-center text-[0.8125rem] text-ink-3 md:block">
            {t.flash.keys}
          </p>
        </main>
      )}

      <ExamplesSheet
        card={examplesFor ? (cardsById.get(examplesFor.id) ?? null) : null}
        deck={deck}
        onClose={() => setExamplesFor(null)}
      />
    </div>
  )
}

function sortByPosition(ids: string[], byId: Map<string, Card>): string[] {
  return ids.slice().sort((a, b) => (byId.get(a)?.position ?? 0) - (byId.get(b)?.position ?? 0))
}

function Summary({
  known,
  learning,
  onRepeat,
  onRestart,
  onUndo,
}: {
  known: number
  learning: number
  onRepeat?: () => void
  onRestart: () => void
  onUndo?: () => void
}) {
  const total = known + learning
  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={softSpring}
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 pb-safe text-center"
    >
      <Ring
        value={total ? known / total : 0}
        size={168}
        stroke={14}
        color="var(--fw-good)"
        track="var(--fw-bad-soft)"
        animateFromZero
      >
        <span className="flex flex-col items-center">
          <span className="text-4xl font-bold">
            <CountUp to={total ? Math.round((known / total) * 100) : 0} suffix="%" />
          </span>
        </span>
      </Ring>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.flash.doneTitle}</h1>
        <p className="mt-2 flex justify-center gap-4 text-ink-2">
          <span className="font-semibold text-good">{t.flash.knowCount(known)}</span>
          <span className="font-semibold text-bad">{t.flash.learningCount(learning)}</span>
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        {onRepeat && (
          <Button variant="primary" size="lg" block onClick={onRepeat}>
            {t.flash.repeatLearning(learning)}
          </Button>
        )}
        <Button variant={onRepeat ? 'raised' : 'primary'} size="lg" block onClick={onRestart}>
          {t.flash.restart}
        </Button>
        {onUndo && (
          <Button variant="ghost" onClick={onUndo}>
            <IconUndo size={18} />
            {t.flash.undo}
          </Button>
        )}
      </div>
    </motion.main>
  )
}
