import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { NotFound } from '../../app/RouteError'
import { db } from '../../db/db'
import { appendCards, deleteCard, deleteDeck, restoreSnapshot } from '../../db/decks'
import { useDeck, useDeckCards, useDeckProgress, useHasSession } from '../../db/hooks'
import { isMastered, toggleStar } from '../../db/progress'
import type { Card, StudyMode } from '../../db/types'
import { Button, IconButton } from '../../design/Button'
import { cx } from '../../design/cx'
import {
  IconBrain,
  IconCards,
  IconChevronLeft,
  IconChevronRight,
  IconClipboard,
  IconEdit,
  IconShare,
  IconSparkles,
  IconTrash,
  IconUpload,
} from '../../design/icons'
import { Menu } from '../../design/Menu'
import { pressSpring } from '../../design/motion'
import { Ring } from '../../design/Progress'
import { useToast } from '../../design/Toast'
import { TopBar } from '../../design/TopBar'
import { t } from '../../i18n/ru'
import { backupFileName, exportDeck } from '../../lib/backup'
import { shareOrDownloadJson } from '../../lib/files'
import { languageName } from '../../lib/languages'
import { ExamplesSheet } from '../ai/ExamplesSheet'
import { SpeakButton } from '../tts/SpeakButton'
import { ImportSheet } from './ImportSheet'
import { StarButton } from './StarButton'

const MotionLink = motion.create(Link)

