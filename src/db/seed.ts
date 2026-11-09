import { getSetting, setSetting } from '../lib/storage'
import { db } from './db'
import { createDeck } from './decks'

const DEMO = [
  ['boarding pass', 'посадочный талон'],
  ['luggage', 'багаж'],
  ['departure', 'отправление, вылет'],
  ['to book', 'бронировать'],
  ['sightseeing', 'осмотр достопримечательностей'],
  ['itinerary', 'маршрут поездки'],
  ['customs', 'таможня'],
  ['round trip', 'поездка туда и обратно'],
  ['layover', 'пересадка'],
  ['to check in', 'зарегистрироваться (в отеле, на рейс)'],
  ['souvenir', 'сувенир'],
  ['currency exchange', 'обмен валюты'],
] as const

/** Creates a demo deck on the very first launch so the app is never empty. */
export async function seedDemoDeck(): Promise<void> {
  if (getSetting('seeded', false)) return
  setSetting('seeded', true)
  if ((await db.decks.count()) > 0) return
  await createDeck(
    {
      title: 'Английский: путешествия',
      description: 'Демо-набор — можно смело редактировать или удалить',
      termLang: 'en',
      defLang: 'ru',
      level: 'B1',
    },
    DEMO.map(([term, definition]) => ({ term, definition })),
  )
}
