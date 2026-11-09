import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { useSettingsSheet } from '../../app/SettingsContext'
import { type DeckSummary, useDeckSummaries } from '../../db/hooks'
import { Button, IconButton } from '../../design/Button'
import { IconPlus, IconSettings, IconUpload } from '../../design/icons'
import { Logo, LogoMark } from '../../design/Logo'
import { enterSpring, pressSpring } from '../../design/motion'
import { Ring } from '../../design/Progress'
import { TopBar } from '../../design/TopBar'
import { t } from '../../i18n/ru'
import { InstallHint } from './InstallHint'

const MotionLink = motion.create(Link)

export function HomePage() {
  const decks = useDeckSummaries()
  const navigate = useNavigate()
  const settings = useSettingsSheet()

  return (
    <>
      <TopBar
        left={<Logo />}
        right={
          <IconButton label={t.app.settings} onClick={() => settings.open()}>
            <IconSettings />
          </IconButton>
        }
      />
      <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h1 className="text-[2rem] leading-tight font-[750] tracking-[-0.03em] sm:text-[2.4rem]">
            {t.home.title}
          </h1>
          <Button
            variant="primary"
            size="md"
            className="hidden sm:inline-flex"
            onClick={() => navigate('/new')}
          >
            <IconPlus size={20} />
            {t.home.create}
          </Button>
        </div>

        <InstallHint />

        {decks && decks.length === 0 && (
          <EmptyState onCreate={() => navigate('/new')} onImport={() => settings.open()} />
        )}

        {decks && decks.length > 0 && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((summary, i) => (
              <motion.li
                key={summary.deck.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  ...enterSpring,
                  delay: Math.min(i, 8) * 0.04,
                }}
              >
                <DeckTile summary={summary} />
              </motion.li>
            ))}
          </ul>
        )}
      </main>

      {/* Primary action in the thumb zone on phones. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-safe sm:hidden">
        <Button
          variant="primary"
          size="lg"
          block
          className="pointer-events-auto mb-1"
          onClick={() => navigate('/new')}
        >
          <IconPlus size={22} />
          {t.home.create}
        </Button>
      </div>
    </>
  )
}

function DeckTile({ summary }: { summary: DeckSummary }) {
  const { deck, cardCount, mastered } = summary
  const pct = cardCount ? mastered / cardCount : 0
  return (
    <MotionLink
      to={`/deck/${deck.id}`}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97, boxShadow: 'var(--fw-shadow-pressed)' }}
      transition={pressSpring}
      className="raised relative flex min-h-40 flex-col justify-between overflow-hidden rounded-card p-5 outline-offset-4"
    >
      <span
        className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-coral/10 blur-2xl"
        aria-hidden="true"
      />
      <div className="flex items-start gap-3">
        <h2 className="line-clamp-2 flex-1 text-[1.2rem] leading-snug font-semibold tracking-tight">
          {deck.title}
        </h2>
        <Ring value={pct} size={48} stroke={5}>
          <span className="text-[0.75rem] font-semibold text-ink-2 tabular-nums">
            {Math.round(pct * 100)}%
          </span>
        </Ring>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.9375rem] text-ink-2">
        <span className="font-medium text-ink">{t.plural.cards(cardCount)}</span>
        <span aria-hidden="true">·</span>
        <span className="rounded-full bg-plum-soft px-2 py-0.5 text-[0.8125rem] font-semibold text-plum-ink uppercase">
          {deck.termLang} → {deck.defLang}
        </span>
        <span className="rounded-full bg-sun-soft px-2 py-0.5 text-[0.8125rem] font-semibold text-sun-ink">
          {deck.level}
        </span>
      </div>
      <span className="sr-only">{t.home.mastered(mastered, cardCount)}</span>
    </MotionLink>
  )
}

function EmptyState({ onCreate, onImport }: { onCreate: () => void; onImport: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="raised mx-auto mt-6 flex max-w-md flex-col items-center gap-3 rounded-card px-6 py-10 text-center"
    >
      <motion.div
        animate={{ rotate: [0, -6, 6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2 }}
      >
        <LogoMark size={80} />
      </motion.div>
      <h2 className="text-xl font-semibold">{t.home.empty}</h2>
      <p className="text-ink-2">{t.home.emptyHint}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={onCreate}>
          <IconPlus size={20} />
          {t.home.create}
        </Button>
        <Button variant="soft" onClick={onImport}>
          <IconUpload size={18} />
          {t.settings.importFile}
        </Button>
      </div>
    </motion.div>
  )
}