export function DeckPage() {
  const { deckId } = useParams()
  const deck = useDeck(deckId)
  const cards = useDeckCards(deckId)
  const progress = useDeckProgress(deckId)
  const navigate = useNavigate()
  const toast = useToast()
  const [importOpen, setImportOpen] = useState(false)
  const [examplesFor, setExamplesFor] = useState<Card | null>(null)
  const hasLearn = useHasSession(deckId, 'learn')
  const hasTest = useHasSession(deckId, 'test')

  if (deck === null) return <NotFound />
  if (!deck || !cards) return null

  const mastered = cards.filter((c) => isMastered(progress?.get(c.id))).length
  const enough = cards.length >= 2

  const onDelete = async () => {
    const snapshot = await deleteDeck(deck.id)
    navigate('/', { replace: true })
    toast.show({
      message: t.deck.deleted(deck.title),
      action: { label: t.app.undo, onClick: () => restoreSnapshot(snapshot) },
    })
  }

  const onShare = async () => {
    const data = await exportDeck(db, deck.id)
    await shareOrDownloadJson(data, backupFileName(data), deck.title)
  }

  const onDeleteCard = async (card: Card) => {
    const snapshot = await deleteCard(card.id)
    toast.show({
      message: t.deck.cardDeleted,
      action: { label: t.app.undo, onClick: () => restoreSnapshot(snapshot) },
    })
  }

  return (
    <>
      <TopBar
        left={
          <IconButton label={t.app.back} onClick={() => navigate('/')}>
            <IconChevronLeft />
          </IconButton>
        }
        right={
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
                  {
                    label: t.deck.import,
                    icon: <IconUpload />,
                    onSelect: () => setImportOpen(true),
                  },
                  { label: t.deck.share, icon: <IconShare />, onSelect: onShare },
                ],
              },
              {
                items: [
                  { label: t.deck.delete, icon: <IconTrash />, danger: true, onSelect: onDelete },
                ],
              },
            ]}
          />
        }
      />

      <main className="mx-auto max-w-3xl px-4 pt-2 pb-16 sm:px-6">
        <header className="mb-6 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.9rem] leading-tight font-[750] tracking-[-0.03em] break-words sm:text-[2.2rem]">
              {deck.title}
            </h1>
            {deck.description && <p className="mt-1 text-ink-2">{deck.description}</p>}
            <p className="mt-2 text-[0.9375rem] text-ink-2">
              {t.plural.cards(cards.length)} · {languageName(deck.termLang)} →{' '}
              {languageName(deck.defLang)} · {deck.level}
            </p>
          </div>
          <Ring value={cards.length ? mastered / cards.length : 0} size={60} stroke={6}>
            <span className="text-[0.8125rem] font-semibold tabular-nums">
              {mastered}/{cards.length}
            </span>
          </Ring>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ModeTile
            to="flashcards"
            deckId={deck.id}
            icon={<IconCards />}
            title={t.deck.flashcards}
            hint={t.deck.flashcardsHint}
            tone="coral"
            disabled={!cards.length}
          />
          <ModeTile
            to="learn"
            deckId={deck.id}
            icon={<IconBrain />}
            title={t.deck.learn}
            hint={enough ? t.deck.learnHint : t.deck.needCards(2)}
            tone="plum"
            disabled={!enough}
            resumable={hasLearn}
          />
          <ModeTile
            to="test"
            deckId={deck.id}
            icon={<IconClipboard />}
            title={t.deck.test}
            hint={enough ? t.deck.testHint : t.deck.needCards(2)}
            tone="sun"
            disabled={!enough}
            resumable={hasTest}
          />
        </div>

        <section className="mt-10" aria-labelledby="cards-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="cards-title" className="text-lg font-semibold tracking-tight">
              {t.deck.cardsTitle}
            </h2>
            <Button size="sm" variant="ghost" onClick={() => navigate(`/deck/${deck.id}/edit`)}>
              <IconEdit size={16} />
              {t.deck.edit}
            </Button>
          </div>
          {cards.length === 0 ? (
            <div className="rounded-card border border-dashed border-line p-8 text-center text-ink-2">
              <p>{t.deck.noCards}</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="primary" onClick={() => navigate(`/deck/${deck.id}/edit`)}>
                  {t.deck.addCards}
                </Button>
                <Button variant="soft" onClick={() => setImportOpen(true)}>
                  {t.deck.import}
                </Button>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {cards.map((card) => (
                  <motion.li
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
                    className="group flex items-center gap-2 rounded-2xl border border-line bg-surface py-2 pr-2 pl-4"
                  >
                    <div className="grid min-w-0 flex-1 gap-0.5 py-1 sm:grid-cols-[2fr_3fr] sm:gap-4">
                      <span className="font-semibold break-words" lang={deck.termLang}>
                        {card.term}
                      </span>
                      <span className="break-words text-ink-2" lang={deck.defLang}>
                        {card.definition}
                      </span>
                    </div>
                    <StarButton
                      term={card.term}
                      starred={!!progress?.get(card.id)?.starred}
                      onToggle={() => toggleStar(card.id, deck.id)}
                    />
                    <SpeakButton text={card.term} lang={deck.termLang} />
                    <IconButton
                      size="sm"
                      label={`${t.examples.title}: ${card.term}`}
                      onClick={() => setExamplesFor(card)}
                      className={cx(card.examples && 'text-primary')}
                    >
                      <IconSparkles size={18} />
                    </IconButton>
                    <IconButton
                      size="sm"
                      label={`${t.deck.deleteCard}: ${card.term}`}
                      onClick={() => onDeleteCard(card)}
                      className="sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                    >
                      <IconTrash size={18} />
                    </IconButton>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      </main>

      <ImportSheet
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={async (parsed) => {
          await appendCards(deck.id, parsed)
          toast.show({ message: t.import.added(parsed.length) })
        }}
      />
      <ExamplesSheet card={examplesFor} deck={deck} onClose={() => setExamplesFor(null)} />
    </>
  )
}

const tones = {
  coral: 'bg-coral/15 text-primary',
  plum: 'bg-plum-soft text-plum-ink',
  sun: 'bg-sun-soft text-sun-ink',
}

function ModeTile({
  to,
  deckId,
  icon,
  title,
  hint,
  tone,
  disabled,
  resumable,
}: {
  to: StudyMode | 'flashcards'
  deckId: string
  icon: ReactNode
  title: string
  hint: string
  tone: keyof typeof tones
  disabled?: boolean
  resumable?: boolean
}) {
  const inner = (
    <>
      <span
        className={cx(
          'grid size-12 shrink-0 place-items-center rounded-2xl [&>svg]:size-6',
          tones[tone],
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.1rem] font-semibold tracking-tight">{title}</span>
        <span className="block text-[0.9375rem] text-ink-2">
          {resumable ? t.deck.sessionSaved : hint}
        </span>
      </span>
      {resumable ? (
        <span className="rounded-full bg-primary px-2.5 py-1 text-[0.8125rem] font-semibold text-primary-ink">
          {t.deck.continue}
        </span>
      ) : (
        <IconChevronRight className="text-ink-3 sm:hidden" />
      )}
    </>
  )
  const base =
    'raised flex items-center gap-3 rounded-card p-4 sm:min-h-36 sm:flex-col sm:items-start sm:justify-between'
  if (disabled) {
    return (
      <div className={cx(base, 'opacity-55')} aria-disabled="true">
        {inner}
      </div>
    )
  }
  return (
    <div className="flex flex-col">
      <MotionLink
        to={`/deck/${deckId}/${to}`}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.97, boxShadow: 'var(--fw-shadow-pressed)' }}
        transition={pressSpring}
        className={cx(base, 'outline-offset-4')}
      >
        {inner}
      </MotionLink>
      {resumable && (
        <Link
          to={`/deck/${deckId}/${to}?fresh=1`}
          className="mt-1 inline-flex min-h-11 items-center justify-center self-end rounded-xl px-3 text-[0.9375rem] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          {t.deck.restart}
        </Link>
      )}
    </div>
  )
}
