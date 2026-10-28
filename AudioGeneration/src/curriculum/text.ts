/** Small text helpers shared by the scheduler and the checker. */

/** Lowercase, strip accents/diacritics, unify final sigma. "Καλημέρα!" → "καλημερα". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ς/g, 'σ');
}

/** Split a phrase into normalized word tokens, ignoring punctuation (incl. Greek ; and ·). */
export function tokens(s: string): string[] {
  return normalize(s)
    .split(/[^\p{L}\p{N}']+/u)
    .filter(t => t.length > 0);
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Rough syllable count: groups of vowels (works for Greek and Latin scripts). */
export function estimateSyllables(s: string): number {
  const groups = normalize(s).match(/[αεηιουωaeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Seconds the learner needs to say a phrase out loud. */
export function answerGap(target: string): number {
  return Math.min(8, Math.round((2.5 + 0.6 * wordCount(target)) * 2) / 2);
}

/** Seconds the learner needs to repeat after the native voice. */
export function repeatGap(target: string): number {
  return Math.min(6, Math.round((1.5 + 0.5 * wordCount(target)) * 2) / 2);
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
