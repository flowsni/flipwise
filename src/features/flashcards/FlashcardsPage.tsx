import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { NotFound } from '../../app/RouteError'
import { db } from '../../db/db'
import { useDeckProgress } from '../../db/hooks'
import { setFlash, toggleStar, updateProgress } from '../../db/progress'
import type { Card, Deck, FlashStatus, Progress } from '../../db/types'
import { Button, IconButton } from '../../design/Button'
import { Segmented } from '../../design/Field'
import {
  IconChevronDown,
  IconRefresh,
  IconShuffle,
  IconSparkles,
  IconUndo,
} from '../../design/icons'
import { Menu } from '../../design/Menu'
import { enterSpring, softSpring } from '../../design/motion'
import { CountUp, Ring } from '../../design/Progress'
import { Sheet } from '../../design/Sheet'
import { StudyBar, shortcutsBlocked } from '../../design/StudyBar'
import { useToast } from '../../design/Toast'
import { t } from '../../i18n/ru'
import { shuffle } from '../../lib/shuffle'
import { useSetting } from '../../lib/storage'
import { ExamplesSheet } from '../ai/ExamplesSheet'
import { isMonolingual } from '../ai/prompt'
import { StudyScopePicker, scopeLabels, useStudyScope } from '../study/StudyScopePicker'
import { type ScopeOptions, scopeCounts, selectStudyCards, usableScope } from '../study/scope'
import { useStudyDeck } from '../study/useStudyDeck'
import { type CardSide, SwipeCard, type SwipeCardHandle, type SwipeDir } from './SwipeCard'
import { type FlashContent, hasSentences, pickSentences, sentenceOf } from './sentences'

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
  const progress = useDeckProgress(deckId)
  if (!loading && (!deck || !cards?.length)) return <NotFound />
  if (loading || !deck || !cards || !progress) return null
  return (
    <Flashcards key={deck.id} deck={deck} cards={cards} cardsById={cardsById} progress={progress} />
  )
}

/** The cards of one session: a scope of the deck, picked when the session starts. */
interface Selection {
  scope: ScopeOptions['scope']
  ids: string[]
}

function select(cards: Card[], progress: Map<string, Progress>, options: ScopeOptions): Selection {
  const scope = usableScope(options.scope, scopeCounts(cards, progress))
  return { scope, ids: selectStudyCards(cards, progress, { ...options, scope }) }
}

