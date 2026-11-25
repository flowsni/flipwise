export type { MatchResult, Verdict } from './answerMatch'
export {
  answerVariants,
  damerauLevenshtein,
  matchAnswer,
  normalize,
  typoSegments,
} from './answerMatch'
export type { Backup, ImportMode } from './backup'
export {
  BackupError,
  backupFileName,
  exportAll,
  exportDeck,
  importBackup,
  parseBackup,
} from './backup'
export { findDuplicates } from './duplicates'
export { hasExamples } from './examples'
export { downloadFile, pickFile, shareOrDownloadJson } from './files'
export { errorRate, hardestCards, isHard } from './hardWords'
export { newId } from './ids'
export type {
  CardSeparator,
  ImportOptions,
  ParsedCard,
  ParseResult,
  TermSeparator,
} from './importParser'
export { guessOptions, oneLine, parseImport } from './importParser'
export type { Language } from './languages'
export { englishLanguageName, LANGUAGES, languageName, speechSample } from './languages'
export { MAX_CARDS } from './limits'
export type { SearchGroup, SearchHit } from './search'
export { groupByDeck, matchesQuery, searchCards } from './search'
export type { Rng } from './shuffle'
export { seededRng, shuffle } from './shuffle'
export { getSetting, setSetting, useSetting } from './storage'
export { fitClass, fitSentenceClass } from './textFit'
