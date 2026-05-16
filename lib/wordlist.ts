// Word set is built once and reused. Loaded lazily so it doesn't block the main bundle.
let wordSet: Set<string> | null = null

export async function getWordSet(): Promise<Set<string>> {
  if (wordSet) return wordSet
  const words = (await import('an-array-of-english-words')).default as string[]
  wordSet = new Set(words.map(w => w.toUpperCase()))
  return wordSet
}

export function isWord(w: string, set: Set<string>): boolean {
  return set.has(w.toUpperCase())
}
