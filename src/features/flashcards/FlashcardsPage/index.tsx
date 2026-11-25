import { useEffect, useMemo, useState } from 'react'
import { NotFound } from '@/app/RouteError'
import { useBack } from '@/app/useBack'
import { type Card, type Deck, type Progress, toggleStar } from '@/db'
import { StudyBar, useToast } from '@/design'
import { BulkExamplesSheet } from '@/features/ai/BulkExamplesSheet'
import { ExamplesSheet } from '@/features/ai/ExamplesSheet'
import { isMonolingual } from '@/features/ai/prompt'
import { type FlashContent, sidesOf } from '@/features/flashcards/sentences'
import { useStudyScope } from '@/features/study/StudyScopePicker'
import {
  type ScopeOptions,
  scopeCounts,
  selectStudyCards,
  usableScope,
} from '@/features/study/scope'
import { useStudyRoute } from '@/features/study/useStudyRoute'
import { t } from '@/i18n/ru'
import { hasExamples, useSetting } from '@/lib'
import { CardStack, useCardHandle } from './CardStack'
import { ContentSwitch } from './ContentSwitch'
import { FlashControls } from './FlashControls'
import { FlashMenu } from './FlashMenu'
import { roundResults } from './flashSession'
import { NoSentences } from './NoSentences'
import { ScopeChip, ScopeSheet } from './ScopeSheet'
import { Summary } from './Summary'
import { useFlashKeys } from './useFlashKeys'
import { useFlashSession } from './useFlashSession'

export function FlashcardsPage() {
  const route = useStudyRoute({ minCards: 1 })
  if (route.status === 'missing') return <NotFound />
  if (route.status === 'loading') return null
  const { deck, cards, cardsById, progress } = route
  return (
    <Flashcards key={deck.id} deck={deck} cards={cards} cardsById={cardsById} progress={progress} />
  )
}

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
  const back = useBack(`/deck/${deck.id}`)
  const toast = useToast()
  const deckId = deck.id
  const [shuffled, setShuffled] = useSetting('flash.shuffle', false)
  const [front, setFront] = useSetting<'term' | 'definition'>('flash.front', 'term')
  // A monolingual deck's examples carry explanations, not translations: words only.
  const mono = isMonolingual(deck)
  const [contentSetting, setContent] = useSetting<FlashContent>('flash.content', 'words')
  const content: FlashContent = !mono && contentSetting === 'sentences' ? 'sentences' : 'words'
  // Filter before sampling, so a session of 10 holds 10 cards that do have sentences.
  const withSentences = useMemo(() => cards.filter(hasExamples), [cards])
  const poolOf = (c: FlashContent) => (c === 'sentences' ? withSentences : cards)
  const pool = poolOf(content)
  const counts = useMemo(() => scopeCounts(pool, progress), [pool, progress])
  const { scope, setScope, limit, setLimit } = useStudyScope()
  const [selection, setSelection] = useState(() => select(pool, progress, { scope, limit }))
  const [scopeOpen, setScopeOpen] = useState(false)
  const [examplesFor, setExamplesFor] = useState<Card | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const card = useCardHandle()
  const flash = useFlashSession({ deckId, cardsById, ids: selection.ids, content, shuffled })
  const { queue, index, history, picked, current, done } = flash
  useFlashKeys({ deckId, currentId: flash.currentId, done, undo: flash.undo, card: card.ref })

  const empty = !selection.ids.length

  // The remembered scope can be empty (e.g. «Избранные» without stars): say we show all cards.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only for the first selection
  useEffect(() => {
    if (selection.ids.length && selection.scope !== scope) toast.show({ message: t.scope.fallback })
  }, [])

  const changeScope = (options: ScopeOptions) => {
    // Changing only the size must not remember a scope that came from "?scope=".
    if (options.scope !== scope) setScope(options.scope)
    setLimit(options.limit)
    const next = select(pool, progress, options)
    setSelection(next)
    flash.restart(next.ids)
  }

  const changeContent = (c: FlashContent) => {
    setContent(c)
    const next = select(poolOf(c), progress, { scope, limit })
    if (next.ids.length && next.scope !== scope) toast.show({ message: t.scope.fallback })
    setSelection(next)
    flash.restart(next.ids, c)
  }

  // Examples generated from the empty state: start the sentence round once the sheet closes.
  const sentencesArrived = empty && content === 'sentences' && !bulkOpen && withSentences.length > 0
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when examples arrive
  useEffect(() => {
    if (sentencesArrived) changeContent('sentences')
  }, [sentencesArrived])

  const { known, learning } = roundResults(history, queue)
  const contentSwitch = <ContentSwitch value={content} onChange={changeContent} mono={mono} />

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <StudyBar
        onClose={back}
        progress={queue.length ? index / queue.length : 0}
        label={done ? undefined : t.study.progress(Math.min(index + 1, queue.length), queue.length)}
        menu={
          <FlashMenu
            content={content}
            shuffled={shuffled}
            onShuffle={() => {
              setShuffled(!shuffled)
              flash.reorderRest(!shuffled)
            }}
            front={front}
            onFront={setFront}
            onRestart={() => flash.restartWithUndo(selection.ids)}
          />
        }
      />

      <p className="sr-only" aria-live="polite">
        {flash.announce}
      </p>

      {empty ? (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-3 pb-safe sm:pt-6">
          {contentSwitch}
          <NoSentences
            onGenerate={() => setBulkOpen(true)}
            onWords={() => changeContent('words')}
          />
        </main>
      ) : done ? (
        <Summary
          known={known}
          learning={learning.length}
          onRepeat={learning.length ? () => flash.restart(learning) : undefined}
          onRestart={() => flash.restart(selection.ids)}
          onUndo={history.length ? flash.undo : undefined}
        />
      ) : (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-3 pb-safe sm:pt-6">
          {contentSwitch}
          <ScopeChip
            scope={selection.scope}
            count={selection.ids.length}
            onClick={() => setScopeOpen(true)}
          />
          {content === 'sentences' && pool.length < cards.length && (
            <p className="-mt-1 mb-3 text-center text-[0.8125rem] text-ink-3">
              {t.flash.sentencesPartial(pool.length, cards.length)}
            </p>
          )}
          <CardStack
            current={current}
            next={flash.next}
            sides={current && sidesOf(current, { deck, content, picked, front })}
            starred={!!current && !!progress.get(current.id)?.starred}
            round={flash.round}
            index={index}
            enterFrom={flash.enterFrom}
            attach={card.attach}
            onSwiped={flash.swipe}
            onExamples={current && content === 'words' ? () => setExamplesFor(current) : undefined}
            onStar={() => current && toggleStar(current.id, deckId)}
          />
          <FlashControls
            canUndo={!!history.length}
            onSwipe={(dir) => card.ref.current?.swipe(dir)}
            onUndo={flash.undo}
          />
        </main>
      )}

      <ScopeSheet
        open={scopeOpen}
        onClose={() => setScopeOpen(false)}
        counts={counts}
        scope={selection.scope}
        limit={limit}
        onChange={changeScope}
      />

      <ExamplesSheet
        card={examplesFor ? (cardsById.get(examplesFor.id) ?? null) : null}
        deck={deck}
        onClose={() => setExamplesFor(null)}
      />
      <BulkExamplesSheet
        open={bulkOpen}
        deck={deck}
        cards={cards}
        onClose={() => setBulkOpen(false)}
      />
    </div>
  )
}
