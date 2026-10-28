/**
 * Checker: the single gate every plan and lesson must pass (plain code, no LLM).
 */
import { Beat, Item, Lesson, ModuleConfig } from './types.js';
import { answerGap, normalize, repeatGap, tokens, wordCount } from './text.js';

export interface CheckResult {
  errors: string[];
  warnings: string[];
  estimatedMinutes?: number;
}

// ---------- Plan (items.json) ----------

export function checkPlan(config: ModuleConfig, items: Item[]): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  const targets = new Map<string, string>();

  if (config.lessonThemes.length !== config.lessonCount) {
    errors.push(`module.json: lessonThemes has ${config.lessonThemes.length} entries, expected ${config.lessonCount}`);
  }

  for (const it of items) {
    const where = `item ${it.id ?? '?'}`;
    if (!/^i\d{3}$/.test(it.id ?? '')) errors.push(`${where}: id must look like i001`);
    if (ids.has(it.id)) errors.push(`${where}: duplicate id`);
    ids.add(it.id);
    if (!it.target?.trim()) errors.push(`${where}: target is empty`);
    if (!it.meaning?.trim()) errors.push(`${where}: meaning is empty`);
    if (!['word', 'phrase', 'structure'].includes(it.type)) errors.push(`${where}: type must be word | phrase | structure`);
    if (!Number.isInteger(it.lesson) || it.lesson < 1 || it.lesson > config.lessonCount) {
      errors.push(`${where}: lesson must be 1..${config.lessonCount}`);
    }
    if (it.target) {
      const key = normalize(it.target).replace(/[^\p{L}\p{N} ]/gu, '').trim();
      if (targets.has(key)) errors.push(`${where}: same target as ${targets.get(key)} ("${it.target}")`);
      else targets.set(key, it.id);
      if (/[a-z]/i.test(it.target) && config.language === 'greek') errors.push(`${where}: target contains Latin letters ("${it.target}")`);
    }
  }

  for (let l = 1; l <= config.lessonCount; l++) {
    const n = items.filter(i => i.lesson === l).length;
    const { min, max } = config.newItemsPerLesson;
    if (n < min || n > max) errors.push(`lesson ${l}: has ${n} new items, expected ${min}-${max}`);
  }

  // Originality guard: lesson 1 must not open with the classic older-course sequence.
  const avoid = config.avoidInLesson1 ?? [];
  const l1 = items.filter(i => i.lesson === 1).map(i => normalize(i.meaning));
  const hits = avoid.filter(a => l1.some(m => m.includes(normalize(a))));
  if (hits.length >= 2) errors.push(`lesson 1 uses ${hits.join(', ')} — pick a different opening (see module.json avoidInLesson1)`);

  return { errors, warnings };
}

// ---------- Lesson (lessons/lessonNN.json) ----------

const SECONDS_PER_EN_WORD = 1 / 2.5;
const SECONDS_PER_TARGET_WORD = 1 / 1.8;

export function estimateSeconds(lesson: Lesson): number {
  let s = 0;
  for (const line of lesson.lines) {
    s += line.pause ?? 0;
    if (line.say) s += wordCount(line.say) * SECONDS_PER_EN_WORD + 0.3;
    if (line.target) s += wordCount(line.target) * SECONDS_PER_TARGET_WORD + 0.3;
  }
  return s;
}

