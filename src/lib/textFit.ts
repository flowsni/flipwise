/** Font size class that keeps a term or definition readable inside a card, by length. */
export function fitClass(text: string): string {
  const n = text.length
  if (n <= 14) return 'text-[2.6rem] sm:text-5xl'
  if (n <= 32) return 'text-[2rem] sm:text-4xl'
  if (n <= 70) return 'text-2xl sm:text-3xl'
  if (n <= 140) return 'text-xl sm:text-2xl'
  return 'text-lg'
}

/**
 * Same for whole sentences: they always wrap, so the scale starts smaller and stays readable on
 * a 375px-wide phone for ~20-word sentences. Pass the text without [[ ]] markers.
 */
export function fitSentenceClass(text: string): string {
  const n = text.length
  if (n <= 40) return 'text-[1.75rem] sm:text-4xl'
  if (n <= 80) return 'text-2xl sm:text-3xl'
  if (n <= 140) return 'text-xl sm:text-2xl'
  return 'text-lg sm:text-xl'
}
