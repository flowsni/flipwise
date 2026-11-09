import { createHashRouter } from 'react-router'
import { DeckPage } from '../features/decks/DeckPage'
import { HomePage } from '../features/decks/HomePage'
import { RootLayout } from './RootLayout'
import { NotFound, RouteError } from './RouteError'

// Hash routing: GitHub Pages serves index.html for "/" only, so deep links live after "#".
// Home and deck pages ship in the main bundle; editor and study screens load on demand.
export const router = createHashRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <HomePage /> },
      {
        path: '/new',
        lazy: async () => ({
          Component: (await import('../features/decks/DeckEditor')).DeckEditor,
        }),
      },
      { path: '/deck/:deckId', element: <DeckPage /> },
      {
        path: '/deck/:deckId/edit',
        lazy: async () => ({
          Component: (await import('../features/decks/DeckEditor')).DeckEditor,
        }),
      },
      {
        path: '/deck/:deckId/flashcards',
        lazy: async () => ({
          Component: (await import('../features/flashcards/FlashcardsPage')).FlashcardsPage,
        }),
      },
      {
        path: '/deck/:deckId/learn',
        lazy: async () => ({ Component: (await import('../features/learn/LearnPage')).LearnPage }),
      },
      {
        path: '/deck/:deckId/test',
        lazy: async () => ({ Component: (await import('../features/test/TestPage')).TestPage }),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