function Flashcards({
  deck,
  cards,
  cardsById,
  progress,
}: {
  deck: Deck
  cards: Card[]
  cardsById: Map<string, Card>
  /** Live: stars and the scope counters follow changes made during the session. */
  progress: Map<string, Progress>
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const deckId = deck.id
  const [shuffled, setShuffled] = useSetting('flash.shuffle', false)
  const [front, setFront] = useSetting<'term' | 'definition'>('flash.front', 'term')
  // A monolingual deck's examples carry explanations, not translations: words only.
  const mono = isMonolingual(deck)
  const [contentSetting, setContent] = useSetting<FlashContent>('flash.content', 'words')
  const content: FlashContent = !mono && contentSetting === 'sentences' ? 'sentences' : 'words'
  // Filter before sampling, so a session of 10 holds 10 cards that do have sentences.
  const withSentences = useMemo(() => cards.filter(hasSentences), [cards])
  const poolOf = (c: FlashContent) => (c === 'sentences' ? withSentences : cards)
  const pool = poolOf(content)
  const counts = useMemo(() => scopeCounts(pool, progress), [pool, progress])
  const { scope, setScope, limit, setLimit } = useStudyScope()
  const [selection, setSelection] = useState(() => select(pool, progress, { scope, limit }))
  // Which example each card shows this round; kept in state so undo brings back the same one.
  const pickFor = (ids: string[], c: FlashContent) =>
    c === 'sentences' ? pickSentences(ids, cardsById) : new Map<string, number>()
  const [picked, setPicked] = useState(() => pickFor(selection.ids, content))
  // Part of the card key: a restart must remount the card even when it starts on the same one,
  // or a flipped card would come back flipped and show the answer.
  const [round, setRound] = useState(0)
  const [scopeOpen, setScopeOpen] = useState(false)
  const order = useCallback((ids: string[]) => (shuffled ? shuffle(ids) : ids), [shuffled])
  const [queue, setQueue] = useState(() => order(selection.ids))
  const [index, setIndex] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [enterFrom, setEnterFrom] = useState<SwipeDir | undefined>()
  const [examplesFor, setExamplesFor] = useState<Card | null>(null)
  const [announce, setAnnounce] = useState('')
  const cardRef = useRef<SwipeCardHandle>(null)
  // The previous card unmounts after its exit animation, i.e. after the next card attached its
  // handle; a plain ref would then be reset to null and buttons/arrows would do nothing.
  const attachCard = useCallback((handle: SwipeCardHandle | null) => {
    cardRef.current = handle
    return () => {
      if (cardRef.current === handle) cardRef.current = null
    }
  }, [])
  const busy = useRef(false)

  const empty = !selection.ids.length
  const done = index >= queue.length
  const currentId = queue[index]
  const playable = (card: Card | undefined): card is Card =>
    !!card && (content === 'words' || hasSentences(card))
  const currentCard = currentId ? cardsById.get(currentId) : undefined
  const current = playable(currentCard) ? currentCard : undefined
  const next = queue[index + 1] ? cardsById.get(queue[index + 1]!) : undefined

  // Skip cards deleted mid-session, or whose examples were deleted in sentence mode.
  const skip = !done && !!currentId && !current
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run per card, even when several are skipped in a row
  useEffect(() => {
    if (skip) setIndex((i) => i + 1)
  }, [skip, currentId])

  const sidesOf = (card: Card): { front: CardSide; back: CardSide } => {
    const sentence = content === 'sentences' && sentenceOf(card, picked.get(card.id))
    if (sentence) {
      // A translation without [[ ]] simply shows unmarked: guessing the word form is unreliable.
      return {
        front: {
          text: sentence.translation,
          lang: deck.defLang,
          label: t.flash.sentenceFront,
          sentence: true,
        },
        back: {
          text: sentence.text,
          lang: deck.termLang,
          label: t.flash.sentenceBack,
          sentence: true,
        },
      }
    }
    const term = { text: card.term, lang: deck.termLang, label: t.study.termSide }
    const definition = { text: card.definition, lang: deck.defLang, label: t.study.definitionSide }
    return front === 'term' ? { front: term, back: definition } : { front: definition, back: term }
  }

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

  const restart = (ids: string[], c: FlashContent = content) => {
    setPicked(pickFor(ids, c))
    setRound((r) => r + 1)
    setQueue(order(ids))
    setIndex(0)
    setHistory([])
    setEnterFrom(undefined)
  }

  // The remembered scope can be empty (e.g. «Избранные» without stars): say we show all cards.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only for the first selection
  useEffect(() => {
    if (selection.ids.length && selection.scope !== scope) toast.show({ message: t.scope.fallback })
  }, [])

  const changeScope = (options: ScopeOptions) => {
    setScope(options.scope)
    setLimit(options.limit)
    const next = select(pool, progress, options)
    setSelection(next)
    restart(next.ids)
  }

  const changeContent = (c: FlashContent) => {
    setContent(c)
    const next = select(poolOf(c), progress, { scope, limit })
    if (next.ids.length && next.scope !== scope) toast.show({ message: t.scope.fallback })
    setSelection(next)
    restart(next.ids, c)
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
              // Sentences always go translation → original.
              ...(content === 'words'
                ? [
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
                  ]
                : []),
              {
                items: [
                  {
                    label: t.flash.restart,
                    icon: <IconRefresh />,
                    onSelect: () => restart(selection.ids),
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

      {empty ? (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-3 pb-safe sm:pt-6">
          <ContentSwitch value={content} onChange={changeContent} mono={mono} />
          <NoSentences onWords={() => changeContent('words')} />
        </main>
      ) : done ? (
        <Summary
          known={known}
          learning={learning.length}
          onRepeat={learning.length ? () => restart(learning) : undefined}
          onRestart={() => restart(selection.ids)}
          onUndo={history.length ? undo : undefined}
        />
      ) : (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-3 pb-safe sm:pt-6">
          <ContentSwitch value={content} onChange={changeContent} mono={mono} />
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              onClick={() => setScopeOpen(true)}
              aria-label={t.scope.change(
                t.scope.chip(scopeLabels[selection.scope], selection.ids.length),
              )}
              className="inline-flex min-h-9 items-center gap-1 rounded-full bg-surface-2 px-3.5 text-[0.875rem] font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
            >
              {t.scope.chip(scopeLabels[selection.scope], selection.ids.length)}
              <IconChevronDown size={14} />
            </button>
          </div>
          {content === 'sentences' && pool.length < cards.length && (
            <p className="-mt-1 mb-3 text-center text-[0.8125rem] text-ink-3">
              {t.flash.sentencesPartial(pool.length, cards.length)}
            </p>
          )}
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
                    key={`${current.id}-${round}-${index}`}
                    className="absolute inset-0"
                    initial={enterFrom ? false : { scale: 0.94, y: 16 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.05 } }}
                    transition={enterSpring}
                  >
                    <SwipeCard
                      ref={attachCard}
                      card={current}
                      sides={sidesOf(current)}
                      enterFrom={enterFrom}
                      starred={!!progress.get(current.id)?.starred}
                      onSwiped={onSwiped}
                      onExamples={content === 'words' ? () => setExamplesFor(current) : undefined}
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

      <Sheet
        open={scopeOpen}
        onClose={() => setScopeOpen(false)}
        title={t.scope.title}
        footer={
          <Button variant="primary" size="lg" block onClick={() => setScopeOpen(false)}>
            {t.app.done}
          </Button>
        }
      >
        <StudyScopePicker
          counts={counts}
          scope={selection.scope}
          onScope={(s) => changeScope({ scope: s, limit })}
          limit={limit}
          onLimit={(l) => changeScope({ scope: selection.scope, limit: l })}
        />
      </Sheet>

      <ExamplesSheet
        card={examplesFor ? (cardsById.get(examplesFor.id) ?? null) : null}
        deck={deck}
        onClose={() => setExamplesFor(null)}
      />
    </div>
  )
}

/** «Слова / Предложения»; disabled with the reason for monolingual decks. */
function ContentSwitch({
  value,
  onChange,
  mono,
}: {
  value: FlashContent
  onChange: (c: FlashContent) => void
  mono: boolean
}) {
  return (
    <div className="mx-auto mb-3 w-full max-w-xs">
      <Segmented
        label={t.flash.content}
        value={value}
        onChange={onChange}
        options={[
          { value: 'words', label: t.flash.words },
          { value: 'sentences', label: t.flash.sentences, disabled: mono },
        ]}
      />
      {mono && (
        <p className="mt-1.5 text-center text-[0.8125rem] text-ink-3">{t.flash.monolingual}</p>
      )}
    </div>
  )
}

function NoSentences({ onWords }: { onWords: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
      className="flex flex-1 flex-col items-center justify-center gap-4 pb-16 text-center"
    >
      <span className="grid size-16 place-items-center rounded-2xl bg-sun-soft text-sun-ink">
        <IconSparkles size={30} />
      </span>
      <h1 className="text-xl font-bold tracking-tight">{t.flash.noSentencesTitle}</h1>
      <p className="max-w-xs text-ink-2">{t.flash.noSentences}</p>
      <Button variant="primary" size="lg" onClick={onWords}>
        {t.flash.toWords}
      </Button>
    </motion.div>
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
