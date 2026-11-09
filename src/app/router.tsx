import { createHashRouter } from 'react-router'
import { DeckEditor } from '../features/decks/DeckEditor'
import { DeckPage } from '../features/decks/DeckPage'
import { HomePage } from '../features/decks/HomePage'
import { FlashcardsPage } from '../features/flashcards/FlashcardsPage'
import { LearnPage } from '../features/learn/LearnPage'
import { TestPage } from '../features/test/TestPage'
import { RootLayout } from './RootLayout'
import { NotFound, RouteError } from './RouteError'

// Hash routing: GitHub Pages serves index.html for "/" only, so deep links live after "#".
export const router = createHashRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/new', element: <DeckEditor /> },
      { path: '/deck/:deckId', element: <DeckPage /> },
      { path: '/deck/:deckId/edit', element: <DeckEditor /> },
      { path: '/deck/:deckId/flashcards', element: <FlashcardsPage /> },
      { path: '/deck/:deckId/learn', element: <LearnPage /> },
      { path: '/deck/:deckId/test', element: <TestPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
