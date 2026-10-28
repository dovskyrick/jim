/**
 * Scheduler: builds the rigid skeleton of one lesson (plain code, no LLM).
 *
 * Method source: Pimsleur, "A Memory Schedule" (1967) — recall each new item at
 * intervals that grow roughly x5 (5s, 25s, ~2min, ~10min), then over days.
 * Same inputs always give the same skeleton.
 */
import { Beat, Item, ModuleConfig } from './types.js';
import { estimateSyllables } from './text.js';

/** Estimated seconds each beat takes once written. Used only to place recalls. */
export const BEAT_SECONDS = {
  opening: 20,
  dialogue: 60,
  new: 30,
  newBuildupExtra: 20,
  recall: 12,
  review: 14,
  combine: 20,
  roleplay: 150,
  closing: 20,
} as const;

export function itemsForLesson(items: Item[], lesson: number): Item[] {
  return items.filter(i => i.lesson === lesson);
}

/** Share of a source lesson's items reviewed, by position in reviewAfterLessons (older = fewer). */
const REVIEW_SHARE = [1, 0.6, 0.4, 0.3, 0.2];

/**
 * Items from earlier lessons that get an explicit review beat in this lesson.
 * The previous lesson is reviewed fully; older lessons partly, rotating which
 * items are picked so every item comes back over the module. Items not picked
 * still return through "combine" beats, which prefer the least practised words.
 */
export function reviewItemsForLesson(items: Item[], config: ModuleConfig, lesson: number): Item[] {
  const out: Item[] = [];
  config.reviewAfterLessons.forEach((k, j) => {
    const source = items.filter(i => i.lesson === lesson - k);
    if (source.length === 0) return;
    const share = REVIEW_SHARE[Math.min(j, REVIEW_SHARE.length - 1)];
    const take = Math.ceil(source.length * share);
    const offset = (lesson * 3) % source.length;
    for (let n = 0; n < take; n++) out.push(source[(offset + n) % source.length]);
  });
  return out;
}

export function needsBuildup(item: Item): boolean {
  if (item.type !== 'word') return false;
  return (item.syllables ?? estimateSyllables(item.target)) > 2;
}

interface PendingRecall {
  item: string;
  due: number;
  label: string;
}

export function buildSkeleton(config: ModuleConfig, items: Item[], lesson: number): Beat[] {
  const beats: Beat[] = [];
  const add = (b: Omit<Beat, 'id'>) => beats.push({ id: `b${String(beats.length + 1).padStart(3, '0')}`, ...b });

  const newItems = itemsForLesson(items, lesson);
  const reviews = reviewItemsForLesson(items, config, lesson);
  const earlier = items.filter(i => i.lesson < lesson);

  const lessonEnd = config.targetMinutes * 60;
  const mainEnd = lessonEnd - BEAT_SECONDS.roleplay - BEAT_SECONDS.closing;
  const lastRecall = Math.max(...config.inLessonRecallSeconds);

  // Practice counts decide which items "combine" beats use (least practised first).
  const practice = new Map<string, number>();
  const known: string[] = [];
  const bump = (id: string) => practice.set(id, (practice.get(id) ?? 0) + 1);
  for (const i of earlier) { known.push(i.id); practice.set(i.id, 0); }

  let t = 0;
  add({ type: 'opening', items: [], atSeconds: t });
  t += BEAT_SECONDS.opening;
  add({ type: 'dialogue', items: newItems.map(i => i.id), atSeconds: t, note: 'listen only; learner is not expected to understand yet' });
  t += BEAT_SECONDS.dialogue;

  // Spread new items so the longest recall (~10 min) still fits before the role-play.
  const newWindowEnd = Math.max(t + 60, mainEnd - lastRecall);
  const gap = newItems.length > 0 ? Math.max(BEAT_SECONDS.new, (newWindowEnd - t) / newItems.length) : 0;
  let nextNewAt = t;

  const newQueue = [...newItems];
  const reviewQueue = [...reviews];
  // Spread reviews across the lesson too.
  const reviewGap = reviewQueue.length > 0 ? (mainEnd - t) / (reviewQueue.length + 1) : 0;
  let nextReviewAt = t + reviewGap / 2;
  const pending: PendingRecall[] = [];
  let combineTurn = 0;

  while (t < mainEnd) {
    pending.sort((a, b) => a.due - b.due);
    if (pending.length > 0 && pending[0].due <= t) {
      const r = pending.shift()!;
      add({ type: 'recall', items: [r.item], atSeconds: Math.round(t), note: r.label });
      bump(r.item);
      t += BEAT_SECONDS.recall;
      continue;
    }
    if (newQueue.length > 0 && (t >= nextNewAt || known.length < 2)) {
      const item = newQueue.shift()!;
      const buildup = needsBuildup(item);
      add({ type: 'new', items: [item.id], buildup, atSeconds: Math.round(t) });
      t += BEAT_SECONDS.new + (buildup ? BEAT_SECONDS.newBuildupExtra : 0);
      known.push(item.id);
      bump(item.id);
      const introducedAt = t;
      for (const s of config.inLessonRecallSeconds) {
        if (introducedAt + s < mainEnd) pending.push({ item: item.id, due: introducedAt + s, label: `recall +${s}s` });
      }
      nextNewAt = t + gap - BEAT_SECONDS.new;
      continue;
    }
    if (reviewQueue.length > 0 && t >= nextReviewAt) {
      const item = reviewQueue.shift()!;
      add({ type: 'review', items: [item.id], atSeconds: Math.round(t), note: `from lesson ${item.lesson}` });
      bump(item.id);
      t += BEAT_SECONDS.review;
      nextReviewAt += reviewGap;
      continue;
    }
    // Otherwise: recombine known material into a new sentence.
    const pick = pickCombineItems(known, practice, newItems.map(i => i.id), combineTurn++);
    add({ type: 'combine', items: pick, atSeconds: Math.round(t) });
    pick.forEach(bump);
    t += BEAT_SECONDS.combine;
  }

  // Reviews that did not fit still get practised in the role-play.
  const roleplayItems = [...new Set([...newItems.map(i => i.id), ...reviews.map(i => i.id)])];
  add({ type: 'roleplay', items: roleplayItems, atSeconds: Math.round(t), note: 'learner answers a native speaker; use as many of these items as natural' });
  t += BEAT_SECONDS.roleplay;
  add({ type: 'closing', items: [], atSeconds: Math.round(t) });
  return beats;
}

/** 2–3 items: the least practised known item, plus one of this lesson's new items when possible. */
function pickCombineItems(known: string[], practice: Map<string, number>, lessonNew: string[], turn: number): string[] {
  const sorted = [...known].sort((a, b) => (practice.get(a) ?? 0) - (practice.get(b) ?? 0) || a.localeCompare(b));
  const pick = new Set<string>();
  if (sorted[0]) pick.add(sorted[0]);
  const newKnown = lessonNew.filter(id => known.includes(id));
  if (newKnown.length > 0) pick.add(newKnown[turn % newKnown.length]);
  for (const id of sorted) {
    if (pick.size >= (turn % 2 === 0 ? 2 : 3)) break;
    pick.add(id);
  }
  return [...pick];
}
