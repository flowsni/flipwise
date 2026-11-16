/**
 * Most cards one deck can get through the editor or an import. Every card of a deck is mounted
 * on its page, so a bigger deck makes it slow (600 cards open in ~0.8 s at 4× CPU).
 * Bigger decks that already exist, or come back from a backup, are left as they are.
 */
export const MAX_CARDS = 250