export function checkLesson(config: ModuleConfig, items: Item[], skeleton: Beat[], lesson: Lesson): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byId = new Map(items.map(i => [i.id, i]));
  const beatById = new Map(skeleton.map(b => [b.id, b]));
  const L = lesson.lesson;

  if (!Array.isArray(lesson.lines) || lesson.lines.length === 0) {
    return { errors: ['lesson has no lines'], warnings };
  }

  // Vocabulary the learner has heard before this lesson, as normalized tokens.
  const tokensOf = (it: Item) => [it.target, ...(it.forms ?? [])].flatMap(tokens);
  const earlierTokens = new Set(items.filter(i => i.lesson < L).flatMap(tokensOf));
  const lessonTokens = new Set(items.filter(i => i.lesson <= L).flatMap(tokensOf));
  const taughtNow = new Set(earlierTokens);
  const allowedIds = new Set(items.filter(i => i.lesson < L).map(i => i.id));

  const firstIndex = new Map<string, number>();
  const linesByBeat = new Map<string, number[]>();

  lesson.lines.forEach((line, idx) => {
    const where = `line ${idx + 1}`;
    const beat = beatById.get(line.beat);
    if (!beat) { errors.push(`${where}: unknown beat "${line.beat}"`); return; }
    if (!firstIndex.has(line.beat)) {
      firstIndex.set(line.beat, idx);
      // A 'new' beat teaches its item from this point on.
      if (beat.type === 'new') {
        for (const id of beat.items) {
          allowedIds.add(id);
          const it = byId.get(id);
          if (it) tokensOf(it).forEach(t => taughtNow.add(t));
        }
      }
    }
    linesByBeat.set(line.beat, [...(linesByBeat.get(line.beat) ?? []), idx]);

    const hasSay = typeof line.say === 'string' && line.say.trim().length > 0;
    const hasTarget = typeof line.target === 'string' && line.target.trim().length > 0;
    if (hasSay === hasTarget) errors.push(`${where}: needs exactly one of "say" or "target"`);
    if (typeof line.pause !== 'number' || line.pause < 0.5 || line.pause > 12) errors.push(`${where}: pause must be 0.5-12 seconds`);
    if (hasSay && /[Ͱ-Ͽἀ-῿]/.test(line.say!) && config.language === 'greek') {
      errors.push(`${where}: Greek text inside "say" — put target-language speech in its own "target" line`);
    }
    if (hasSay && /\[|\]/.test(line.say!)) errors.push(`${where}: square brackets are reserved for pause markers`);

    if (hasTarget) {
      const target = line.target!;
      if (/\[|\]|"/.test(target)) errors.push(`${where}: target must not contain quotes or brackets`);
      // Build-up fragments: pieces of the item being introduced.
      const beatItem = beat.items[0] ? byId.get(beat.items[0]) : undefined;
      const isFragment = beat.type === 'new' && !!beatItem &&
        normalize(beatItem.target).replace(/\s+/g, ' ').includes(normalize(target).replace(/[;.!,…]/g, '').trim());
      if (!isFragment) {
        if (!line.items || line.items.length === 0) errors.push(`${where}: target line must list the item ids it uses`);
        const pool = beat.type === 'dialogue' || beat.type === 'roleplay' ? lessonTokens : taughtNow;
        const unknown = tokens(target).filter(t => !pool.has(t));
        if (unknown.length) errors.push(`${where}: "${target}" uses words not taught yet: ${unknown.join(', ')}`);
        for (const id of line.items ?? []) {
          const it = byId.get(id);
          if (!it) errors.push(`${where}: unknown item id ${id}`);
          else if (it.lesson > L) errors.push(`${where}: item ${id} belongs to lesson ${it.lesson}`);
          else if (beat.type !== 'dialogue' && beat.type !== 'roleplay' && !allowedIds.has(id)) {
            errors.push(`${where}: item ${id} is used before its "new" beat`);
          }
        }
      }
      // The learner needs time to repeat after the native voice.
      if (line.pause < repeatGap(target)) errors.push(`${where}: pause ${line.pause}s too short to repeat "${target}" (min ${repeatGap(target)}s)`);
    }

    // Prompt → answer: the instructor's question needs a pause long enough to answer.
    const next = lesson.lines[idx + 1];
    if (hasSay && next?.target && next.beat === line.beat && ['recall', 'review', 'combine'].includes(beat.type)) {
      const need = answerGap(next.target);
      if (line.pause < need) errors.push(`${where}: pause ${line.pause}s before the answer "${next.target}" is too short (min ${need}s)`);
    }
  });

  // Every beat is covered, and practises its item.
  for (const b of skeleton) {
    const idxs = linesByBeat.get(b.id);
    if (!idxs) { errors.push(`beat ${b.id} (${b.type}) has no lines`); continue; }
    const lines = idxs.map(i => lesson.lines[i]);
    if (['new', 'recall', 'review'].includes(b.type)) {
      const ok = lines.some(l => l.target && (l.items ?? []).includes(b.items[0]));
      if (!ok) errors.push(`beat ${b.id} (${b.type}) never has a target line tagged with ${b.items[0]}`);
    }
    if (b.type === 'new' && b.buildup) {
      const targets = lines.filter(l => l.target).length;
      if (targets < 4) errors.push(`beat ${b.id}: build-up needs at least 4 target lines (pieces from the end, then the whole word)`);
    }
    if (b.type === 'combine') {
      const used = new Set(lines.flatMap(l => l.items ?? []));
      const missing = b.items.filter(id => !used.has(id));
      if (missing.length) errors.push(`beat ${b.id} (combine) must use ${missing.join(', ')}`);
    }
    if (b.type === 'roleplay') {
      const used = new Set(lines.flatMap(l => l.items ?? []));
      const coverage = b.items.filter(id => used.has(id)).length / Math.max(1, b.items.length);
      if (coverage < 0.5) errors.push(`beat ${b.id} (roleplay) uses only ${Math.round(coverage * 100)}% of its items (min 50%)`);
    }
  }

  // Order: beats appear in skeleton order (relaxed at high creativity).
  const creativity = lesson.generatedBy?.creativity ?? config.creativity;
  const order = skeleton.map(b => firstIndex.get(b.id) ?? -1).filter(i => i >= 0);
  const window = creativity >= 0.8 ? 3 : 0;
  for (let k = 1; k < order.length; k++) {
    const backwards = order.slice(0, k).filter(i => i > order[k]).length;
    if (backwards > window) { errors.push(`beat ${skeleton[k].id} appears out of order`); break; }
  }

  // Length.
  const minutes = estimateSeconds(lesson) / 60;
  const lo = config.targetMinutes * 0.9, hi = config.targetMinutes * 1.1;
  if (minutes < lo || minutes > hi) errors.push(`estimated length ${minutes.toFixed(1)} min, expected ${lo.toFixed(0)}-${hi.toFixed(0)}`);

  if (lesson.lesson < 1 || lesson.lesson > config.lessonCount) errors.push('lesson number out of range');
  if (!lesson.title?.trim()) errors.push('title is empty');
  if (!lesson.generatedBy?.writer) warnings.push('generatedBy.writer is empty');

  return { errors, warnings, estimatedMinutes: Math.round(minutes * 10) / 10 };
}
