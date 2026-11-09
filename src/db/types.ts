export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type Level = (typeof LEVELS)[number]

export interface Deck {
  id: string
  title: string
  description?: string
  /** BCP 47 language code of the term side, e.g. "en". */
  termLang: string
  /** BCP 47 language code of the definition side, e.g. "ru". */
  defLang: string
  level: Level
  createdAt: number
  updatedAt: number
}

export interface ExampleItem {
  /** Sentence with the studied word wrapped in [[…]]. */
  text: string
  /** Translation into the definition language, or a same-language explanation. */
  translation: string
}

export interface CardExamples {
  items: ExampleItem[]
  provider: string
  model: string
  createdAt: number
}

export interface Card {
  id: string
  deckId: string
  position: number
  term: string
  definition: string
  /** Reserved for images on cards (post-MVP). */
  imageId?: string
  examples?: CardExamples
  createdAt: number
  updatedAt: number
}

export type FlashStatus = 'new' | 'learning' | 'known'

export interface Progress {
  cardId: string
  deckId: string
  flash: FlashStatus
  /** 0 = multiple choice, 1 = written, 2 = learned. */
  learnStage: 0 | 1 | 2
  correct: number
  wrong: number
  lastSeenAt: number
}

export type StudyMode = 'learn' | 'test'

export interface StudySession {
  /** `${deckId}:${mode}` — one active session per deck and mode. */
  id: string
  deckId: string
  mode: StudyMode
  state: unknown
  updatedAt: number
}

/** Which side the learner has to produce. */
export type AnswerSide = 'term' | 'definition'
